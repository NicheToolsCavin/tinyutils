"""Reusable converter service for TinyUtils APIs."""
from __future__ import annotations

import hashlib
import html
import json
import logging
import os
import threading
import time
import zipfile
from collections import OrderedDict
from pathlib import Path
from typing import Any, Iterable, List, Optional, Sequence

# Use relative imports since we're in api/convert/ directory
from .._lib import pandoc_runner
from .._lib.manifests import build_snippets, collect_headings, media_manifest
from .._lib.text_clean import normalise_markdown
from .._lib.utils import ensure_within_limits, generate_job_id, job_workspace

from .convert_types import (
    BatchResult,
    ConversionError,
    ConversionOptions,
    ConversionResult,
    InputPayload,
    MediaArtifact,
    PreviewData,
    TargetArtifact,
)


TARGET_EXTENSIONS = {"md": "md", "html": "html", "txt": "txt", "docx": "docx", "pdf": "pdf"}
TARGET_CONTENT_TYPES = {
    "md": "text/markdown; charset=utf-8",
    "html": "text/html; charset=utf-8",
    "txt": "text/plain; charset=utf-8",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
}


_PYPANDOC: Optional[Any] = None

_CACHE_MAX_ENTRIES = int(os.getenv("CONVERT_CACHE_MAX_ENTRIES", "32"))
_CACHE_LOCK = threading.Lock()
_CACHE: "OrderedDict[str, ConversionResult]" = OrderedDict()

_LOGGER = logging.getLogger(__name__)


def _is_preview_env() -> bool:
    """Check if running in Vercel preview environment."""
    return os.getenv("VERCEL_ENV") == "preview"


def convert_one(

    *,
    input_bytes: bytes,
    name: str,
    targets: Optional[Sequence[str]] = None,
    from_format: Optional[str] = None,
    options: Optional[ConversionOptions] = None,
) -> ConversionResult:
    """Convert a single payload into the requested textual outputs."""


    opts = options or ConversionOptions()
    normalized_targets = _normalize_targets(targets)
    pandoc_version = pandoc_runner.get_pandoc_version() or "unknown"
    cache_key = _build_cache_key(
        input_bytes=input_bytes,
        name=name,
        targets=normalized_targets,
        options=opts,
        pandoc_version=pandoc_version,
        from_format=from_format,
    )

    cached = _cache_get(cache_key)
    if cached is not None:
        cached.logs.append("cache=hit")
        return cached
    logs: List[str] = [f"targets={','.join(normalized_targets)}"]

    try:
        pandoc_runner.ensure_pandoc()
    except pandoc_runner.PandocError as exc:
        logs.append(f"pandoc_unavailable={exc}")
        _LOGGER.warning(
            "convert pandoc unavailable name=%s targets=%s error=%s",
            name,
            ",".join(normalized_targets),
            exc,
            exc_info=True,
        )
        return _fallback_conversion(
            name=name,
            input_bytes=input_bytes,
            targets=normalized_targets,
            logs=logs,
        )

    start_time = time.time()
    try:
        ensure_within_limits(len(input_bytes))
        with job_workspace() as workspace:
            safe_name = _safe_name(name)
            input_path = workspace / safe_name
            input_path.write_bytes(input_bytes)
            logs.append(f"input_bytes={len(input_bytes)}")

            raw_md = workspace / "raw.md"
            filtered_md = workspace / "filtered.md"
            cleaned_md = workspace / "cleaned.md"
            media_dir = workspace / "media"
            extract_dir: Optional[Path] = media_dir if opts.extract_media else None

            # Pre-process PDFs: extract text using pypdf before pandoc
            source_for_pandoc = input_path
            if from_format == "pdf" or (from_format is None and input_path.suffix.lower() == ".pdf"):
                logs.append("preprocessing=pdf_text_extraction")
                source_for_pandoc = _extract_text_from_pdf(input_path, workspace)
                from_format = "markdown"  # Extracted text is markdown

            pandoc_runner.convert_to_markdown(
                source=source_for_pandoc,
                destination=raw_md,
                from_format=from_format,
                accept_tracked_changes=opts.accept_tracked_changes,
                extract_media_dir=extract_dir,
            )
            pandoc_runner.apply_lua_filters(raw_md, filtered_md)

            before_text = raw_md.read_text("utf-8")
            filtered_text = filtered_md.read_text("utf-8")
            cleaned_text, stats = normalise_markdown(
                filtered_text,
                remove_zero_width=opts.remove_zero_width,
            )
            cleaned_md.write_text(cleaned_text, "utf-8")
            logs.append(f"cleanup_stats={json.dumps(stats.__dict__, sort_keys=True)}")

            outputs = _build_target_artifacts(
                targets=normalized_targets,
                cleaned_path=cleaned_md,
                cleaned_text=cleaned_text,
                base_name=_safe_stem(safe_name),
                logs=logs,
            )

            preview = PreviewData(
                headings=collect_headings(cleaned_text),
                snippets=build_snippets(before_text, cleaned_text),
                images=media_manifest(extract_dir),
            )

            media_artifact = _build_media_artifact(extract_dir, _safe_stem(safe_name))

            result = ConversionResult(
                name=name,
                outputs=outputs,
                preview=preview,
                media=media_artifact,
                logs=logs,
            )
            _cache_store(cache_key, result)
            return result
    except pandoc_runner.PandocError as exc:  # pragma: no cover - fallback to passthrough
        logs.append(f"pandoc_error={exc}")
        result = _fallback_conversion(
            name=name,
            input_bytes=input_bytes,
            targets=normalized_targets,
            logs=logs,
        )
        _cache_store(cache_key, result)
        return result
    except Exception as exc:  # pragma: no cover - converted to error payload
        if _is_preview_env():
            duration_ms = (time.time() - start_time) * 1000
            _LOGGER.error(
                "convert preview failure name=%s error_type=%s duration_ms=%.2f detail=%s",
                name,
                exc.__class__.__name__,
                duration_ms,
                str(exc),
                exc_info=True,
            )
        return ConversionResult(
            name=name,
            logs=logs,
            error=ConversionError(message=str(exc), kind=exc.__class__.__name__),
        )


