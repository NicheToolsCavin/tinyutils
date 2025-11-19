"""Reusable converter service for TinyUtils APIs."""
from __future__ import annotations

import hashlib
import re
import html
import json
import logging
import os
import threading
import time
import zipfile
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import pdfminer.high_level
import pdfminer.layout
# pdfplumber is optional; import lazily/optionally
try:  # pragma: no cover — optional dependency at runtime
    import pdfplumber  # type: ignore
except Exception:  # pragma: no cover
    pdfplumber = None  # type: ignore

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


TARGET_EXTENSIONS = {"md": "md", "html": "html", "txt": "txt", "docx": "docx", "odt": "odt", "pdf": "pdf", "rtf": "rtf"}
TARGET_CONTENT_TYPES = {
    "md": "text/markdown; charset=utf-8",
    "html": "text/html; charset=utf-8",
    "txt": "text/plain; charset=utf-8",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "rtf": "application/rtf",
}


_PYPANDOC: Optional[Any] = None

_CACHE_MAX_ENTRIES = int(os.getenv("CONVERT_CACHE_MAX_ENTRIES", "32"))
_CACHE_LOCK = threading.Lock()
_CACHE: "OrderedDict[str, ConversionResult]" = OrderedDict()

_LOGGER = logging.getLogger(__name__)

_DATA_URL_RE = re.compile(r'src="data:([^" ]+)"')

HEADING_SIZE_THRESHOLDS: Tuple[Tuple[float, int], ...] = (
    (18.0, 1),
    (16.0, 2),
    (14.0, 3),
)
MAX_HEADING_BLOCK_LENGTH = 120


def _is_preview_env() -> bool:
    """Check if running in Vercel preview environment."""
    return os.getenv("VERCEL_ENV") == "preview"


def _sanitize_html_for_pandoc(html_text: str) -> str:
    """Best-effort sanitisation for HTML before pandoc.

    Valid data: URLs are left as-is. Obviously malformed data URLs have their
    src cleared and a marker attribute added so they do not cause pandoc
    parse errors while still leaving useful context in the document.
    """

    def _replace(match: re.Match[str]) -> str:
        value = match.group(1)
        # Consider it valid only if it looks like a data URL with base64
        # payload. This is intentionally strict.
        if ";base64," in value:
            return f'src="data:{value}"'
        return 'src="" data-url-removed="invalid-data-url"'

    return _DATA_URL_RE.sub(_replace, html_text)


# -------- Layout-aware PDF → Markdown preprocessor (pdfminer.six) --------

def _try_import_pdfminer():
    try:
        import pdfminer.high_level as _high
        import pdfminer.layout as _layout
        return _high, _layout
    except Exception as _exc:  # pragma: no cover - optional path
        _LOGGER.warning("pdfminer_unavailable err=%s", _exc)
        return None, None


def _ligature_normalize(text: str) -> str:
    return (
        text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬀ", "ff")
        .replace("ﬃ", "ffi").replace("ﬄ", "ffl")
    )


def _merge_lines_and_fix_hyphen(lines: List[str]) -> str:
    merged: List[str] = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip("\n")
        if i + 1 < len(lines):
            nxt = lines[i + 1].lstrip()
            # Conservative hyphen merge: line ends with '-' and next starts lowercase
            if line.endswith("-") and (nxt[:1].islower()):
                line = line[:-1] + nxt
                i += 1
        merged.append(line)
        i += 1
    paragraph = " ".join([l for l in merged if l.strip()])
    return _ligature_normalize(paragraph)


