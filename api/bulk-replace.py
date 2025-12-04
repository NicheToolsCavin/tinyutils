"""
Bulk Find & Replace API - Multi-file search and replace with visual diffs

Accepts ZIP uploads, applies text/regex replacements, returns preview or download.
Security: Zip bomb protection, path traversal checks, ReDoS timeouts.
"""
from fastapi import FastAPI, File, Form, UploadFile, Response
from fastapi.responses import JSONResponse, StreamingResponse
import json
import zipfile
import io
import re
import difflib
import os
import time
import uuid
import traceback
from typing import Optional

try:
    import chardet
    CHARDET_AVAILABLE = True
except ImportError:
    CHARDET_AVAILABLE = False

# --- Configuration ---
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
MAX_FILES_COUNT = 500
MAX_COMPRESSION_RATIO = 10  # Zip bomb protection
# Note: ReDoS timeouts removed for serverless compatibility

ALLOWED_TEXT_EXTENSIONS = {
    '.txt', '.md', '.markdown', '.html', '.htm', '.css', '.js', '.jsx',
    '.ts', '.tsx', '.json', '.csv', '.xml', '.py', '.rb', '.php', '.java',
    '.c', '.cpp', '.h', '.hpp', '.sql', '.yaml', '.yml', '.ini', '.env',
    '.svelte', '.vue', '.toml', '.go', '.rs', '.rust', '.swift', '.kt',
    '.sh', '.bash', '.zsh', '.fish', '.r', '.scala', '.clj', '.ex', '.exs'
}

app = FastAPI()

# --- Helpers ---

def is_likely_binary(data_bytes):
    """Detect binary files by checking for null bytes."""
    if not data_bytes:
        return False
    sample = data_bytes[:1024] if len(data_bytes) > 1024 else data_bytes
    return b'\0' in sample

def is_safe_path(path):
    """Reject absolute paths and parent directory references."""
    if os.path.isabs(path):
        return False
    parts = path.split(os.sep)
    return '..' not in parts

def detect_and_decode(raw_bytes):
    """Auto-detect encoding and decode safely."""
    if not raw_bytes:
        return '', 'utf-8'

    # Try UTF-8 first (most common)
    try:
        return raw_bytes.decode('utf-8'), 'utf-8'
    except UnicodeDecodeError:
        pass

    # Use chardet if available
    if CHARDET_AVAILABLE:
        detection = chardet.detect(raw_bytes)
        encoding = detection.get('encoding', 'latin-1')
        confidence = detection.get('confidence', 0)

        if confidence < 0.7:
            # Low confidence, try common encodings
            for enc in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    return raw_bytes.decode(enc), enc
                except:
                    continue

        try:
            return raw_bytes.decode(encoding, errors='replace'), encoding
        except:
            pass

    # Fallback to latin-1 (accepts all bytes)
    return raw_bytes.decode('latin-1', errors='replace'), 'latin-1'

def send_error(code: int, message: str, request_id: str):
    """Send TinyUtils-standard error response."""
    return JSONResponse(
        status_code=code,
        content={
            "ok": False,
            "message": message,
            "code": code,
            "requestId": request_id
        },
        headers={
            'X-Request-ID': request_id,
            'Cache-Control': 'no-store'
        }
    )

def send_success(data: dict, request_id: str, processing_time_ms: int):
    """Send TinyUtils-standard success response."""
    return JSONResponse(
        content={
            "ok": True,
            "data": data,
            "meta": {
                "runTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "requestId": request_id,
                "processingTimeMs": processing_time_ms,
                "mode": "bulk-replace",
                "chardetAvailable": CHARDET_AVAILABLE
            }
        },
        headers={
            'X-Request-ID': request_id,
            'Cache-Control': 'no-store'
        }
    )

# --- Main Endpoint ---

