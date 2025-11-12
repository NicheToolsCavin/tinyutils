"""Universal document converter endpoint backed by tinyutils.convert."""
from __future__ import annotations

import logging
import os
import subprocess
import sys
import time
import traceback
import zipfile
from pathlib import Path
from typing import TYPE_CHECKING, List, Optional
import uuid

def _ensure_pydantic_core() -> None:
    """Ensure the native pydantic-core extension is importable on cold starts.

    On some serverless builds, Pydantic v2 is installed without its native
    `pydantic_core` wheel. If import fails, download an appropriate manylinux
    wheel for the current Python version and extract it into /tmp so imports
    succeed. This runs only once per cold start and avoids build-time wheel
    compilation.
    """

    # First, add vendored dir to sys.path if present
    try:
        from pathlib import Path
        vendor_base = Path(__file__).resolve().parents[1] / "_vendor"
        # Ensure parent of the package is on sys.path so `import pydantic_core` resolves
        if vendor_base.exists() and str(vendor_base) not in sys.path:
            sys.path.insert(0, str(vendor_base))
    except Exception:
        pass

    try:  # quick path
        import pydantic_core  # noqa: F401
        return
    except Exception:  # pragma: no cover - best-effort fallback
        pass

    try:
        import json
        import urllib.request
        import zipfile
        import tempfile

        major = sys.version_info.major
        minor = sys.version_info.minor
        # Build a conservative tag; Vercel uses manylinux glibc images.
        cp_tag = f"cp{major}{minor}-cp{major}{minor}"
        arch_tag = "manylinux_2_17_x86_64"

        with urllib.request.urlopen("https://pypi.org/pypi/pydantic-core/json", timeout=5) as r:
            data = json.load(r)
        version = data["info"]["version"]
        files = data["releases"].get(version, [])

        wheel = None
        for f in files:
            name = f.get("filename", "")
            if name.endswith(f"{cp_tag}-{arch_tag}.whl"):
                wheel = f
                break
        # Fallback: any manylinux x86_64 for this cp tag
        if wheel is None:
            for f in files:
                name = f.get("filename", "")
                if name.startswith(f"pydantic_core-{version}-{cp_tag}") and "manylinux" in name and name.endswith("x86_64.whl"):
                    wheel = f
                    break
        if wheel is None:
            return  # give up; FastAPI will raise a clear import error

        url = wheel["url"]
        tmpdir = tempfile.mkdtemp(prefix="pydantic_core_")
        whl_path = os.path.join(tmpdir, wheel["filename"])
        with urllib.request.urlopen(url, timeout=10) as src, open(whl_path, "wb") as dst:
            dst.write(src.read())
        with zipfile.ZipFile(whl_path, "r") as z:
            for name in z.namelist():
                if name.startswith("pydantic_core/"):
                    z.extract(name, path=tmpdir)
        # Prepend extracted parent to sys.path so `import pydantic_core` resolves.
        if tmpdir not in sys.path:
            sys.path.insert(0, tmpdir)
    except Exception:
        # Best effort: if anything fails, let the normal import error surface.
        pass


_ensure_pydantic_core()

from pydantic import BaseModel, Field, validator

from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse

if TYPE_CHECKING:  # pragma: no cover - type checking only
    from tinyutils.convert import (
        ConversionOptions as _ConverterOptions,
        InputPayload as _InputPayload,
        convert_batch as _convert_batch,
    )
    from tinyutils.convert.types import BatchResult as _BatchResult

from .._lib import blob
from .._lib.utils import DownloadMetadata, ensure_within_limits, job_workspace


