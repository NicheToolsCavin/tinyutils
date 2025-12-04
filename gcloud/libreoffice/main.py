"""LibreOffice conversion service for Cloud Run.

This service handles document conversions that require LibreOffice (colors,
alignment, advanced formatting). It integrates with Google Cloud Storage for
file I/O and can convert to multiple output formats.

Endpoints:
- GET /health: Health check with LibreOffice version info
- POST /convert: Convert document via GCS URIs
- POST /convert-direct: Convert document via direct file upload (for testing)
"""
from __future__ import annotations

import html
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.parse import parse_qs

# Configuration
PORT = int(os.getenv("PORT", "8080"))
SOFFICE_BIN = os.getenv("SOFFICE_BIN", "libreoffice")
TIMEOUT_SECONDS = int(os.getenv("LIBREOFFICE_TIMEOUT_SECONDS", "120"))
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
GCS_PROJECT = os.getenv("GCS_PROJECT")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


# =============================================================================
# GCS Client (minimal implementation to avoid external dependencies)
# =============================================================================

def _get_storage_client():
    """Get GCS client, raising clear error if not available."""
    try:
        from google.cloud import storage
        return storage.Client(project=GCS_PROJECT)
    except ImportError:
        raise RuntimeError("google-cloud-storage not installed")


def parse_gs_uri(uri: str) -> Tuple[str, str]:
    """Parse gs://bucket/path into (bucket, path).

    Security: Validates URI format and rejects path traversal attempts.
    """
    if not uri.startswith("gs://"):
        raise ValueError(f"Expected gs:// URI, got: {uri}")
    parts = uri[5:].split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(f"Invalid gs:// URI: {uri}")

    bucket, blob_path = parts[0], parts[1]

    # Security: Reject path traversal attempts
    if ".." in blob_path or blob_path.startswith("/"):
        raise ValueError(f"Invalid blob path (path traversal rejected): {blob_path}")

    # Security: Validate bucket name format (alphanumeric, hyphens, underscores, dots)
    if not re.match(r'^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$', bucket):
        raise ValueError(f"Invalid bucket name format: {bucket}")

    return bucket, blob_path


def validate_filename(filename: str) -> str:
    """Validate and sanitize a filename to prevent path traversal.

    Security: Ensures filename contains no path components and is safe to use.
    """
    # Get just the final path component
    safe_name = Path(filename).name

    # Reject if it still contains path traversal or is empty
    if not safe_name or ".." in safe_name or "/" in safe_name or "\\" in safe_name:
        raise ValueError(f"Invalid filename (rejected): {filename}")

    # Reject hidden files (starting with dot) except valid extensions
    if safe_name.startswith(".") and safe_name not in {".docx", ".odt", ".pdf"}:
        raise ValueError(f"Hidden filename rejected: {filename}")

    return safe_name


def download_from_gcs(uri: str, dest: Path) -> Path:
    """Download file from GCS to local path."""
    bucket_name, blob_name = parse_gs_uri(uri)
    client = _get_storage_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    dest.parent.mkdir(parents=True, exist_ok=True)
    blob.download_to_filename(str(dest))
    logger.info(f"Downloaded {uri} to {dest}")
    return dest


def upload_to_gcs(src: Path, uri: str, content_type: Optional[str] = None) -> str:
    """Upload local file to GCS."""
    bucket_name, blob_name = parse_gs_uri(uri)
    client = _get_storage_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(str(src), content_type=content_type)
    logger.info(f"Uploaded {src} to {uri}")
    return uri


# =============================================================================
# LibreOffice Conversion Logic
# =============================================================================