def convert_batch(
    *,
    inputs: Sequence[InputPayload],
    targets: Optional[Sequence[str]] = None,
    from_format: Optional[str] = None,
    options: Optional[ConversionOptions] = None,
) -> BatchResult:
    """Convert multiple payloads, capturing per-input errors."""

    if not inputs:
        raise ValueError("inputs must contain at least one payload")

    opts = options or ConversionOptions()
    normalized_targets = _normalize_targets(targets)
    job_id = generate_job_id()
    batch_logs = [
        f"job_id={job_id}",
        f"inputs={len(inputs)}",
        f"targets={','.join(normalized_targets)}",
    ]

    results: List[ConversionResult] = []
    for payload in inputs:
        result = convert_one(
            input_bytes=payload.data,
            name=payload.name,
            targets=normalized_targets,
            from_format=payload.source_format or from_format,
            options=opts,
        )
        for entry in result.logs:
            batch_logs.append(f"{payload.name}:{entry}")
        results.append(result)

    return BatchResult(job_id=job_id, results=results, logs=batch_logs)


def _normalize_targets(targets: Optional[Sequence[str]]) -> List[str]:
    if not targets:
        return ["md"]
    normalized: List[str] = []
    seen = set()
    for target in targets:
        if target is None:
            continue
        slug = target.lower().strip()
        if slug == "markdown":
            slug = "md"
        elif slug == "text":
            slug = "txt"
        if slug not in TARGET_EXTENSIONS:
            raise ValueError(f"Unsupported target '{target}'")
        if slug not in seen:
            seen.add(slug)
            normalized.append(slug)
    return normalized or ["md"]


def _build_target_artifacts(
    *,
    targets: Iterable[str],
    cleaned_path: Path,
    cleaned_text: str,
    base_name: str,
    logs: Optional[List[str]] = None,
) -> List[TargetArtifact]:
    artifacts: List[TargetArtifact] = []
    for target in targets:
        if target == "md":
            data = cleaned_text.encode("utf-8")
        else:
            data = _render_markdown_target(cleaned_path, target, logs=logs)
        artifacts.append(
            TargetArtifact(
                target=target,
                name=f"{base_name}.{TARGET_EXTENSIONS[target]}",
                content_type=TARGET_CONTENT_TYPES[target],
                data=data,
            )
        )
    return artifacts