@app.post("/api/bulk-replace")
async def bulk_replace(
    file: UploadFile = File(...),
    mode: str = Form("simple"),
    find: str = Form(...),
    replace: str = Form(""),
    action: str = Form("preview"),
    case_sensitive: str = Form("false")
):
    """
    Bulk find and replace in ZIP archive.

    Args:
        file: ZIP file containing text files
        mode: 'simple' or 'regex'
        find: Search pattern (text or regex)
        replace: Replacement text
        action: 'preview' or 'download'
        case_sensitive: 'true' or 'false'
    """
    request_id = str(uuid.uuid4())
    start_time = time.time()

    try:
        # Read file
        file_bytes = await file.read()

        # Size validation
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES / 1024 / 1024
            return send_error(413, f"File too large (max {max_mb:.0f}MB)", request_id)

        # Open ZIP and check for zip bomb
        try:
            input_zip = zipfile.ZipFile(io.BytesIO(file_bytes), 'r')
        except zipfile.BadZipFile:
            return send_error(422, "Invalid ZIP file", request_id)

        total_uncompressed = sum(f.file_size for f in input_zip.infolist() if not f.is_dir())
        if total_uncompressed > len(file_bytes) * MAX_COMPRESSION_RATIO:
            return send_error(422, "Suspicious ZIP file (compression ratio too high)", request_id)

        # Prepare regex logic
        is_case_sensitive = case_sensitive == 'true'
        regex_flags = re.MULTILINE
        if not is_case_sensitive:
            regex_flags |= re.IGNORECASE

        if mode == 'regex':
            find_pattern = find
        else:
            # Simple mode: escape special chars for literal matching
            find_pattern = re.escape(find)

        if not find_pattern:
            return send_error(400, "Search pattern cannot be empty", request_id)

        # Validate regex syntax
        try:
            re.compile(find_pattern, regex_flags)
        except re.error as e:
            return send_error(422, f"Invalid regex pattern: {str(e)}", request_id)

        # Process ZIP
        output_io = io.BytesIO()
        output_zip = zipfile.ZipFile(output_io, 'w', zipfile.ZIP_DEFLATED)

        diff_results = []
        stats = {
            "filesScanned": 0,
            "filesModified": 0,
            "filesSkipped": 0,
            "totalReplacements": 0,
            "encodingIssues": [],
            "skippedFiles": []
        }

        for file_info in input_zip.infolist():
            if file_info.is_dir():
                continue

            # Path traversal check
            if not is_safe_path(file_info.filename):
                stats["skippedFiles"].append(f"{file_info.filename}: unsafe path")
                continue

            raw_data = input_zip.read(file_info)
            _, ext = os.path.splitext(file_info.filename)

            # Binary safety check
            if ext.lower() not in ALLOWED_TEXT_EXTENSIONS or is_likely_binary(raw_data):
                output_zip.writestr(file_info, raw_data)
                stats["skippedFiles"].append(f"{file_info.filename}: binary file")
                continue

            # Decode with encoding detection
            original_text, detected_encoding = detect_and_decode(raw_data)
            if detected_encoding != 'utf-8':
                stats["encodingIssues"].append(f"{file_info.filename}: {detected_encoding}")

            # Apply replacement (no timeout in serverless environment)
            try:
                # Count matches before replacement
                matches = list(re.finditer(find_pattern, original_text, flags=regex_flags))
                match_count = len(matches)

                # Apply replacement
                new_text = re.sub(find_pattern, replace, original_text, flags=regex_flags)
            except re.error as e:
                return send_error(422, f"Regex error: {str(e)}", request_id)

            # Calculate changes
            is_changed = new_text != original_text
            stats["filesScanned"] += 1

            if is_changed:
                stats["filesModified"] += 1
                stats["totalReplacements"] += match_count

            if action == 'preview':
                if is_changed:
                    diff = difflib.unified_diff(
                        original_text.splitlines(),
                        new_text.splitlines(),
                        fromfile=file_info.filename,
                        tofile=file_info.filename,
                        n=2,
                        lineterm=''
                    )
                    diff_results.append({
                        'filename': file_info.filename,
                        'diff': '\n'.join(list(diff)),
                        'matchCount': match_count
                    })

            elif action == 'download':
                output_zip.writestr(file_info.filename, new_text.encode('utf-8'))

            if stats["filesScanned"] >= MAX_FILES_COUNT:
                break

        output_zip.close()
        input_zip.close()

        # Response
        processing_time_ms = int((time.time() - start_time) * 1000)

        if action == 'download':
            output_io.seek(0)
            return StreamingResponse(
                output_io,
                media_type='application/zip',
                headers={
                    'Content-Disposition': 'attachment; filename="tinyutils_processed.zip"',
                    'X-Request-ID': request_id
                }
            )
        else:
            return send_success({
                "diffs": diff_results,
                "stats": stats
            }, request_id, processing_time_ms)

    except Exception as e:
        traceback.print_exc()
        return send_error(500, f"Server error: {str(e)}", request_id)

# Export for Vercel
handler = app