def get_libreoffice_version() -> Optional[str]:
    """Get LibreOffice version string."""
    try:
        result = subprocess.run(
            [SOFFICE_BIN, "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception as e:
        logger.warning(f"Failed to get LibreOffice version: {e}")
    return None


def is_libreoffice_available() -> bool:
    """Check if LibreOffice is available."""
    if shutil.which(SOFFICE_BIN) is None:
        return False
    return get_libreoffice_version() is not None


def convert_document(
    input_path: Path,
    output_dir: Path,
    target_format: str = "html"
) -> Path:
    """Convert document using LibreOffice headless mode.

    Args:
        input_path: Path to input document
        output_dir: Directory for output file
        target_format: Target format (html, pdf, docx, odt, txt, etc.)

    Returns:
        Path to converted file
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Build LibreOffice command
    cmd = [
        SOFFICE_BIN,
        "--headless",
        "--convert-to", target_format,
        "--outdir", str(output_dir),
        str(input_path)
    ]

    logger.info(f"Running LibreOffice: {' '.join(cmd)}")
    start_time = time.time()

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=TIMEOUT_SECONDS
    )

    elapsed = time.time() - start_time
    logger.info(f"LibreOffice completed in {elapsed:.2f}s (exit code: {result.returncode})")

    if result.returncode != 0:
        logger.error(f"LibreOffice stderr: {result.stderr}")
        raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")

    # Find the output file
    # LibreOffice creates output as: {input_stem}.{target_format}
    output_path = output_dir / f"{input_path.stem}.{target_format}"

    if not output_path.exists():
        # Try finding any file with the target extension
        candidates = list(output_dir.glob(f"*.{target_format}"))
        if candidates:
            output_path = candidates[0]
        else:
            raise RuntimeError(f"Output file not found: {output_path}")

    logger.info(f"Conversion output: {output_path} ({output_path.stat().st_size} bytes)")
    return output_path


def extract_style_metadata(html_path: Path) -> Dict[str, Any]:
    """Extract color/alignment metadata from HTML output.

    Security: All extracted text is HTML-escaped to prevent injection attacks
    if this metadata is logged, returned in API responses, or rendered.
    """
    try:
        from bs4 import BeautifulSoup

        html_text = html_path.read_text("utf-8", errors="replace")
        soup = BeautifulSoup(html_text, "html.parser")

        colors = []
        alignments = []

        for elem in soup.find_all(style=True):
            style = (elem.get("style") or "").lower()
            if "color:" in style:
                # Sanitize extracted text to prevent HTML injection
                text = html.escape(elem.get_text()[:50])
                colors.append(text)
            if "text-align:" in style:
                # Sanitize extracted text to prevent HTML injection
                text = html.escape(elem.get_text()[:50])
                alignments.append(text)

        return {
            "colors_found": len(colors),
            "alignments_found": len(alignments),
            "sample_colored_text": colors[:3],
            "sample_aligned_text": alignments[:3]
        }
    except ImportError:
        logger.warning("BeautifulSoup not available for style extraction")
        return {"colors_found": 0, "alignments_found": 0}
    except Exception as e:
        logger.warning(f"Style extraction failed: {e}")
        # Escape error message too for safety
        return {"error": html.escape(str(e))}


# =============================================================================
# HTTP Handler
# =============================================================================

class LibreOfficeHandler(BaseHTTPRequestHandler):
    """HTTP handler for LibreOffice conversion service."""

    server_version = "TinyUtilsLibreOffice/1.0"

    def log_message(self, format: str, *args) -> None:
        """Use structured logging instead of default."""
        logger.info(f"{self.client_address[0]} - {format % args}")

    def _json_response(self, data: dict, status: int = 200) -> None:
        """Send JSON response."""
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error_response(self, message: str, status: int = 400, details: Any = None) -> None:
        """Send error JSON response."""
        data = {
            "ok": False,
            "error": message,
            "status": status
        }
        if details:
            data["details"] = details
        self._json_response(data, status)

    def do_GET(self) -> None:
        """Handle GET requests (health check)."""
        if self.path == "/health" or self.path == "/":
            lo_available = is_libreoffice_available()
            lo_version = get_libreoffice_version() if lo_available else None

            self._json_response({
                "ok": True,
                "status": "healthy" if lo_available else "degraded",
                "service": "tinyutils-libreoffice",
                "version": "1.0.0",
                "libreoffice": {
                    "available": lo_available,
                    "version": lo_version,
                    "binary": SOFFICE_BIN
                },
                "config": {
                    "timeout_seconds": TIMEOUT_SECONDS,
                    "max_file_size_mb": MAX_FILE_SIZE_MB,
                    "port": PORT
                }
            })
            return

        self._error_response("Not found", 404)

    def do_POST(self) -> None:
        """Handle POST requests (conversion)."""
        if self.path != "/convert":
            self._error_response("Not found", 404)
            return

        # Parse request body
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._error_response("Empty request body", 400)
            return

        if content_length > MAX_FILE_SIZE_MB * 1024 * 1024:
            self._error_response(f"Request too large (max {MAX_FILE_SIZE_MB}MB)", 413)
            return

        try:
            body = self.rfile.read(content_length)
            payload = json.loads(body)
        except json.JSONDecodeError as e:
            self._error_response(f"Invalid JSON: {e}", 400)
            return

        # Validate required fields
        input_gcs_uri = payload.get("input_gcs_uri")
        output_gcs_uri = payload.get("output_gcs_uri")
        target_format = payload.get("target_format", "html")
        extract_styles = payload.get("extract_styles", False)

        if not input_gcs_uri:
            self._error_response("Missing required field: input_gcs_uri", 400)
            return

        if not output_gcs_uri:
            self._error_response("Missing required field: output_gcs_uri", 400)
            return

        # Validate target format
        allowed_formats = {"html", "pdf", "docx", "odt", "txt", "rtf", "epub"}
        if target_format not in allowed_formats:
            self._error_response(
                f"Unsupported target format: {target_format}",
                400,
                {"allowed_formats": list(allowed_formats)}
            )
            return

        # Process conversion
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        logger.info(f"[{request_id}] Starting conversion: {input_gcs_uri} -> {target_format}")

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmpdir_path = Path(tmpdir)

                # Extract and validate filename from GCS URI
                # Security: validate_filename prevents path traversal attacks
                _, blob_name = parse_gs_uri(input_gcs_uri)
                input_filename = validate_filename(Path(blob_name).name)
                input_path = tmpdir_path / input_filename

                # Download input file
                logger.info(f"[{request_id}] Downloading from GCS...")
                download_from_gcs(input_gcs_uri, input_path)

                # Convert document
                logger.info(f"[{request_id}] Converting with LibreOffice...")
                output_dir = tmpdir_path / "output"
                output_path = convert_document(input_path, output_dir, target_format)

                # Extract style metadata if requested
                style_meta = {}
                if extract_styles and target_format == "html":
                    logger.info(f"[{request_id}] Extracting style metadata...")
                    style_meta = extract_style_metadata(output_path)

                # Upload output to GCS
                logger.info(f"[{request_id}] Uploading to GCS...")
                upload_to_gcs(output_path, output_gcs_uri)

                elapsed = time.time() - start_time
                logger.info(f"[{request_id}] Conversion complete in {elapsed:.2f}s")

                self._json_response({
                    "ok": True,
                    "request_id": request_id,
                    "input_gcs_uri": input_gcs_uri,
                    "output_gcs_uri": output_gcs_uri,
                    "target_format": target_format,
                    "output_size_bytes": output_path.stat().st_size,
                    "processing_time_seconds": round(elapsed, 2),
                    "style_metadata": style_meta if style_meta else None
                })

        except ValueError as e:
            logger.error(f"[{request_id}] Validation error: {e}")
            self._error_response(str(e), 400)
        except RuntimeError as e:
            logger.error(f"[{request_id}] Conversion error: {e}")
            self._error_response(str(e), 500)
        except Exception as e:
            logger.exception(f"[{request_id}] Unexpected error")
            self._error_response(f"Internal error: {type(e).__name__}", 500, str(e))


# =============================================================================
# Main Entry Point
# =============================================================================

def main() -> None:
    """Start the HTTP server."""
    # Log startup info
    logger.info("=" * 60)
    logger.info("TinyUtils LibreOffice Conversion Service")
    logger.info("=" * 60)
    logger.info(f"Port: {PORT}")
    logger.info(f"LibreOffice binary: {SOFFICE_BIN}")
    logger.info(f"Timeout: {TIMEOUT_SECONDS}s")
    logger.info(f"Max file size: {MAX_FILE_SIZE_MB}MB")

    # Check LibreOffice availability
    if is_libreoffice_available():
        version = get_libreoffice_version()
        logger.info(f"LibreOffice: {version}")
    else:
        logger.warning("LibreOffice not found! Service will be degraded.")

    logger.info("=" * 60)

    # Start server
    server = HTTPServer(("", PORT), LibreOfficeHandler)
    logger.info(f"Server listening on port {PORT}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