def _fallback_conversion(*, name: str, input_bytes: bytes, targets: Sequence[str], logs: List[str]) -> ConversionResult:
    text = input_bytes.decode("utf-8", errors="replace")
    safe_stem = _safe_stem(_safe_name(name))
    artifacts: List[TargetArtifact] = []
    for target in targets:
        if target not in TARGET_EXTENSIONS:
            continue
        if target == "html":
            body = html.escape(text)
            data = f"<pre>{body}</pre>".encode("utf-8")
        else:
            data = text.encode("utf-8")
        artifacts.append(
            TargetArtifact(
                target=target,
                name=f"{safe_stem}.{TARGET_EXTENSIONS[target]}",
                content_type=TARGET_CONTENT_TYPES[target],
                data=data,
            )
        )
    preview = PreviewData(headings=[], snippets=[text[:280]], images=[])
    return ConversionResult(
        name=name,
        outputs=artifacts,
        preview=preview,
        media=None,
        logs=[*logs, "fallback=1"],
    )


def _render_markdown_target(cleaned_path: Path, target: str, *, logs: Optional[List[str]] = None) -> bytes:
    pypandoc = _get_pypandoc()

    if target == "pdf":
        # PDF requires special handling - prefer external renderer when configured
        return _render_pdf_via_reportlab(cleaned_path, logs=logs)
    elif target == "docx":
        # DOCX output via pandoc (native support)
        output_path = cleaned_path.parent / f"{cleaned_path.stem}.docx"
        pypandoc.convert_file(
            str(cleaned_path),
            to="docx",
            format="gfm",
            outputfile=str(output_path),
            extra_args=["--wrap=none"],
        )
        return output_path.read_bytes()
    else:
        # Standard text-based outputs (html, txt, md)
        pandoc_target = "plain" if target == "txt" else target
        rendered = pypandoc.convert_file(
            str(cleaned_path),
            to=pandoc_target,
            format="gfm",
            extra_args=["--wrap=none"],
        )
        return rendered.encode("utf-8")