logging.basicConfig(level=os.getenv("TINYUTILS_LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)
print("[tinyutils] convert API module imported", file=sys.stderr)


app = FastAPI()
_TEST_RESPONSE_SENTINEL = Response()

ConverterOptions = None
InputPayload = None
convert_batch = None
BatchResult = None
_pandoc_runner = None


def _ensure_convert_imports() -> None:
    global ConverterOptions, InputPayload, convert_batch, BatchResult
    if ConverterOptions is not None:
        return
    from tinyutils.convert import (  # type: ignore
        ConversionOptions as _ConverterOptions,
        InputPayload as _InputPayload,
        convert_batch as _convert_batch,
    )
    from tinyutils.convert.types import BatchResult as _BatchResult  # type: ignore

    ConverterOptions = _ConverterOptions
    InputPayload = _InputPayload
    convert_batch = _convert_batch
    BatchResult = _BatchResult


def _get_pandoc_runner():
    """Best-effort import of the pandoc runner.

    If tinyutils.api._lib.pandoc_runner is unavailable in this build, return a
    tiny stub that exposes the attributes used in this file so the API degrades
    gracefully without breaking the contract.
    """
    global _pandoc_runner
    if _pandoc_runner is not None:
        return _pandoc_runner
    try:  # prefer real runner
        from api._lib import pandoc_runner as _module  # type: ignore

        _pandoc_runner = _module
        return _pandoc_runner
    except Exception:
        class _StubRunner:  # minimal surface used by this module
            VENDORED_PANDOC_PATH = str(Path(__file__).resolve().parents[1] / "_vendor" / "pandoc" / "pandoc.xz")

            @staticmethod
            def get_configured_pandoc_path() -> Optional[str]:
                return None

            @staticmethod
            def get_pandoc_version() -> str:
                return "unknown"

            @staticmethod
            def ensure_pandoc() -> Optional[str]:
                return None

            @staticmethod
            def apply_lua_filters(_converter_options, _opts_dict) -> None:
                # No-op: real runner may replace this
                return None

        _pandoc_runner = _StubRunner()
        return _pandoc_runner


def _log_unexpected_trace(request_id: str, exc: BaseException) -> None:
    """Emit a concise error plus full traceback for diagnostics."""

    trace = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    logger.error(
        "convert unexpected error request_id=%s type=%s message=%s",
        request_id,
        exc.__class__.__name__,
        str(exc),
    )
    print(trace, file=sys.stderr)


@app.on_event("startup")
async def _log_pandoc_availability() -> None:
    runner = _get_pandoc_runner()
    path = runner.get_configured_pandoc_path()
    if path:
        logger.info("pandoc availability status=ready path=%s", path)
    else:
        logger.warning(
            "pandoc availability status=missing action=fallback vendor_path=%s",
            runner.VENDORED_PANDOC_PATH,
        )


class InputItem(BaseModel):
    blobUrl: str
    name: Optional[str] = None


class Options(BaseModel):
    class Config:
        allow_population_by_field_name = True

    acceptTrackedChanges: bool = True
    extractMedia: bool = False
    removeZeroWidth: bool = True
    normalizeLists: bool = False
    normalizeUnicode: bool = False
    removeNbsp: bool = False
    wrap: Optional[str] = None
    headers: Optional[str] = None
    asciiPunctuation: bool = False


class ConvertRequest(BaseModel):
    class Config:
        allow_population_by_field_name = True

    inputs: List[InputItem]
    source_format: Optional[str] = Field(default=None, alias="from")
    targets: List[str] = Field(default_factory=lambda: ["md"], alias="to")
    options: Options = Field(default_factory=Options)
    preview: bool = False

    @validator("targets", pre=True)
    def _normalise_targets(cls, value):
        return _coerce_targets(value)


@app.get("/health")
def health_check() -> dict:
    """Report pypandoc availability and vendored pandoc version."""

    errors: List[str] = []
    try:
        import pypandoc  # type: ignore

        _ = pypandoc.__version__
        pypandoc_status = "ok"
    except Exception as exc:  # pragma: no cover - diagnostics only
        pypandoc_status = f"error: {exc.__class__.__name__}"
        errors.append(str(exc))

    runner = _get_pandoc_runner()
    pandoc_path = runner.get_configured_pandoc_path()
    pandoc_version = runner.get_pandoc_version()

    return {
        "pypandoc": pypandoc_status,
        "pandoc_path": pandoc_path,
        "pandoc_version": pandoc_version,
        "errors": errors,
    }


@app.get("/health", include_in_schema=False)
def convert_health() -> JSONResponse:
    """Check pypandoc import and vendored pandoc availability."""

    try:
        diagnostics: dict = {"status": "ok"}
        errors: List[str] = []

        try:
            import pypandoc  # type: ignore

            diagnostics["pypandocVersion"] = getattr(pypandoc, "__version__", "unknown")
        except Exception as exc:  # pragma: no cover - diagnostics only
            diagnostics["pypandoc"] = "error"
            diagnostics["pypandocError"] = str(exc)
            errors.append("pypandoc")

        runner = _get_pandoc_runner()
        try:
            pandoc_path = runner.ensure_pandoc()
            completed = subprocess.run(
                [pandoc_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            first_line = (completed.stdout or completed.stderr or "").splitlines()
            diagnostics["pandocPath"] = pandoc_path
            diagnostics["pandocExitCode"] = completed.returncode
            diagnostics["pandocVersion"] = first_line[0] if first_line else None
            if completed.returncode != 0:
                errors.append("pandoc")
        except Exception as exc:  # pragma: no cover - diagnostics only
            diagnostics["pandocPath"] = None
            diagnostics["pandocError"] = str(exc)
            errors.append("pandoc")

        status_code = 200 if not errors else 503
        if errors:
            diagnostics["status"] = "degraded"
        return JSONResponse(status_code=status_code, content=diagnostics)
    except Exception as exc:  # pragma: no cover - diagnostics only
        _log_unexpected_trace("health", exc)
        raise HTTPException(status_code=500, detail="Health probe failed") from exc
    
    


@app.get("/", include_in_schema=False)
def convert_root(request: Request) -> JSONResponse:
    if request.query_params.get("__health") == "1":
        return convert_health()
    raise HTTPException(status_code=405, detail="Method not allowed")

# --- Aliases so the app also matches the full Vercel path (/api/convert) ---
@app.get("/api/convert/health", include_in_schema=False)
def convert_health_alias() -> JSONResponse:  # pragma: no cover - simple delegate
    return convert_health()


@app.post("/api/convert", include_in_schema=False)
def convert_alias(
    request: ConvertRequest,
    response: Response = _TEST_RESPONSE_SENTINEL,
    request_id: Optional[str] = Header(default=None, alias="x-request-id"),
) -> dict:  # pragma: no cover - simple delegate
    return convert(request, response, request_id)

# Compatibility for Vercel rewrites that still forward to the filename path
@app.get("/api/convert/index.py", include_in_schema=False)
def convert_health_filename_alias(request: Request) -> JSONResponse:  # pragma: no cover
    if request.query_params.get("__health") == "1":
        return convert_health()
    raise HTTPException(status_code=404, detail="Not Found")


@app.post("/api/convert/index.py", include_in_schema=False)
def convert_filename_alias(
    request: ConvertRequest,
    response: Response = _TEST_RESPONSE_SENTINEL,
    request_id: Optional[str] = Header(default=None, alias="x-request-id"),
) -> dict:  # pragma: no cover
    return convert(request, response, request_id)


@app.post("/")
def convert(
    request: ConvertRequest,
    response: Response = _TEST_RESPONSE_SENTINEL,
    request_id: Optional[str] = Header(default=None, alias="x-request-id"),
) -> dict:
    request_id_value = request_id if isinstance(request_id, str) else None
    resolved_request_id = request_id_value or uuid.uuid4().hex
    start_time = time.time()
    _ensure_convert_imports()
    runner = _get_pandoc_runner()
    from tinyutils.api.convert import index as convert_index  # local import to avoid cycles

    download_payloads_fn = getattr(convert_index, "_download_payloads", _download_payloads)
    convert_batch_fn = getattr(convert_index, "convert_batch", convert_batch)
    if response is _TEST_RESPONSE_SENTINEL:
        response = Response()
    try:
        if not request.inputs:
            _log_failure(resolved_request_id, "validation_error", "no_inputs", start_time)
            raise HTTPException(
                status_code=400,
                detail="No inputs provided",
                headers=_response_headers(resolved_request_id),
            )

        logger.info(
            "convert request request_id=%s inputs=%d targets=%s",
            resolved_request_id,
            len(request.inputs),
            request.targets,
        )
        for header_name, header_value in _response_headers(resolved_request_id).items():
            response.headers[header_name] = header_value

        try:
            with job_workspace() as workdir:
                payloads = download_payloads_fn(request.inputs, workdir)
        except blob.DownloadError as exc:
            _log_failure(resolved_request_id, "download_error", str(exc), start_time)
            raise HTTPException(
                status_code=400,
                detail=str(exc),
                headers=_response_headers(resolved_request_id),
            ) from exc
        # Build converter options, including extra flags only if supported by the
        # underlying ConversionOptions signature (for forward/backward compat).
        try:
            import inspect

            sig = inspect.signature(ConverterOptions)  # type: ignore[arg-type]
            kwargs = {
                "accept_tracked_changes": request.options.acceptTrackedChanges,
                "extract_media": request.options.extractMedia,
                "remove_zero_width": request.options.removeZeroWidth,
            }
            # Optional normalization flags – include only if present
            extra_map = {
                "normalize_lists": request.options.normalizeLists,
                "normalize_unicode": request.options.normalizeUnicode,
                "remove_nbsp": request.options.removeNbsp,
                "wrap": request.options.wrap,
                "headers": request.options.headers,
                "ascii_punctuation": request.options.asciiPunctuation,
            }
            for k, v in extra_map.items():
                if k in sig.parameters:
                    kwargs[k] = v
            converter_options = ConverterOptions(**kwargs)
        except Exception:
            # Fall back to the legacy, minimal set
            converter_options = ConverterOptions(
                accept_tracked_changes=request.options.acceptTrackedChanges,
                extract_media=request.options.extractMedia,
                remove_zero_width=request.options.removeZeroWidth,
            )

        # Best-effort: ask the runner to apply Lua filters if supported.
        try:
            runner.apply_lua_filters(converter_options, request.options.dict())  # type: ignore[attr-defined]
        except Exception:
            pass  # graceful no-op when runner or method is absent

        try:
            # Check if convert_batch supports preview parameter (signature-aware)
            import inspect
            batch_sig = inspect.signature(convert_batch_fn)
            batch_kwargs = {
                "inputs": payloads,
                "targets": request.targets,
                "from_format": request.source_format,
                "options": converter_options,
            }
            if "preview" in batch_sig.parameters:
                batch_kwargs["preview"] = request.preview

            batch = convert_batch_fn(**batch_kwargs)
        except ValueError as exc:
            logger.error(
                "convert validation failed request_id=%s detail=%s",
                resolved_request_id,
                str(exc),
                exc_info=True,
            )
            _log_failure(resolved_request_id, "validation_error", str(exc), start_time)
            raise HTTPException(
                status_code=400,
                detail=str(exc),
                headers=_response_headers(resolved_request_id),
            ) from exc
        except Exception as exc:
            _log_unexpected_trace(resolved_request_id, exc)
            _log_failure(resolved_request_id, exc.__class__.__name__, str(exc), start_time)
            raise HTTPException(
                status_code=500,
                detail="Internal server error during conversion",
                headers=_response_headers(resolved_request_id),
            ) from exc

        outputs = _serialize_outputs(batch)
        preview = _select_preview(batch)
        errors = _serialize_errors(batch)

        response_payload = {
            "jobId": batch.job_id,
            "toolVersions": {"pandoc": runner.get_pandoc_version()},
            "outputs": outputs,
            "preview": preview,
            "logs": batch.logs,
            "errors": errors,
        }
        if _is_preview_env():
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "convert preview success request_id=%s job_id=%s duration_ms=%.2f outputs=%d errors=%d",
                resolved_request_id,
                batch.job_id,
                duration_ms,
                len(outputs),
                len(errors),
            )
        logger.info("convert job_id=%s outputs=%d errors=%d", batch.job_id, len(outputs), len(errors))
        return response_payload
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - safety net for diagnostics
        _log_unexpected_trace(resolved_request_id, exc)
        _log_failure(resolved_request_id, exc.__class__.__name__, str(exc), start_time)
        raise HTTPException(
            status_code=500,
            detail="Internal server error during conversion",
            headers=_response_headers(resolved_request_id),
        ) from exc

def _extract_zip_payloads(zip_path: Path, job_dir: Path, batch_index: int) -> List[InputPayload]:
    """Extract supported files from a ZIP archive and return InputPayload entries.

    Args:
        zip_path: Path to the ZIP file
        job_dir: Working directory for extraction
        batch_index: Index of the ZIP file in the batch

    Returns:
        List of InputPayload instances for supported files
    """
    _ensure_convert_imports()
    payloads: List[InputPayload] = []

    # Supported text/document formats
    SUPPORTED_EXTENSIONS = {
        ".docx", ".odt", ".rtf", ".md", ".markdown",
        ".txt", ".html", ".htm"
    }

    extract_dir = job_dir / f"zip_{batch_index}"
    extract_dir.mkdir(exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.namelist():
                # Skip macOS metadata and hidden directories
                parts = Path(member).parts
                if any(p.startswith(".") or p == "__MACOSX" for p in parts):
                    logger.debug("Skipping ZIP entry: %s", member)
                    continue

                # Skip directories
                if member.endswith("/"):
                    continue

                # Check if supported format
                suffix = Path(member).suffix.lower()
                if suffix not in SUPPORTED_EXTENSIONS:
                    logger.info("Skipping unsupported file in ZIP: %s", member)
                    continue

                # Check member size before extraction
                info = zf.getinfo(member)
                ensure_within_limits(info.file_size)

                # Extract with relative path preserved
                target_path = extract_dir / member
                target_path.parent.mkdir(parents=True, exist_ok=True)

                with zf.open(member) as source:
                    data = source.read()
                    target_path.write_bytes(data)

                # Create payload
                payload_name = Path(member).name
                payloads.append(
                    InputPayload(
                        name=payload_name,
                        data=data,
                        source_format=None
                    )
                )
                logger.info("Extracted from ZIP: %s (size=%d)", member, len(data))

    except zipfile.BadZipFile as exc:
        logger.error("Invalid ZIP file: %s", exc)
        raise ValueError(f"Invalid ZIP file: {exc}") from exc
    except Exception as exc:
        logger.error("ZIP extraction failed: %s", exc)
        raise ValueError(f"ZIP extraction failed: {exc}") from exc

    if not payloads:
        raise ValueError("No supported files found in ZIP archive")

    return payloads


def _download_payloads(inputs: List[InputItem], job_dir: Path) -> List[InputPayload]:
    _ensure_convert_imports()
    payloads: List[InputPayload] = []
    for index, item in enumerate(inputs, start=1):
        metadata = _download_input(item, job_dir)

        # Check if this is a ZIP file
        is_zip = (
            metadata.content_type == "application/zip" or
            metadata.path.suffix.lower() == ".zip"
        )

        if is_zip:
            # Extract ZIP and create payloads for each supported file
            extracted = _extract_zip_payloads(metadata.path, job_dir, index)
            payloads.extend(extracted)
        else:
            # Single file payload
            data = metadata.path.read_bytes()
            name = (item.name or metadata.original_name or f"document-{index}").strip() or f"document-{index}"
            payloads.append(InputPayload(name=name, data=data, source_format=None))
    return payloads


def _download_input(item: InputItem, job_dir: Path) -> DownloadMetadata:
    target = job_dir / (item.name or "input")
    size, content_type = blob.download_to_path(item.blobUrl, target)
    ensure_within_limits(size)
    mime_type = content_type

    if not mime_type:
        mime_type = "application/octet-stream"
    return DownloadMetadata(
        path=target,
        size_bytes=size,
        content_type=mime_type,
        original_name=item.name,
    )


def _serialize_outputs(batch) -> List[dict]:
    entries: List[dict] = []
    for result in batch.results:
        for artifact in result.outputs:
            blob_url = blob.upload_bytes(artifact.name, artifact.data, artifact.content_type)
            entry = {
                "name": artifact.name,
                "size": artifact.size,
                "blobUrl": blob_url,
                "target": artifact.target,
            }
            entries.append(entry)
        if result.media:
            blob_url = blob.upload_bytes(result.media.name, result.media.data, result.media.content_type)
            entries.append(
                {
                    "name": result.media.name,
                    "size": result.media.size,
                    "blobUrl": blob_url,
                    "target": "media",
                }
            )
    return entries


def _select_preview(batch) -> dict:
    for result in batch.results:
        if result.preview:
            return {
                "headings": result.preview.headings,
                "snippets": result.preview.snippets,
                "images": result.preview.images,
            }
    return {"headings": [], "snippets": [], "images": []}


def _serialize_errors(batch) -> List[dict]:
    errors: List[dict] = []
    for result in batch.results:
        if result.error:
            errors.append(
                {
                    "input": result.name,
                    "message": result.error.message,
                    "kind": result.error.kind,
                }
            )
    return errors


def _coerce_targets(value):
    if value is None:
        return ["md"]
    if isinstance(value, str):
        return [value]
    if isinstance(value, list) and value:
        return value
    raise ValueError("`to` must be a string or non-empty list")


def _response_headers(request_id: Optional[str]) -> dict:
    resolved = request_id or uuid.uuid4().hex
    return {
        "x-request-id": resolved,
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
    }


def _is_preview_env() -> bool:
    return os.getenv("VERCEL_ENV") == "preview"


def _log_failure(request_id: str, error_type: str, detail: str, start_time: float) -> None:
    if not _is_preview_env():
        return
    duration_ms = (time.time() - start_time) * 1000
    logger.error(
        "convert preview failure request_id=%s error_type=%s duration_ms=%.2f detail=%s",
        request_id,
        error_type,
        duration_ms,
        detail,
    )
