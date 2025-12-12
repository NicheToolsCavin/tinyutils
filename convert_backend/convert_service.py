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

# Use absolute imports so the module works both locally and inside Vercel lambdas
from api._lib import pandoc_runner
from api._lib.html_utils import sanitize_html_for_pandoc, sanitize_html_for_preview
from api._lib.manifests import build_snippets, collect_headings, media_manifest
from api._lib.text_clean import normalise_markdown
from api._lib.utils import (
    ensure_within_limits,
    generate_job_id,
    job_workspace,
    detect_rows_columns,
    count_json_nodes,
    detect_html_in_disguise,
    protect_csv_formulas,
    safe_parse_limited,
)

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
from . import page_break_marker
from . import comments_extractor

# LibreOffice integration (optional)
try:
    from . import libreoffice_converter
except ImportError:  # pragma: no cover
    libreoffice_converter = None  # type: ignore

# Smart routing for DOCX conversion (Mammoth for colors, LibreOffice for complex)
try:
    from . import smart_router
    from .smart_router import ConversionTier
except ImportError:  # pragma: no cover
    smart_router = None  # type: ignore
    ConversionTier = None  # type: ignore

# Mammoth for lightweight DOCX→HTML with colors (optional)
try:
    import mammoth
except ImportError:  # pragma: no cover
    mammoth = None  # type: ignore


TARGET_EXTENSIONS = {
    "md": "md",
    "html": "html",
    "txt": "txt",
    "docx": "docx",
    "odt": "odt",
    "pdf": "pdf",
    "rtf": "rtf",
    "epub": "epub",
    "latex": "tex",
}
TARGET_CONTENT_TYPES = {
    "md": "text/markdown; charset=utf-8",
    "html": "text/html; charset=utf-8",
    "txt": "text/plain; charset=utf-8",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "rtf": "application/rtf",
    "epub": "application/epub+zip",
    "latex": "text/x-tex; charset=utf-8",
}


_PYPANDOC: Optional[Any] = None

_CACHE_MAX_ENTRIES = int(os.getenv("CONVERT_CACHE_MAX_ENTRIES", "32"))
_CACHE_LOCK = threading.Lock()
_CACHE: "OrderedDict[str, ConversionResult]" = OrderedDict()

_LOGGER = logging.getLogger(__name__)

# -------- ReportLab font registration (once per process) --------
# ReportLab's built-in Helvetica/Vera fonts do not cover IPA glyphs (U+0250–U+02AF).
# TinyUtils bundles DejaVu fonts under /fonts and registers them when ReportLab PDF
# rendering is used.
_REPORTLAB_FONTS_REGISTERED = False
_REPORTLAB_FONT_LOCK = threading.Lock()
_REPORTLAB_BODY_FONT = "Helvetica"
_REPORTLAB_BOLD_FONT = "Helvetica-Bold"
_REPORTLAB_MONO_FONT = "Courier"


def _ensure_reportlab_fonts_registered() -> None:
    global _REPORTLAB_FONTS_REGISTERED
    global _REPORTLAB_BODY_FONT, _REPORTLAB_BOLD_FONT, _REPORTLAB_MONO_FONT
    with _REPORTLAB_FONT_LOCK:
        if _REPORTLAB_FONTS_REGISTERED:
            return

        try:
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            fonts_dir = Path(__file__).parent.parent / "fonts"
            dejavu_sans = fonts_dir / "DejaVuSans.ttf"
            if not dejavu_sans.exists():
                _LOGGER.debug("DejaVu fonts not found at %s; using Helvetica fallback", fonts_dir)
                return

            pdfmetrics.registerFont(TTFont("DejaVuSans", str(dejavu_sans)))
            _REPORTLAB_BODY_FONT = "DejaVuSans"

            dejavu_sans_bold = fonts_dir / "DejaVuSans-Bold.ttf"
            if dejavu_sans_bold.exists():
                pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(dejavu_sans_bold)))
                _REPORTLAB_BOLD_FONT = "DejaVuSans-Bold"

            dejavu_mono = fonts_dir / "DejaVuSansMono.ttf"
            if dejavu_mono.exists():
                pdfmetrics.registerFont(TTFont("DejaVuSansMono", str(dejavu_mono)))
                _REPORTLAB_MONO_FONT = "DejaVuSansMono"

            _LOGGER.info("Registered DejaVu fonts for Unicode/IPA support")
        except Exception as exc:
            _LOGGER.warning(
                "Failed to register DejaVu fonts; using Helvetica fallback: %s",
                exc,
                exc_info=True,
            )
        finally:
            # Mark as attempted so we don't re-do I/O/registration on every request.
            _REPORTLAB_FONTS_REGISTERED = True


# Soft caps used when deciding whether a preview is likely to be truncated
# on the client. These do not affect conversion outputs – they are only used
# to populate preview metadata and telemetry.
CSV_PREVIEW_ROWS = 100
JSON_PREVIEW_NODE_LIMIT = 5000

HEADING_SIZE_THRESHOLDS: Tuple[Tuple[float, int], ...] = (
    (18.0, 1),
    (16.0, 2),
    (14.0, 3),
)
MAX_HEADING_BLOCK_LENGTH = 120

# Blank output detection thresholds for ODT→DOCX conversions
# If input is > BLANK_OUTPUT_INPUT_THRESHOLD_BYTES but output is < BLANK_OUTPUT_OUTPUT_THRESHOLD_BYTES,
# the conversion may have failed to preserve content (suspected blank output)
BLANK_OUTPUT_INPUT_THRESHOLD_BYTES = 4096  # Minimum input size to check
BLANK_OUTPUT_OUTPUT_THRESHOLD_BYTES = 1024  # Maximum output size to consider blank