def _render_pdf_via_reportlab(markdown_path: Path, *, logs: Optional[List[str]] = None) -> bytes:
    """Convert markdown to PDF using external Chromium renderer or xhtml2pdf fallback.

    Strategy: Convert markdown → HTML (via pandoc) → PDF (via Chromium or xhtml2pdf).
    Prefers external Chromium renderer (PDF_RENDERER_URL) for higher fidelity.
    Falls back to local xhtml2pdf when external renderer is not configured.
    """
    try:
        # First, convert markdown to HTML using pandoc (which we know works)
        pypandoc = _get_pypandoc()
        html_content = pypandoc.convert_file(
            str(markdown_path),
            to='html5',
            format='gfm',
            extra_args=['--standalone', '--self-contained']
        )

        # Add basic CSS for better formatting
        html_with_style = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ font-size: 24px; margin-top: 20px; }}
                h2 {{ font-size: 20px; margin-top: 16px; }}
                h3 {{ font-size: 16px; margin-top: 12px; }}
                p {{ line-height: 1.6; }}
                code {{ background-color: #f4f4f4; padding: 2px 4px; font-family: monospace; }}
                pre {{ background-color: #f4f4f4; padding: 10px; overflow-x: auto; }}
            </style>
        </head>
        <body>
        {html_content}
        </body>
        </html>
        """

        # Prefer external Chromium renderer if available
        use_external = bool(os.getenv("PDF_RENDERER_URL"))
        if use_external:
            from ._pdf_external import render_html_to_pdf_via_external, RemotePdfError
            try:
                import uuid
                request_id = uuid.uuid4().hex
                pdf_bytes, meta = render_html_to_pdf_via_external(
                    html_with_style,
                    f"{markdown_path.stem or 'output'}.pdf",
                    request_id
                )
                _LOGGER.info(
                    "PDF rendered via external Chromium: engine=%s version=%s",
                    meta.get('pdfEngine'),
                    meta.get('pdfEngineVersion')
                )
                if logs is not None:
                    engine = meta.get('pdfEngine') or 'external'
                    version = meta.get('pdfEngineVersion') or 'unknown'
                    # Use format that app.py can parse: "pdf_engine=<value> pdf_engine_version=<value>"
                    logs.append(f"pdf_engine={engine}")
                    if version:
                        logs.append(f"pdf_engine_version={version}")
                return pdf_bytes
            except RemotePdfError as exc:
                # External renderer failed - log warning and fall back to local renderer
                _LOGGER.warning(
                    "External PDF renderer failed (code=%s message=%s), falling back to xhtml2pdf",
                    exc.code,
                    exc.message
                )
                if logs is not None:
                    logs.append(f"pdf_external_fallback={exc.code}:{exc.message}")
                # Fall through to xhtml2pdf fallback below

        # Local fallback temporarily disabled due to xhtml2pdf/pycairo build issues on Vercel
        # External PDF renderer is required for PDF generation
        # TODO: Replace with reportlab-based fallback
        raise RuntimeError("PDF generation requires external renderer (PDF_RENDERER_URL). Local fallback temporarily unavailable.")

    except Exception as e:
        # If PDF generation fails completely, raise a more informative error
        raise RuntimeError(f"PDF generation failed: {str(e)}") from e


def _extract_text_from_pdf(pdf_path: Path, workspace: Path) -> Path:
    """Extract text from PDF using pypdf and return as markdown file.

    This allows us to read PDFs without requiring pdftotext or poppler-utils.
    The extracted text will be formatted as simple markdown.
    """
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)
    extracted_lines = []

    # Extract text from all pages
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text()
        if text.strip():
            # Add page marker for multi-page PDFs
            if len(reader.pages) > 1:
                extracted_lines.append(f"\n\n---\n\n**Page {page_num}**\n\n")
            extracted_lines.append(text)

    # Save as markdown
    md_path = workspace / f"{pdf_path.stem}_extracted.md"
    md_path.write_text("\n".join(extracted_lines), "utf-8")
    return md_path


def _get_pypandoc():
    global _PYPANDOC
    if _PYPANDOC is None:
        import pypandoc  # type: ignore

        _PYPANDOC = pypandoc
    return _PYPANDOC


def _build_media_artifact(media_dir: Optional[Path], base_name: str) -> Optional[MediaArtifact]:
    if not media_dir or not media_dir.exists():
        return None
    files = [path for path in media_dir.rglob("*") if path.is_file()]
    if not files:
        return None

    archive_path = media_dir.parent / f"{base_name}-media.zip"
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for file_path in sorted(files):
            bundle.write(file_path, file_path.relative_to(media_dir))
    data = archive_path.read_bytes()
    return MediaArtifact(name=archive_path.name, content_type="application/zip", data=data)


def _safe_name(name: str) -> str:
    candidate = Path(name or "input").name
    return candidate or "input"


def _safe_stem(name: str) -> str:
    stem = Path(name).stem
    return stem or "document"


def _build_cache_key(
    *,
    input_bytes: bytes,
    name: str,
    targets: Sequence[str],
    options: ConversionOptions,
    pandoc_version: str,
    from_format: Optional[str],
) -> str:
    hasher = hashlib.sha256()
    hasher.update(input_bytes)
    hasher.update(name.encode("utf-8", "ignore"))
    for target in targets:
        hasher.update(target.encode("ascii"))
    hasher.update(str(options.accept_tracked_changes).encode("ascii"))
    hasher.update(str(options.extract_media).encode("ascii"))
    hasher.update(str(options.remove_zero_width).encode("ascii"))
    hasher.update(pandoc_version.encode("utf-8", "ignore"))
    if from_format:
        hasher.update(from_format.encode("utf-8", "ignore"))
    return hasher.hexdigest()


def _cache_get(key: str) -> Optional[ConversionResult]:
    with _CACHE_LOCK:
        cached = _CACHE.get(key)
        if cached is None:
            return None
        _CACHE.move_to_end(key)
        return _clone_result(cached)


def _cache_store(key: str, result: ConversionResult) -> None:
    if result.error or not result.outputs:
        return
    copy = _clone_result(result)
    with _CACHE_LOCK:
        _CACHE[key] = copy
        _CACHE.move_to_end(key)
        while len(_CACHE) > max(_CACHE_MAX_ENTRIES, 1):
            _CACHE.popitem(last=False)


def _clone_result(result: ConversionResult) -> ConversionResult:
    outputs = [
        TargetArtifact(
            target=artifact.target,
            name=artifact.name,
            content_type=artifact.content_type,
            data=artifact.data,
        )
        for artifact in result.outputs
    ]
    preview = None
    if result.preview:
        preview = PreviewData(
            headings=list(result.preview.headings),
            snippets=list(result.preview.snippets),
            images=list(result.preview.images),
        )
    media = None
    if result.media:
        media = MediaArtifact(
            name=result.media.name,
            content_type=result.media.content_type,
            data=result.media.data,
        )
    error = None
    if result.error:
        error = ConversionError(
            message=result.error.message,
            kind=result.error.kind,
        )
    return ConversionResult(
        name=result.name,
        outputs=outputs,
        preview=preview,
        media=media,
        logs=list(result.logs),
        error=error,
    )