def _guess_image_extension(data: bytes) -> str:
    if data.startswith(b"\xff\xd8"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "gif"
    if data.startswith(b"%PDF"):
        return "pdf"
    return "bin"


def _write_image_bytes(media_dir: Path, idx: int, data: bytes) -> str:
    ext = _guess_image_extension(data)
    filename = f"image-{idx}.{ext}"
    path = media_dir / filename
    path.write_bytes(data)
    return filename


def _indent_level(indent_stack: List[float], value: float, tolerance: float = 5.0) -> int:
    while indent_stack and value + tolerance < indent_stack[-1]:
        indent_stack.pop()
    if not indent_stack or value > indent_stack[-1] + tolerance:
        indent_stack.append(value)
    return len(indent_stack)


def _classify_heading(font_sizes: List[float]) -> Optional[int]:
    if not font_sizes:
        return None
    # Heuristic: top size tiers → H1/H2/H3
    mx = max(font_sizes)
    if mx <= 0:
        return None
    # Map by relative thresholds
    for threshold, level in HEADING_SIZE_THRESHOLDS:
        if mx >= threshold:
            return level
    return None


def _format_list_marker(text: str) -> Optional[str]:
    t = text.lstrip()
    if not t:
        return None
    # Bullets or numbered
    if t.startswith(("- ", "• ", "* ")):
        return "-"
    # Simple numbered list like '1. '
    if len(t) > 2 and t[0].isdigit() and t[1] == ".":
        return "1."
    return None


def _extract_markdown_from_pdf(
    pdf_path: Path,
    workspace: Path,
    *,
    mode: str = "default",
    extract_media: bool = False,
    media_dir: Optional[Path] = None,
) -> Tuple[Path, dict]:
    """Extract Markdown from PDF using pdfminer.six with light heuristics.

    Returns a tuple of (markdown_path, meta dict). The caller decides whether
    to accept or fall back based on the meta/degraded flags.
    """
    high, layout = _try_import_pdfminer()
    if high is None or layout is None:
        raise RuntimeError("pdfminer_unavailable")

    laparams = layout.LAParams(
        char_margin=2.0,
        word_margin=0.1,
        line_margin=0.5 if mode != "aggressive" else 0.2,
        boxes_flow=0.5 if mode != "aggressive" else -0.5,
    )

    headings = 0
    lists = 0
    tables_md = 0
    tables_csv = 0
    images = 0
    pages = 0
    t0 = time.time()
    mem_chars = 0
    timed_out = False
    rtl_detected = False

    lines_out: List[str] = []
    list_indent_stack: List[float] = []

    try:
        for page_layout in high.extract_pages(str(pdf_path), laparams=laparams):
            pages += 1
            page_blocks: List[str] = []
            # Early timeout guard (~80s)
            if (time.time() - t0) * 1000.0 > 80_000:
                timed_out = True
                break
            for element in page_layout:
                name = element.__class__.__name__
                # Text boxes → lines
                if hasattr(element, "get_text"):
                    raw = element.get_text()
                    block = _merge_lines_and_fix_hyphen(raw.splitlines())
                    if not rtl_detected and re.search(r"[\u0590-\u08FF]", block):
                        rtl_detected = True
                    # Heading inference from LTChar sizes if available
                    sizes: List[float] = []
                    try:
                        for line_item in getattr(element, "_objs", []):
                            for frag in getattr(line_item, "_objs", []):
                                if frag.__class__.__name__ == "LTChar":
                                    sizes.append(getattr(frag, "size", 0.0))
                    except Exception:
                        pass
                    level = _classify_heading(sizes)
                    marker = _format_list_marker(block)
                    if level is not None and len(block) < MAX_HEADING_BLOCK_LENGTH:
                        headings += 1
                        page_blocks.append("#" * level + " " + block)
                        list_indent_stack.clear()
                    elif marker is not None:
                        lists += 1
                        indent = getattr(element, "x0", 0.0)
                        level = _indent_level(list_indent_stack, indent)
                        indent_prefix = "  " * max(level - 1, 0)
                        stripped = re.sub(r"^([-•*]|\d+\.)\s*", "", block.lstrip())
                        page_blocks.append(f"{indent_prefix}{marker} {stripped}")
                    else:
                        list_indent_stack.clear()
                        page_blocks.append(block)
                # Image placeholders / optional media
                elif name in ("LTImage", "LTFigure"):
                    imgs: List[Any] = []
                    if name == "LTImage":
                        imgs = [element]
                    else:
                        imgs = [obj for obj in getattr(element, "_objs", []) if obj.__class__.__name__ == "LTImage"]
                    for img in imgs:
                        images += 1
                        filename: Optional[str] = None
                        if extract_media and media_dir is not None:
                            stream = getattr(img, "stream", None)
                            if stream is not None:
                                raw = None
                                try:
                                    raw = stream.get_rawdata()
                                except AttributeError:
                                    try:
                                        raw = stream.get_data()
                                    except AttributeError:
                                        raw = None
                                if raw:
                                    try:
                                        filename = _write_image_bytes(media_dir, images, raw)
                                    except Exception:
                                        filename = None
                        if filename:
                            page_blocks.append(f"![Image {images}]({filename})")
                        else:
                            page_blocks.append(f"[IMAGE {images}]")
                else:
                    continue
            # Attempt table detection via pdfplumber lazily
            try:
                if pdfplumber is not None:
                    with pdfplumber.open(str(pdf_path)) as pl:  # type: ignore
                        if 0 <= (pages - 1) < len(pl.pages):
                            tbls = pl.pages[pages - 1].find_tables()
                        for idx, tbl in enumerate(tbls, start=1):
                            data = tbl.extract() or []
                            # Regular grid → Markdown table, else CSV fallback
                            col_counts = {len(row) for row in data if isinstance(row, list)}
                            if len(col_counts) == 1 and list(col_counts)[0] > 1:
                                # Markdown table
                                tables_md += 1
                                cols = list(col_counts)[0]
                                header = " | ".join([f"Col{i+1}" for i in range(cols)])
                                sep = " | ".join(["---"] * cols)
                                md_rows = [f"| {header} |", f"| {sep} |"]
                                for r in data:
                                    row = [str(c or "").replace("|", "\|") for c in r]
                                    md_rows.append("| " + " | ".join(row) + " |")
                                page_blocks.append("\n" + "\n".join(md_rows) + "\n")
                            else:
                                tables_csv += 1
                                csv_lines: List[str] = []
                                for r in data:
                                    row = []
                                    for c in (r or []):
                                        cell = str(c or "")
                                        if cell[:1] in ("=", "+", "-", "@"):
                                            cell = "'" + cell
                                        row.append('"' + cell.replace('"', '""') + '"')
                                    csv_lines.append(",".join(row))
                                csv_text = "\n".join(csv_lines)
                                csv_filename: Optional[str] = None
                                if extract_media and media_dir is not None:
                                    csv_filename = f"table-{tables_csv}.csv"
                                    (media_dir / csv_filename).write_text(csv_text, "utf-8")
                                note = f"> Table {tables_csv} (low confidence; CSV fallback)"
                                if csv_filename:
                                    note += f" — see [{csv_filename}]({csv_filename})"
                                page_blocks.append(note)
                                page_blocks.append("```csv\n" + csv_text + "\n```\n")
            except Exception:
                # If pdfplumber not available or errors, ignore silently
                pass

            # Separate pages by thematic break
            if page_blocks:
                lines_out.extend(page_blocks)
                lines_out.append("\n---\n")
                # Memory guard (approximate)
                mem_chars += sum(len(x) for x in page_blocks)
                if mem_chars > 5_000_000:  # ~5 MB of plain text
                    timed_out = True
                    break

        text = "\n".join(lines_out).strip()
        md_path = workspace / f"{pdf_path.stem}_extracted.md"
        md_path.write_text(text or "", "utf-8")
        meta = {
            "engine": "pdfminer_six",
            "mode_used": mode,
            "la_params": {
                "char_margin": laparams.char_margin,
                "word_margin": laparams.word_margin,
                "line_margin": laparams.line_margin,
                "boxes_flow": laparams.boxes_flow,
            },
            "pages_count": pages,
            "headings_detected": headings,
            "lists_detected": lists,
            "tables_detected": {"markdown": tables_md, "csv_fallback": tables_csv},
            "images_placeholders_count": images,
            "rtl_detected": rtl_detected,
            "timings_ms": {"total": int((time.time() - t0) * 1000)},
        }

        # Degradation guardrails
        degraded = timed_out or (len(text) < 64) or ("\n" not in text and len(text) > 0)
        if degraded:
            meta["degraded_reason"] = (
                "timeout" if timed_out else "too_short_or_single_line"
            )
            meta["fallback_used"] = True
        return md_path, meta
    except Exception as exc:  # pragma: no cover - pass to fallback
        raise RuntimeError(f"pdfminer_failed: {exc}")


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

    # Perform lightweight server-side format detection BEFORE computing cache key
    # so that cache distinguishes auto→latex upgrades properly.
    adjusted_from = from_format
    try:
        sample_text = input_bytes[:4096].decode("utf-8", errors="ignore")
    except Exception:
        sample_text = ""
    def _looks_like_latex(t: str) -> bool:
        return bool(t) and (
            "\\documentclass" in t
            or "\\begin{document}" in t
            or re.search(r"\\(section|chapter|usepackage)\{", t) is not None
        )
    # Name hint
    name_lower = (name or "").lower()
    looks_tex_name = name_lower.endswith('.tex')
    if adjusted_from in (None, "md", "markdown", "text", "auto") and (
        _looks_like_latex(sample_text) or looks_tex_name
    ):
        adjusted_from = "latex"

    cache_key = _build_cache_key(
        input_bytes=input_bytes,
        name=name,
        targets=normalized_targets,
        options=opts,
        pandoc_version=pandoc_version,
        from_format=adjusted_from,
    )

    cached = _cache_get(cache_key)
    if cached is not None:
        cached.logs.append("cache=hit")
        return cached
    logs: List[str] = [f"targets={','.join(normalized_targets)}"]
    result_meta: Dict[str, Any] = {}

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
            # For DOCX/ODT inputs we always extract media so downstream
            # consumers can access embedded images, even when the caller did
            # not explicitly request it.
            extract_dir: Optional[Path]
            if opts.extract_media or (from_format in {"docx", "odt"}):
                extract_dir = media_dir
                extract_dir.mkdir(parents=True, exist_ok=True)
            else:
                extract_dir = None

            # Use the adjusted_from for the actual conversion (post-detection)
            if adjusted_from != from_format:
                logs.append("format_override=latex_detected_server")
                from_format = adjusted_from

            # Pre-process PDFs: layout-aware extraction with legacy fallback
            source_for_pandoc = input_path
            if input_path.suffix.lower() == ".pdf" or from_format == "pdf":
                # Prefer explicit option over env; keep env as default for safe rollout
                env_mode = os.getenv("PDF_LAYOUT_MODE", "default") or "default"
                sel_mode = (
                    opts.pdf_layout_mode
                    or ("aggressive" if opts.aggressive_pdf_mode else None)
                    or env_mode
                ).lower()
                if sel_mode not in ("default", "aggressive", "legacy"):
                    sel_mode = "default"
                logs.append(f"pdf_layout_mode={sel_mode}")
                try:
                    md_path, meta = _extract_markdown_from_pdf(
                        input_path,
                        workspace,
                        mode=sel_mode,
                        extract_media=bool(extract_dir),
                        media_dir=extract_dir,
                    )
                    logs.append("pdf_engine=pdfminer_six")
                    logs.append(f"pdf_mode={meta.get('mode_used')}")
                    logs.append(f"pdf_pages={meta.get('pages_count')}")
                    logs.append(f"pdf_headings={meta.get('headings_detected')}")
                    logs.append(f"pdf_lists={meta.get('lists_detected')}")
                    td = meta.get('tables_detected', {})
                    logs.append(f"pdf_tables_md={td.get('markdown',0)}")
                    logs.append(f"pdf_tables_csv={td.get('csv_fallback',0)}")
                    logs.append(f"pdf_images_placeholders={meta.get('images_placeholders_count')}")
                    if meta.get('rtl_detected'):
                        logs.append("pdf_rtl_detected=1")
                    if meta.get('degraded_reason'):
                        logs.append(f"pdf_degraded={meta['degraded_reason']}")
                        raise RuntimeError("degraded_output")
                    source_for_pandoc = md_path
                    from_format = "markdown"
                    logs.append("pdf_extraction_strategy=layout_aware")
                except Exception:
                    logs.append("pdf_extraction_strategy=fallback_legacy")
                    result_meta = {
                        "engine": "pypdf_fallback",
                        "mode_requested": sel_mode,
                        "fallback_used": True,
                    }
                    source_for_pandoc = _extract_text_from_pdf_legacy(input_path, workspace)
                    from_format = "markdown"

            # Check if we can do direct conversion without markdown intermediate
            # This fixes HTML→Plain Text truncation and HTML→HTML stray code issues
            can_do_direct = from_format == "html" and all(t in ["txt", "html"] for t in normalized_targets)

            if can_do_direct:
                logs.append("conversion_strategy=direct_html")
                # Direct HTML conversion without markdown intermediate
                outputs = _build_direct_html_artifacts(
                    source_path=source_for_pandoc,
                    targets=normalized_targets,
                    base_name=_safe_stem(safe_name),
                    logs=logs,
                )
                # Create minimal preview from HTML
                html_text = source_for_pandoc.read_text("utf-8", errors="replace")
                preview = PreviewData(
                    headings=[],
                    snippets=[html_text[:500]],
                    images=[],
                )
                before_text = html_text
                cleaned_text = html_text
            else:
                logs.append("conversion_strategy=via_markdown")
                # HTML conversion uses specialized Lua filters to convert semantic elements
                if from_format == "html":
                    logs.append("html_semantic_filter=enabled")
                    # Light HTML sanitisation to avoid malformed data: URLs
                    # causing pandoc errors. This mirrors the library
                    # converter behavior and is deliberately conservative.
                    try:
                        html_text = source_for_pandoc.read_text("utf-8")
                    except Exception:
                        html_text = ""
                    if html_text:
                        html_text = _sanitize_html_for_pandoc(html_text)
                        source_for_pandoc.write_text(html_text, "utf-8")

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
                    md_dialect=getattr(opts, "md_dialect", None),
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


def _build_direct_html_artifacts(
    *,
    source_path: Path,
    targets: Iterable[str],
    base_name: str,
    logs: Optional[List[str]] = None,
) -> List[TargetArtifact]:
    """Convert HTML directly to targets without markdown intermediate step.

    This fixes HTML→Plain Text truncation and HTML→HTML stray code blocks.
    Only used when from_format=="html" and all targets are txt/html.
    """
    pypandoc = _get_pypandoc()
    artifacts: List[TargetArtifact] = []

    for target in targets:
        if target == "html":
            # HTML→HTML: Clean via pandoc to normalize structure
            rendered = pypandoc.convert_file(
                str(source_path),
                to="html",
                format="html",
                extra_args=["--wrap=none"],
            )
            data = rendered.encode("utf-8")
            if logs:
                logs.append(f"direct_html_to_html_bytes={len(data)}")
        elif target == "txt":
            # HTML→Plain Text: Direct conversion with wide columns to prevent truncation
            rendered = pypandoc.convert_file(
                str(source_path),
                to="plain",
                format="html",
                extra_args=["--wrap=none", "--columns=1000"],
            )
            data = rendered.encode("utf-8")
            if logs:
                logs.append(f"direct_html_to_txt_bytes={len(data)}")
        else:
            # Shouldn't happen due to can_do_direct check, but handle gracefully
            if logs:
                logs.append(f"direct_html_unsupported_target={target}")
            continue

        artifacts.append(
            TargetArtifact(
                target=target,
                name=f"{base_name}.{TARGET_EXTENSIONS[target]}",
                content_type=TARGET_CONTENT_TYPES[target],
                data=data,
            )
        )
    return artifacts


def _build_target_artifacts(
    *,
    targets: Iterable[str],
    cleaned_path: Path,
    cleaned_text: str,
    base_name: str,
    md_dialect: Optional[str] = None,
    logs: Optional[List[str]] = None,
) -> List[TargetArtifact]:
    artifacts: List[TargetArtifact] = []
    for target in targets:
        if target == "md":
            # Use DEFAULT_OUTPUT_FORMAT as default dialect
            default_dialect = pandoc_runner.DEFAULT_OUTPUT_FORMAT.split('+')[0]  # Extract base format (gfm)
            dialect = (md_dialect or default_dialect).strip().lower()
            # If dialect matches our default cleaned markdown, use cached text directly
            if dialect in (default_dialect, "markdown", "md", pandoc_runner.DEFAULT_OUTPUT_FORMAT):
                data = cleaned_text.encode("utf-8")
            else:
                pypandoc = _get_pypandoc()
                try:
                    rendered = pypandoc.convert_file(
                        str(cleaned_path),
                        to=dialect,
                        format="gfm",
                        extra_args=["--wrap=none"],
                    )
                    data = rendered.encode("utf-8")
                    if logs is not None:
                        logs.append(f"md_dialect={dialect}")
                except Exception as exc:
                    if logs is not None:
                        logs.append(f"md_dialect_error={exc.__class__.__name__}")
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
    elif target == "odt":
        # ODT output via pandoc
        output_path = cleaned_path.parent / f"{cleaned_path.stem}.odt"
        pypandoc.convert_file(
            str(cleaned_path),
            to="odt",
            format="gfm",
            outputfile=str(output_path),
            extra_args=["--wrap=none"],
        )
        return output_path.read_bytes()
    else:
        # Standard text-based outputs (html, txt, md)
        pandoc_target = "plain" if target == "txt" else target
        # Add better args for plain text to preserve structure
        extra_args = ["--wrap=none"]
        if target == "txt":
            # For plain text, preserve structure better
            extra_args.extend(["--columns=1000"])
        if target == "rtf":
            extra_args.append("--standalone")

        rendered = pypandoc.convert_file(
            str(cleaned_path),
            to=pandoc_target,
            format="gfm",
            extra_args=extra_args,
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

        # Local reportlab fallback (pure Python, no system dependencies)
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        import io

        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Simple HTML to paragraphs conversion
        # Remove HTML tags for basic text rendering
        import re
        clean_text = re.sub('<[^<]+?>', '', html_with_style)
        lines = clean_text.strip().split('\n')

        for line in lines:
            if line.strip():
                story.append(Paragraph(line, styles['Normal']))
                story.append(Spacer(1, 0.2*inch))

        doc.build(story)
        if logs is not None:
            logs.append("pdf_engine=reportlab")
        return pdf_buffer.getvalue()

    except Exception as e:
        # If PDF generation fails completely, raise a more informative error
        raise RuntimeError(f"PDF generation failed: {str(e)}") from e




def _extract_text_from_pdf_legacy(pdf_path: Path, workspace: Path) -> Path:
    """Extract simple text from PDF using pypdf and return as markdown file."""
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    lines: List[str] = []
    multi = len(reader.pages) > 1
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            if multi:
                lines.append(f"\n\n---\n\n**Page {page_num}**\n\n")
            lines.append(text)
    md_path = workspace / f"{pdf_path.stem}_legacy_extracted.md"
    md_path.write_text("\n".join(lines), "utf-8")
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
    if options.md_dialect:
        hasher.update(options.md_dialect.encode("utf-8", "ignore"))
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