def _is_preview_env() -> bool:
    """Check if running in Vercel preview environment."""
    return os.getenv("VERCEL_ENV") == "preview"


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
                    except Exception as exc:
                        _LOGGER.debug("heading_classification_error err=%s", exc)
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
                                    row = [str(c or "").replace("|", "\\|") for c in r]
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
            except Exception as exc:
                # If pdfplumber not available or errors, ignore silently
                # Log at debug level since this is an optional optimization
                _LOGGER.debug("pdfplumber_extraction_error err=%s", exc)

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

    # Minimal telemetry list used throughout the conversion pipeline.
    # Initialise this before any early analysis so that security warnings
    # like html_in_disguise_detected can safely append to it.
    logs: List[str] = [f"targets={','.join(normalized_targets)}"]
    logs.append(f"pandoc_version={pandoc_version}")

    # Early size/meta capture for previews and logging
    size_check = ensure_within_limits(len(input_bytes))
    approx_bytes = size_check["approxBytes"]
    truncated = size_check["truncated"]
    too_big_for_preview = size_check["tooBigForPreview"]

    try:
        input_text = input_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        _LOGGER.debug("input_text_decoding_error err=%s", exc)
        input_text = ""

    content_analysis = safe_parse_limited(input_text)
    html_in_disguise_detected = detect_html_in_disguise(input_text)
    if html_in_disguise_detected:
        _LOGGER.warning("html_in_disguise_detected name=%s", name)
        logs.append("security_warning=html_in_disguise_detected")

    rows, cols = detect_rows_columns(input_text)
    json_node_count = count_json_nodes(input_text)

    # Preview-level meta flags used by the UI. These are conservative
    # estimates based on the full input, not on the preview payload alone.
    has_more_rows = rows > CSV_PREVIEW_ROWS if rows is not None else False
    has_more_nodes = (
        json_node_count is not None and json_node_count > JSON_PREVIEW_NODE_LIMIT
    )

    # Perform lightweight server-side format detection BEFORE computing cache key
    # so that cache distinguishes auto→latex upgrades properly.
    adjusted_from = from_format
    try:
        sample_text = input_bytes[:4096].decode("utf-8", errors="ignore")
    except Exception as exc:
        _LOGGER.debug("sample_text_decoding_error err=%s", exc)
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
    # 1) Server-side LaTeX detection so auto/md/text inputs with TeX
    #    snippets are upgraded to the LaTeX pipeline.
    if adjusted_from in (None, "md", "markdown", "text", "auto") and (
        _looks_like_latex(sample_text) or looks_tex_name
    ):
        adjusted_from = "latex"

    # 2) Plain-text → markdown auto-formatting: when callers explicitly
    #    label input as text, treat it as markdown so the markdown
    #    pipeline (lists/headings, cleanup, dialects) can enrich it.
    #    This mirrors the UI's "Auto" path for pasted content, which
    #    already sends markdown to the server.
    if adjusted_from in ("text", "txt", "plain"):
        adjusted_from = "markdown"

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
        cached.preview = cached.preview or PreviewData()
        if cached.preview:
            cached.preview.approxBytes = approx_bytes
            cached.preview.truncated = truncated
            cached.preview.tooBigForPreview = too_big_for_preview
            cached.preview.row_count = rows
            cached.preview.col_count = cols
            cached.preview.jsonNodeCount = json_node_count
            cached.preview.hasMoreRows = has_more_rows
            cached.preview.hasMoreNodes = has_more_nodes
        return cached

    if truncated:
        logs.append("preview_truncated=1")
    if has_more_rows:
        logs.append("preview_has_more_rows=1")
    if has_more_nodes:
        logs.append("preview_has_more_nodes=1")

    # Lightweight backend telemetry for obvious content/format mismatches.
    # This is best-effort and never affects the conversion result.
    try:
        guessed_kind = None
        if content_analysis.get("is_json"):
            guessed_kind = "json"
        else:
            ca_rows = content_analysis.get("row_count")
            ca_cols = content_analysis.get("col_count")
            if isinstance(ca_rows, int) and isinstance(ca_cols, int) and ca_rows > 0 and ca_cols > 1:
                guessed_kind = "tabular"

        canonical_from = (adjusted_from or from_format or "").lower() if (adjusted_from or from_format) else ""

        if guessed_kind and canonical_from:
            if guessed_kind == "json" and canonical_from not in {"json"}:
                logs.append(f"preview_format_mismatch=content_json_from_{canonical_from}")
            elif guessed_kind == "tabular" and canonical_from not in {"csv", "tsv"}:
                logs.append(f"preview_format_mismatch=content_tabular_from_{canonical_from}")
    except Exception as exc:  # pragma: no cover - telemetry only
        _LOGGER.debug("preview_format_mismatch_telemetry_failed name=%s err=%s", name, exc)
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
            approx_bytes=approx_bytes,
            truncated=truncated,
            too_big_for_preview=too_big_for_preview,
            row_count=rows,
            col_count=cols,
            json_node_count=json_node_count,
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
                if adjusted_from == "latex":
                    logs.append("format_override=latex_detected_server")
                elif (from_format in {"text", "txt"}) and adjusted_from == "markdown":
                    logs.append("format_override=text_to_markdown_autofmt")
                else:
                    logs.append(
                        f"format_override={from_format or 'auto'}->{adjusted_from}"
                    )
                from_format = adjusted_from

            source_for_pandoc = input_path
            # CSV/TSV: neutralize spreadsheet formulas before further handling
            if input_path.suffix.lower() in {".csv", ".tsv"} or from_format in {"csv", "tsv"}:
                original_content = source_for_pandoc.read_text("utf-8")
                protected_content = protect_csv_formulas(original_content)
                source_for_pandoc.write_text(protected_content, "utf-8")
                logs.append("csv_formula_protection=applied")

            # Smart routing for DOCX/ODT: pick lightest tool that preserves features
            # Tier 1: Pandoc (fast, loses colors)
            # Tier 2: Mammoth (fast, preserves colors) - runs on Vercel
            # Tier 3: LibreOffice (full fidelity) - requires Cloud Run
            if (
                from_format in {"docx", "odt", "rtf"}
                and (opts.preserve_colors or opts.preserve_alignment or opts.use_libreoffice)
            ):
                recommended_tier = ConversionTier.PANDOC if ConversionTier else None
                features_summary = "unknown"

                # Analyze document to pick the right tier
                if smart_router is not None and from_format == "docx":
                    try:
                        tier, features = smart_router.get_recommended_tier(input_path)
                        recommended_tier = tier
                        features_summary = features.summary()
                        logs.append(f"docx_features={features_summary}")
                        logs.append(f"smart_routing_tier={tier.value}")
                    except Exception as e:
                        _LOGGER.warning(f"Smart routing analysis failed: {e}")
                        logs.append("smart_routing=analysis_failed")
                        # Default to Mammoth for safety
                        recommended_tier = ConversionTier.MAMMOTH if ConversionTier else None

                # Tier 2: Use Mammoth for colors (runs on Vercel, fast)
                if (
                    recommended_tier == ConversionTier.MAMMOTH
                    and mammoth is not None
                    and from_format == "docx"
                ):
                    try:
                        with open(input_path, 'rb') as docx_file:
                            result = mammoth.convert_to_html(docx_file)
                        html_content = result.value
                        html_path = workspace / f"{input_path.stem}_mammoth.html"
                        html_path.write_text(html_content, "utf-8")
                        source_for_pandoc = html_path
                        from_format = "html"
                        logs.append("mammoth_conversion=enabled")
                        if result.messages:
                            logs.append(f"mammoth_warnings={len(result.messages)}")
                    except Exception as exc:
                        _LOGGER.warning(f"Mammoth conversion failed: {exc}")
                        logs.append(f"mammoth_error={exc.__class__.__name__}")
                        # Fall through to LibreOffice or Pandoc

                # Tier 3: Use LibreOffice for complex features (Cloud Run)
                elif (
                    (recommended_tier == ConversionTier.LIBREOFFICE or opts.use_libreoffice)
                    and libreoffice_converter is not None
                ):
                    try:
                        if libreoffice_converter.is_libreoffice_available():
                            html_content, lo_meta = libreoffice_converter.convert_via_libreoffice(
                                input_path,
                                preserve_colors=opts.preserve_colors,
                                preserve_alignment=opts.preserve_alignment,
                            )
                            html_path = workspace / f"{input_path.stem}_libreoffice.html"
                            html_path.write_text(html_content, "utf-8")
                            source_for_pandoc = html_path
                            from_format = "html"
                            logs.append("libreoffice_preprocessing=enabled")
                            logs.append(f"libreoffice_colors_extracted={lo_meta.get('colors_extracted', 0)}")
                            logs.append(f"libreoffice_alignments_extracted={lo_meta.get('alignments_extracted', 0)}")
                        else:
                            logs.append("libreoffice_preprocessing=unavailable_fallback_to_pandoc")
                    except Exception as exc:
                        _LOGGER.warning(
                            "libreoffice preprocessing failed name=%s error=%s",
                            name,
                            exc,
                            exc_info=True,
                        )
                        logs.append(f"libreoffice_preprocessing_error={exc.__class__.__name__}")

                # Tier 1: Fall back to Pandoc (default)

            # Pre-process PDFs: layout-aware extraction with legacy fallback
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
            can_do_direct_html = from_format == "html" and all(t in ["txt", "html"] for t in normalized_targets)

            # Direct MD→PDF path: skip normalization for faithful conversion
            # When input is already markdown and we're only generating PDF, skip the
            # MD→MD normalization pipeline that escapes chars and alters formatting
            can_do_direct_md_pdf = (from_format in ["markdown", "md"]) and (normalized_targets == ["pdf"])

            if can_do_direct_html:
                logs.append("conversion_strategy=direct_html")
                # Direct HTML conversion without markdown intermediate
                outputs = _build_direct_html_artifacts(
                    source_path=source_for_pandoc,
                    targets=normalized_targets,
                    base_name=_safe_stem(safe_name),
                    logs=logs,
                )
                # Create minimal preview from HTML. This HTML is rendered
                # inside a sandboxed iframe, so we run it through a
                # lightweight sanitizer that strips scripts and obvious
                # javascript: URLs.
                html_text = source_for_pandoc.read_text("utf-8", errors="replace")
                safe_html = sanitize_html_for_preview(html_text) if html_text else None
                primary_format = normalized_targets[0] if normalized_targets else 'html'
                preview = PreviewData(
                    headings=[],
                    snippets=[html_text[:500]] if html_text else [],
                    images=[],
                    html=safe_html,
                    content=html_text[:50000] if html_text else None,
                    format=primary_format,
                    approxBytes=approx_bytes,
                    truncated=truncated,
                    tooBigForPreview=too_big_for_preview,
                    row_count=rows,
                    col_count=cols,
                    jsonNodeCount=json_node_count,
                    hasMoreRows=has_more_rows,
                    hasMoreNodes=has_more_nodes,
                )
                before_text = html_text
                cleaned_text = html_text
            elif can_do_direct_md_pdf:
                logs.append("conversion_strategy=direct_md_pdf")
                # Direct MD→PDF: Skip normalization for faithful conversion
                # Read the source markdown as-is without pandoc MD→MD processing
                source_text = source_for_pandoc.read_text("utf-8", errors="replace")

                # Generate PDF directly from source markdown
                pdf_data = _render_pdf_via_reportlab(
                    source_for_pandoc,
                    logs=logs,
                    options=opts,
                )

                outputs = [
                    TargetArtifact(
                        target="pdf",
                        name=f"{_safe_stem(safe_name)}.pdf",
                        content_type=TARGET_CONTENT_TYPES["pdf"],
                        data=pdf_data,
                    )
                ]

                # Minimal preview for direct MD→PDF path
                preview = PreviewData(
                    headings=collect_headings(source_text),
                    snippets=[source_text[:280]],
                    images=[],
                    html=None,
                    content=source_text[:50000],
                    format="pdf",
                    approxBytes=approx_bytes,
                    truncated=truncated,
                    tooBigForPreview=too_big_for_preview,
                    row_count=rows,
                    col_count=cols,
                    jsonNodeCount=json_node_count,
                    hasMoreRows=has_more_rows,
                    hasMoreNodes=has_more_nodes,
                )
                before_text = source_text
                cleaned_text = source_text
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
                        html_text = sanitize_html_for_pandoc(html_text)
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

                # Phase 5 backend polish: page-break markers and comments extraction
                # Both are DOCX-only opt-in features controlled by ConversionOptions
                if from_format == "docx":
                    # Insert page-break markers if requested
                    if opts.insert_page_break_markers:
                        try:
                            pb_indices = page_break_marker.find_page_break_paragraph_indices(input_path)
                            if pb_indices:
                                # Simple heuristic: map paragraph index to markdown line
                                # This assumes rough 1:1 mapping; more sophisticated mapping
                                # would require AST analysis which is out of scope
                                line_indices = pb_indices  # Direct mapping heuristic
                                cleaned_text = page_break_marker.add_page_break_markers(
                                    cleaned_text, line_indices
                                )
                                logs.append(f"page_breaks_inserted={len(pb_indices)}")
                        except Exception as exc:
                            logs.append(f"page_break_marker_error={exc.__class__.__name__}")

                    # Extract and append comments if requested
                    if opts.extract_comments:
                        try:
                            cleaned_text = comments_extractor.append_comments_to_markdown(
                                cleaned_text, input_path
                            )
                            logs.append("comments_extracted=1")
                        except Exception as exc:
                            logs.append(f"comments_extraction_error={exc.__class__.__name__}")

                cleaned_md.write_text(cleaned_text, "utf-8")
                logs.append(f"cleanup_stats={json.dumps(stats.__dict__, sort_keys=True)}")

                # Stage size telemetry for markdown-based pipeline.
                try:
                    raw_md_bytes = len(before_text.encode("utf-8"))
                    filtered_md_bytes = len(filtered_text.encode("utf-8"))
                    cleaned_md_bytes = len(cleaned_text.encode("utf-8"))

                    logs.append(f"stage_raw_md_bytes={raw_md_bytes}")
                    logs.append(f"stage_filtered_md_bytes={filtered_md_bytes}")
                    logs.append(f"stage_cleaned_md_bytes={cleaned_md_bytes}")

                    # Passive content-loss guard for markdown outputs produced
                    # from rich document sources. If the cleaned markdown is
                    # implausibly small compared to the original input size,
                    # emit a suspected_blank_output tag for diagnostics only.
                    if (
                        from_format in {"odt", "docx", "rtf", "html"}
                        and approx_bytes
                        and approx_bytes > BLANK_OUTPUT_INPUT_THRESHOLD_BYTES
                        # Treat markdown as suspicious only when it is both
                        # absolutely tiny and less than ~5% of the original
                        # input size. This keeps the guard sensitive for
                        # truly blank/near-blank outputs while avoiding
                        # false positives for compact but valid documents.
                        and cleaned_md_bytes < max(512, int(approx_bytes * 0.05))
                    ):
                        logs.append("suspected_blank_output=md")
                except Exception:
                    # Best-effort only; never interfere with conversions.
                    pass

                outputs = _build_target_artifacts(
                    targets=normalized_targets,
                    cleaned_path=cleaned_md,
                    cleaned_text=cleaned_text,
                    base_name=_safe_stem(safe_name),
                    md_dialect=getattr(opts, "md_dialect", None),
                    logs=logs,
                    options=opts,
                    original_path=input_path,
                    original_from_format=from_format,
                )

                # DOCX stage size + suspected-blank guard for ODT/DOCX/HTML
                # inputs. This is telemetry-only and must never affect
                # behaviour: it helps detect regressions where a large rich
                # document produces a suspiciously small DOCX file.
                try:
                    for art in outputs:
                        if art.target == "docx":
                            docx_bytes = len(art.data or b"")
                            logs.append(f"stage_docx_bytes={docx_bytes}")
                            if (
                                from_format in {"odt", "docx", "html"}
                                and approx_bytes
                                and approx_bytes > BLANK_OUTPUT_INPUT_THRESHOLD_BYTES
                                and docx_bytes < BLANK_OUTPUT_OUTPUT_THRESHOLD_BYTES
                            ):
                                logs.append("suspected_blank_output=docx")
                            # For DOCX roundtrips, also log a coarse size
                            # ratio so tests/diagnostics can spot
                            # disproportionate changes even when the output
                            # is above the absolute tiny threshold.
                            if approx_bytes and from_format == "docx":
                                try:
                                    ratio = docx_bytes / float(approx_bytes)
                                    logs.append(
                                        f"docx_roundtrip_ratio={ratio:.3f}"
                                    )
                                except Exception:
                                    # Telemetry only.
                                    pass
                            break
                except Exception:
                    # Telemetry only; do not affect conversion.
                    pass

                # Build a simple HTML preview from cleaned markdown (standalone off)
                preview_html = None
                try:
                    pypandoc = _get_pypandoc()
                    preview_html = pypandoc.convert_text(
                        cleaned_text,
                        to="html5",
                        format="gfm",
                        extra_args=["--standalone", "--quiet"]
                    )
                except Exception as exc:
                    logs.append(f"preview_html_error={exc.__class__.__name__}")

                if preview_html:
                    preview_html = sanitize_html_for_preview(preview_html)

                # Determine primary format for preview
                primary_format = normalized_targets[0] if normalized_targets else 'md'

                preview = PreviewData(
                    headings=collect_headings(cleaned_text),
                    snippets=build_snippets(before_text, cleaned_text),
                    images=media_manifest(extract_dir),
                    html=preview_html,
                    content=cleaned_text[:50000] if cleaned_text else None,  # First 50KB for client-side rendering
                    format=primary_format,
                    approxBytes=approx_bytes,
                    truncated=truncated,
                    tooBigForPreview=too_big_for_preview,
                    row_count=rows,
                    col_count=cols,
                    jsonNodeCount=json_node_count,
                    hasMoreRows=has_more_rows,
                    hasMoreNodes=has_more_nodes,
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
            approx_bytes=approx_bytes,
            truncated=truncated,
            too_big_for_preview=too_big_for_preview,
            row_count=rows,
            col_count=cols,
            json_node_count=json_node_count,
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
            preview=PreviewData(
                approxBytes=approx_bytes,
                truncated=truncated,
                tooBigForPreview=too_big_for_preview,
                row_count=rows,
                col_count=cols,
                jsonNodeCount=json_node_count,
                hasMoreRows=has_more_rows,
                hasMoreNodes=has_more_nodes,
            ),
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
    options: Optional[ConversionOptions] = None,
    original_path: Optional[Path] = None,
    original_from_format: Optional[str] = None,
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
            # Prefer direct conversion from rich sources for higher fidelity.
            direct_rich_sources = {"odt", "docx", "rtf", "epub", "html"}
            if (
                target in {"docx", "odt"}
                and original_path is not None
                and original_from_format in direct_rich_sources
            ):
                try:
                    pypandoc = _get_pypandoc()
                    output_path = cleaned_path.parent / f"{base_name}.{TARGET_EXTENSIONS[target]}"
                    pypandoc.convert_file(
                        str(original_path),
                        to=target,
                        format=original_from_format,
                        outputfile=str(output_path),
                        extra_args=["--wrap=none"],
                    )
                    data = output_path.read_bytes()
                    if logs is not None:
                        logs.append(f"{target}_strategy=direct_from_source")
                except Exception as exc:  # pragma: no cover - fall back
                    if logs is not None:
                        logs.append(f"{target}_direct_error={exc.__class__.__name__}")
                    data = _render_markdown_target(
                        cleaned_path,
                        target,
                        logs=logs,
                        options=options,
                    )
            else:
                data = _render_markdown_target(cleaned_path, target, logs=logs, options=options)
        artifacts.append(
            TargetArtifact(
                target=target,
                name=f"{base_name}.{TARGET_EXTENSIONS[target]}",
                content_type=TARGET_CONTENT_TYPES[target],
                data=data,
            )
        )
    return artifacts


def _fallback_conversion(
    *,
    name: str,
    input_bytes: bytes,
    targets: Sequence[str],
    logs: List[str],
    approx_bytes: Optional[int] = None,
    truncated: Optional[bool] = None,
    too_big_for_preview: Optional[bool] = None,
    row_count: Optional[int] = None,
    col_count: Optional[int] = None,
    json_node_count: Optional[int] = None,
) -> ConversionResult:
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
    preview = PreviewData(
        headings=[],
        snippets=[text[:280]],
        images=[],
        html=None,
        approxBytes=approx_bytes,
        truncated=truncated,
        tooBigForPreview=too_big_for_preview,
        row_count=row_count,
        col_count=col_count,
        jsonNodeCount=json_node_count,
        hasMoreRows=False,
        hasMoreNodes=False,
    )
    return ConversionResult(
        name=name,
        outputs=artifacts,
        preview=preview,
        media=None,
        logs=[*logs, "fallback=1"],
    )


def _render_markdown_target(
    cleaned_path: Path,
    target: str,
    *,
    logs: Optional[List[str]] = None,
    options: Optional[ConversionOptions] = None,
) -> bytes:
    pypandoc = _get_pypandoc()

    if target == "pdf":
        # PDF requires special handling - prefer external renderer when configured.
        return _render_pdf_via_reportlab(cleaned_path, logs=logs, options=options)
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
    elif target == "epub":
        # EPUB output via pandoc (binary zip)
        output_path = cleaned_path.parent / f"{cleaned_path.stem}.epub"
        pypandoc.convert_file(
            str(cleaned_path),
            to="epub",
            format="gfm",
            outputfile=str(output_path),
            extra_args=["--wrap=none"],
        )
        return output_path.read_bytes()
    else:
        # Standard text-based outputs (html, txt, md, latex, etc.)
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


def _render_pdf_via_reportlab(
    markdown_path: Path,
    *,
    logs: Optional[List[str]] = None,
    options: Optional[ConversionOptions] = None,
) -> bytes:
    """Convert markdown to PDF using external renderer, then a pure-Python ReportLab fallback.

    Strategy: Convert markdown → HTML (via pandoc) → PDF (via external renderer if available).
    If the external renderer is absent or fails, fall back to a minimal ReportLab paragraph
    renderer that avoids native dependencies (no cairo/pycairo), keeping preview builds slim.
    """
    try:
        # First, convert markdown to HTML using pandoc (which we know works)
        pypandoc = _get_pypandoc()
        html_content = pypandoc.convert_file(
            str(markdown_path),
            to="html5",
            format="gfm",
            extra_args=["--standalone", "--self-contained"],
        )

        # Also produce a plain-text rendering we can use in the local fallback so we
        # never return raw Markdown markup in the PDF if the external renderer fails.
        plain_text = pypandoc.convert_file(
            str(markdown_path),
            to="plain",
            format="gfm",
            extra_args=["--wrap=none", "--columns=1000"],
        )

        # Add basic CSS for better formatting
        html_with_style = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset=\"utf-8\">
            <style>
                body {{ font-family: "Liberation Sans", "DejaVu Sans", "Noto Sans", Arial, Helvetica, sans-serif; margin: 40px; }}
                h1 {{ font-size: 24px; margin-top: 20px; }}
                h2 {{ font-size: 20px; margin-top: 16px; }}
                h3 {{ font-size: 16px; margin-top: 12px; }}
                p {{ line-height: 1.6; }}
                code {{ background-color: #f4f4f4; padding: 2px 4px; font-family: "Liberation Mono", "DejaVu Sans Mono", "Noto Sans Mono", Consolas, monospace; }}
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
                    request_id,
                )
                _LOGGER.info(
                    "PDF rendered via external Chromium: engine=%s version=%s",
                    meta.get("pdfEngine"),
                    meta.get("pdfEngineVersion"),
                )
                if logs is not None:
                    engine = meta.get("pdfEngine") or "external"
                    version = meta.get("pdfEngineVersion") or "unknown"
                    # Use format that app.py can parse: "pdf_engine=<value> pdf_engine_version=<value>"
                    logs.append(f"pdf_engine={engine}")
                    if version:
                        logs.append(f"pdf_engine_version={version}")
                return pdf_bytes
            except RemotePdfError as exc:
                # External renderer failed - log warning and fall back to local renderer
                _LOGGER.warning(
                    "External PDF renderer failed (code=%s message=%s), falling back to reportlab",
                    exc.code,
                    exc.message,
                )
                if logs is not None:
                    logs.append(f"pdf_external_fallback={exc.code}:{exc.message}")
                # Fall through to ReportLab fallback below

        # ReportLab fallback (pure Python, no native cairo deps)
        try:
            import io

            from reportlab.lib.pagesizes import LETTER
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import inch
            from reportlab.platypus import (
                Paragraph,
                Preformatted,
                SimpleDocTemplate,
                Spacer,
                ListFlowable,
                ListItem,
                KeepTogether,
                Flowable,
                Table,
                TableStyle,
            )
            from reportlab.lib import colors
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            # Register DejaVu Sans fonts for full Unicode/IPA support
            # The fonts are bundled in the project's fonts/ directory
            _fonts_registered = False
            try:
                fonts_dir = Path(__file__).parent.parent / "fonts"
                dejavu_sans = fonts_dir / "DejaVuSans.ttf"
                dejavu_sans_bold = fonts_dir / "DejaVuSans-Bold.ttf"
                dejavu_mono = fonts_dir / "DejaVuSansMono.ttf"

                if dejavu_sans.exists():
                    pdfmetrics.registerFont(TTFont("DejaVuSans", str(dejavu_sans)))
                if dejavu_sans_bold.exists():
                    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(dejavu_sans_bold)))
                if dejavu_mono.exists():
                    pdfmetrics.registerFont(TTFont("DejaVuSansMono", str(dejavu_mono)))
                _fonts_registered = True
                _LOGGER.info("Registered DejaVu fonts for Unicode/IPA support")
            except Exception as e:
                _LOGGER.warning("Failed to register DejaVu fonts, falling back to Helvetica: %s", e)

            # Determine which fonts to use (DejaVu if available, else Helvetica)
            _BODY_FONT = "DejaVuSans" if _fonts_registered else "Helvetica"
            _BOLD_FONT = "DejaVuSans-Bold" if _fonts_registered else "Helvetica-Bold"
            _MONO_FONT = "DejaVuSansMono" if _fonts_registered else "Courier"

            _ensure_reportlab_fonts_registered()
            _BODY_FONT = _REPORTLAB_BODY_FONT
            _BOLD_FONT = _REPORTLAB_BOLD_FONT
            _MONO_FONT = _REPORTLAB_MONO_FONT

            class HorizontalLine(Flowable):
                """Draws a horizontal line separator"""
                def __init__(self, width_percent=100, thickness=0.5, space_before=4, space_after=4):
                    Flowable.__init__(self)
                    self.width_percent = width_percent
                    self.thickness = thickness
                    self.space_before = space_before
                    self.space_after = space_after

                def wrap(self, availWidth, availHeight):
                    self.width = availWidth * (self.width_percent / 100.0)
                    self.height = self.thickness + self.space_before + self.space_after
                    return (self.width, self.height)

                def draw(self):
                    self.canv.setLineWidth(self.thickness)
                    self.canv.setStrokeColorRGB(0.5, 0.5, 0.5)
                    y = self.space_after
                    self.canv.line(0, y, self.width, y)

            def _inline_markdown_to_html(text: str) -> str:
                # Minimal inline markdown → HTML for Paragraph (supports <b>/<i>/<code>) while
                # avoiding interference between code spans and emphasis markers.

                # Strip control characters (especially 0x7F DEL) that cause rendering artifacts
                text = text.replace('\x7f', '')

                code_spans: list[str] = []

                def _store_code(match: re.Match[str]) -> str:
                    code_spans.append(html.escape(match.group(1), quote=False))
                    # Use null bytes as delimiters to avoid collision with markdown emphasis patterns
                    # The previous __CODE_SPAN_X__ was being matched by the __...__  bold regex
                    return f"\x00CS{len(code_spans) - 1}\x00"

                # Protect inline code first
                text = re.sub(r"`([^`]+)`", _store_code, text)
                escaped = html.escape(text, quote=False)

                # Unescape markdown escape sequences (pandoc adds these during MD→MD normalization)
                # This fixes the issue where `__________` becomes `\__________` and renders as backslashes
                escaped = re.sub(r'\\([_*\[\](){}#+\-.!`|\\])', r'\1', escaped)

                # Bold / italic on the escaped text (avoid mid-word underscore matches)
                # IMPORTANT: Only match emphasis when content isn't ALL underscores/asterisks
                # This prevents `__________` (fill-in blanks) from being treated as bold markup

                # Handle bold+italic FIRST (triple asterisks/underscores) to avoid nesting issues
                # ***text*** and ___text___ should become <b><i>text</i></b> with proper nesting
                escaped = re.sub(r"\*\*\*(?![\*_\s]+\*\*\*)(.+?)(?<![\*_\s])\*\*\*", r"<b><i>\1</i></b>", escaped)
                escaped = re.sub(r"___(?![_*\s]+___)(.+?)(?<![_*\s])___", r"<b><i>\1</i></b>", escaped)

                # Then handle bold (double asterisks/underscores)
                escaped = re.sub(r"\*\*(?![\*_\s]+\*\*)(.+?)(?<![\*_\s])\*\*", r"<b>\1</b>", escaped)
                escaped = re.sub(r"__(?![_*\s]+__)(.+?)(?<![_*\s])__", r"<b>\1</b>", escaped)

                # Italic with single asterisk/underscore - improved to handle *(Answer:) 1 __________* patterns
                # Use callback to skip when content is ONLY underscores/spaces/asterisks (fill-in blanks)
                def _italic_asterisk(match: re.Match[str]) -> str:
                    content = match.group(1)
                    # Don't convert if content is only underscores, spaces, or asterisks
                    if re.match(r'^[_\s*]+$', content):
                        return match.group(0)
                    return f"<i>{content}</i>"

                escaped = re.sub(r'(?<!\w)\*([^\*\n]+?)\*(?!\w)', _italic_asterisk, escaped)
                escaped = re.sub(r'(?<!\w)_([^_\n]+?)_(?!\w)', _italic_asterisk, escaped)

                # Convert markdown images ![alt](url) to placeholder text
                # ReportLab can't render remote images inline, so show descriptive text
                def _convert_image(match: re.Match[str]) -> str:
                    alt = match.group(1)
                    return f'<i>[Image: {alt}]</i>' if alt else '<i>[Image]</i>'

                escaped = re.sub(r'!\[([^\]]*)\]\([^)]+\)', _convert_image, escaped)

                # Convert markdown links [text](url) to HTML anchors
                # Also handle [text](url "title") format
                def _convert_link(match: re.Match[str]) -> str:
                    text = match.group(1)
                    url = match.group(2)
                    # Skip internal anchor links (ReportLab can't handle #fragment URLs)
                    if url.startswith('#'):
                        return text  # Just show the text without link
                    # Security: Only allow safe URL schemes (prevent javascript:, data:, etc.)
                    url_lower = url.lower().strip()
                    if not (url_lower.startswith('http://') or url_lower.startswith('https://') or url_lower.startswith('mailto:')):
                        return text  # Show text without link for unsafe schemes
                    # Security: Escape URL to prevent XSS via attribute injection
                    safe_url = html.escape(url, quote=True)
                    # ReportLab uses <a> tags with color attribute for styling
                    return f'<a href="{safe_url}" color="blue">{text}</a>'

                escaped = re.sub(r'\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)', _convert_link, escaped)

                # Convert bare URLs to clickable links (http://, https://)
                # Security: Limit URL length to prevent ReDoS attacks (max 2000 chars)
                def _convert_bare_url(match: re.Match[str]) -> str:
                    url = match.group(1)
                    if len(url) > 2000:
                        return url  # Too long, don't linkify
                    safe_url = html.escape(url, quote=True)
                    return f'<a href="{safe_url}" color="blue">{safe_url}</a>'

                escaped = re.sub(
                    r'(?<!["\'>])(https?://[^\s<>\[\]]{1,2000})',
                    _convert_bare_url,
                    escaped
                )

                def _restore_code(match: re.Match[str]) -> str:
                    idx = int(match.group(1))
                    # Bounds check to prevent IndexError on malformed input
                    if 0 <= idx < len(code_spans):
                        return f"<font face='{_MONO_FONT}'>{code_spans[idx]}</font>"
                    return match.group(0)  # Return original if invalid index

                # Restore code spans using the null-byte delimited placeholders
                escaped = re.sub(r"\x00CS(\d+)\x00", _restore_code, escaped)
                return escaped.replace("<br>", "<br/>")

            def _parse_markdown_to_flowables(md: str):
                # Sanitize control characters at the top level (especially 0x7F DEL)
                md = md.replace('\x7f', '')

                lines = md.splitlines()
                story_local = []
                styles = getSampleStyleSheet()
                base = styles["Normal"]
                base.fontName = _BODY_FONT  # Use DejaVu for Unicode/IPA support
                base.leading = 14
                base.spaceAfter = 4
                base.keepTogether = True
                body_style = ParagraphStyle(name="TUBody", parent=base, fontName=_BODY_FONT)
                h1_style = ParagraphStyle(
                    name="TUHeading1",
                    parent=base,
                    fontSize=18,
                    leading=22,
                    spaceAfter=4,
                    spaceBefore=8,
                    keepWithNext=True,
                )
                h2_style = ParagraphStyle(
                    name="TUHeading2",
                    parent=base,
                    fontSize=16,
                    leading=20,
                    spaceAfter=3,
                    spaceBefore=6,
                    keepWithNext=True,
                )
                h3_style = ParagraphStyle(
                    name="TUHeading3",
                    parent=base,
                    fontSize=14,
                    leading=18,
                    spaceAfter=2,
                    spaceBefore=4,
                    keepWithNext=True,
                )
                h4_style = ParagraphStyle(
                    name="TUHeading4",
                    parent=base,
                    fontSize=12,
                    leading=16,
                    spaceAfter=2,
                    spaceBefore=3,
                    keepWithNext=True,
                    fontName=_BOLD_FONT,
                )
                h5_style = ParagraphStyle(
                    name="TUHeading5",
                    parent=base,
                    fontSize=11,
                    leading=14,
                    spaceAfter=1,
                    spaceBefore=2,
                    keepWithNext=True,
                    fontName=_BOLD_FONT,
                )
                h6_style = ParagraphStyle(
                    name="TUHeading6",
                    parent=base,
                    fontSize=10,
                    leading=13,
                    spaceAfter=1,
                    spaceBefore=2,
                    keepWithNext=True,
                    fontName=_BOLD_FONT,
                    textColor="#666666",
                )
                code_style = ParagraphStyle(
                    name="TUCode",
                    parent=base,
                    fontName=_MONO_FONT,
                    fontSize=9,
                    leading=11,
                    backColor="#f4f4f4",
                    leftIndent=8,
                    rightIndent=8,
                    spaceAfter=10,
                    spaceBefore=10,
                    keepTogether=True,
                )
                blockquote_style = ParagraphStyle(
                    name="TUBlockquote",
                    parent=base,
                    leftIndent=20,
                    rightIndent=10,
                    fontSize=11,
                    textColor="#333333",
                    spaceAfter=6,
                    spaceBefore=6,
                )

                buf: list[str] = []
                in_code = False
                list_buf: list[str] = []
                blockquote_buf: list[str] = []
                table_buf: list[list[str]] = []  # Buffer for collecting table rows
                in_table = False

                def is_table_separator(line: str) -> bool:
                    """Check if line is a markdown table separator (e.g., |---|---|)"""
                    stripped = line.strip()
                    # Must contain pipe and dashes
                    if '|' not in stripped or '-' not in stripped:
                        return False
                    # Remove pipes and check if remaining is mostly dashes, colons, spaces
                    cells = stripped.split('|')
                    for cell in cells:
                        cell = cell.strip()
                        if cell and not all(c in '-: ' for c in cell):
                            return False
                    return True

                def parse_table_row(line: str) -> list[str]:
                    """Parse a pipe-separated table row into cells"""
                    stripped = line.strip()
                    # Remove leading/trailing pipes if present
                    if stripped.startswith('|'):
                        stripped = stripped[1:]
                    if stripped.endswith('|'):
                        stripped = stripped[:-1]
                    # Split by pipe and clean each cell
                    return [cell.strip() for cell in stripped.split('|')]

                def flush_table():
                    """Convert accumulated table rows into a ReportLab Table flowable"""
                    nonlocal table_buf, in_table
                    if not table_buf:
                        in_table = False
                        return

                    # Build table data with Paragraph cells for text formatting
                    table_cell_style = ParagraphStyle(
                        name="TUTableCell",
                        parent=body_style,
                        fontSize=10,
                        leading=12,
                        spaceAfter=0,
                        spaceBefore=0,
                    )
                    table_header_style = ParagraphStyle(
                        name="TUTableHeader",
                        parent=body_style,
                        fontSize=10,
                        leading=12,
                        fontName=_BOLD_FONT,
                        spaceAfter=0,
                        spaceBefore=0,
                    )

                    # Determine column count from the widest row
                    # Handle empty or all-empty-row tables gracefully
                    if not table_buf or not any(table_buf):
                        in_table = False
                        table_buf = []
                        return
                    col_count = max(len(row) for row in table_buf)
                    if col_count == 0:
                        in_table = False
                        table_buf = []
                        return

                    # Limit columns to fit page width (letter size minus margins)
                    # Available width ~6.5 inches, min 0.4" per column for readability
                    max_cols = 16  # 6.5" / 0.4" ≈ 16 columns max
                    if col_count > max_cols:
                        # Log warning about table truncation (logs from outer scope)
                        if logs is not None:
                            logs.append(f"table_truncated={col_count}→{max_cols}")
                        col_count = max_cols  # Truncate extra columns

                    # Normalize all rows to same column count
                    normalized_rows = []
                    for i, row in enumerate(table_buf):
                        while len(row) < col_count:
                            row.append("")
                        # First row is header, use bold style
                        style = table_header_style if i == 0 else table_cell_style
                        normalized_rows.append([
                            Paragraph(_inline_markdown_to_html(cell), style) for cell in row[:col_count]
                        ])

                    # Calculate column widths to fit page
                    available_width = 6.5 * inch
                    col_width = available_width / col_count

                    # Create ReportLab Table with explicit column widths
                    tbl = Table(normalized_rows, repeatRows=1, colWidths=[col_width] * col_count)

                    # Style the table
                    style_commands = [
                        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),  # Header bg
                        ('FONTNAME', (0, 0), (-1, 0), _BOLD_FONT),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.7, 0.7, 0.7)),
                        ('TOPPADDING', (0, 0), (-1, -1), 4),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ]
                    tbl.setStyle(TableStyle(style_commands))

                    story_local.append(Spacer(1, 0.1 * inch))
                    story_local.append(tbl)
                    story_local.append(Spacer(1, 0.1 * inch))

                    table_buf = []
                    in_table = False

                def flush_para():
                    nonlocal buf
                    if not buf:
                        return
                    paragraph = " ".join(buf).strip()
                    if paragraph:
                        story_local.append(
                            KeepTogether(
                                [Paragraph(_inline_markdown_to_html(paragraph), body_style), Spacer(1, 0.06 * inch)]
                            )
                        )
                    buf = []

                def flush_list():
                    nonlocal list_buf
                    if not list_buf:
                        return
                    items = [ListItem(Paragraph(_inline_markdown_to_html(it), body_style)) for it in list_buf]
                    story_local.append(
                        KeepTogether([ListFlowable(items, bulletType="bullet"), Spacer(1, 0.06 * inch)])
                    )
                    list_buf = []

                def flush_blockquote():
                    nonlocal blockquote_buf
                    if not blockquote_buf:
                        return
                    blockquote_text = " ".join(blockquote_buf).strip()
                    if blockquote_text:
                        story_local.append(Paragraph(_inline_markdown_to_html(blockquote_text), blockquote_style))
                    blockquote_buf = []

                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith("```"):
                        if in_code:
                            # end code block
                            story_local.append(
                                KeepTogether([Preformatted("\n".join(buf), code_style), Spacer(1, 0.06 * inch)])
                            )
                            buf = []
                            in_code = False
                        else:
                            flush_para()
                            flush_list()
                            in_code = True
                            buf = []
                        continue
                    if in_code:
                        buf.append(line)
                        continue

                    # HTML comments (skip them)
                    if stripped.startswith("<!--") and stripped.endswith("-->"):
                        continue

                    # Blockquotes - accumulate into buffer for proper formatting
                    if stripped.startswith("> "):
                        flush_para(); flush_list(); flush_table()  # Close any open para/list/table first
                        blockquote_buf.append(stripped[2:].strip())
                        continue
                    elif stripped.startswith(">") and stripped != ">":
                        flush_para(); flush_list(); flush_table()
                        blockquote_buf.append(stripped[1:].strip())
                        continue

                    # Table detection - lines with pipe characters
                    if '|' in stripped:
                        # Check if this is a table separator line (skip it but stay in table mode)
                        if is_table_separator(stripped):
                            # If we have a header row collected, this confirms we're in a table
                            if table_buf:
                                in_table = True
                            continue

                        # This is a data row - parse it
                        row = parse_table_row(stripped)
                        if row and any(cell.strip() for cell in row):  # At least one non-empty cell
                            flush_para(); flush_list(); flush_blockquote()
                            table_buf.append(row)
                            in_table = True
                            continue

                    # If we were in a table but hit a non-table line, flush the table
                    if in_table:
                        flush_table()

                    # Horizontal rules (---, ***, ___)
                    if stripped in ("---", "***", "___") or (len(stripped) >= 3 and all(c == '-' for c in stripped)):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(HorizontalLine())
                        continue

                    # Headings - check from most hashes to least (H6→H1) to avoid prefix matches
                    if stripped.startswith("###### "):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(Paragraph(_inline_markdown_to_html(stripped[7:]), h6_style))
                        continue
                    if stripped.startswith("##### "):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(Paragraph(_inline_markdown_to_html(stripped[6:]), h5_style))
                        continue
                    if stripped.startswith("#### "):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(Paragraph(_inline_markdown_to_html(stripped[5:]), h4_style))
                        continue
                    if stripped.startswith("### "):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(Paragraph(_inline_markdown_to_html(stripped[4:]), h3_style))
                        continue
                    if stripped.startswith("## "):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(Paragraph(_inline_markdown_to_html(stripped[3:]), h2_style))
                        continue
                    if stripped.startswith("# "):
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        story_local.append(Paragraph(_inline_markdown_to_html(stripped[2:]), h1_style))
                        continue

                    # Lists
                    if stripped.startswith(('- ', '* ')):
                        buf_par = " ".join(buf).strip()
                        if buf_par:
                            story_local.append(
                                KeepTogether([Paragraph(_inline_markdown_to_html(buf_par), body_style), Spacer(1, 0.12 * inch)])
                            )
                        buf = []
                        list_buf.append(stripped[2:].strip())
                        continue

                    if not stripped:
                        flush_para(); flush_list(); flush_blockquote(); flush_table()
                        continue

                    buf.append(stripped)

                flush_para(); flush_list(); flush_blockquote(); flush_table()
                return story_local

            # Page size selection (ReportLab fallback only). Default is LETTER; allow a
            # simple A4 override via ConversionOptions.pdf_page_size.
            pagesize = LETTER
            if options is not None and isinstance(options.pdf_page_size, str):
                size = options.pdf_page_size.strip().lower()
                if size == "a4":
                    from reportlab.lib.pagesizes import A4

                    pagesize = A4

            # Margin presets for ReportLab fallback. Use reasonable defaults similar to
            # standard document margins (1 inch top/bottom, 0.75 inch left/right).
            left_margin = 0.75 * inch
            right_margin = 0.75 * inch
            top_margin = 0.75 * inch
            bottom_margin = 0.5 * inch
            preset = None
            if options is not None and isinstance(options.pdf_margin_preset, str):
                preset = options.pdf_margin_preset.strip().lower()
                if preset == "compact":
                    left_margin = right_margin = 0.4 * inch
                    top_margin = bottom_margin = 0.8 * inch
                elif preset == "wide":
                    left_margin = right_margin = 1.0 * inch
                    top_margin = bottom_margin = 1.5 * inch

            pdf_buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                pdf_buffer,
                pagesize=pagesize,
                leftMargin=left_margin,
                rightMargin=right_margin,
                topMargin=top_margin,
                bottomMargin=bottom_margin,
            )
            story = _parse_markdown_to_flowables(markdown_path.read_text("utf-8", errors="ignore"))
            if not story:
                story = [Paragraph("(empty document)", getSampleStyleSheet()["Normal"])]
            doc.build(story)
            if logs is not None:
                logs.append("pdf_engine=reportlab")
                if preset:
                    logs.append(f"pdf_margin_preset={preset}")
            return pdf_buffer.getvalue()
        except Exception as rl_exc:
            _LOGGER.error("reportlab fallback failed: %s", rl_exc)
            if logs is not None:
                logs.append(
                    f"pdf_engine_fallback_error=reportlab:{rl_exc.__class__.__name__}"
                )
            raise RuntimeError(
                f"PDF generation failed with reportlab fallback: {rl_exc}"
            ) from rl_exc

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
    # Include LibreOffice options in cache key
    hasher.update(str(options.use_libreoffice).encode("ascii"))
    hasher.update(str(options.preserve_colors).encode("ascii"))
    hasher.update(str(options.preserve_alignment).encode("ascii"))
    # Phase 5 backend polish: page-break markers and comments
    hasher.update(str(options.insert_page_break_markers).encode("ascii"))
    hasher.update(str(options.extract_comments).encode("ascii"))
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
            html=result.preview.html,
            content=result.preview.content,
            format=result.preview.format,
            approxBytes=result.preview.approxBytes,
            row_count=result.preview.row_count,
            col_count=result.preview.col_count,
            jsonNodeCount=result.preview.jsonNodeCount,
            truncated=result.preview.truncated,
            tooBigForPreview=result.preview.tooBigForPreview,
            hasMoreRows=result.preview.hasMoreRows,
            hasMoreNodes=result.preview.hasMoreNodes,
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
