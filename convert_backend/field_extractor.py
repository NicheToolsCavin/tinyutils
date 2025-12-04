"""Word field extraction helpers using python-docx.

These helpers scan a DOCX file for field codes (PAGE, DATE, TOC, etc.)
and return a structured list describing each distinct field. They are
designed for future integration with higher-level pipelines and do not
modify documents or markdown themselves.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from zipfile import ZipFile

from docx import Document
from docx.text.paragraph import Paragraph


def extract_fields_from_docx(docx_path: Path) -> List[Dict[str, Any]]:
    """Extract all fields from a DOCX document.

    This uses two strategies:

    1. Walk paragraphs via ``python-docx`` and look for ``w:instrText``
       nodes that contain field codes.
    2. If none are found (common for some authoring patterns), fall back
       to a light-weight XML scan of ``word/document.xml`` looking for
       common field keywords (PAGE, DATE, TOC, HYPERLINK, SEQ) and
       synthesise summary entries.
    """

    doc = Document(docx_path)
    fields: List[Dict[str, Any]] = []
    for paragraph in doc.paragraphs:
        fields.extend(_extract_fields_from_paragraph(paragraph))

    if fields:
        return fields

    # Fallback: inspect the raw document XML for common field keywords.
    try:
        with ZipFile(docx_path) as zf:
            xml = ""
            for name in zf.namelist():
                if name.endswith("document.xml"):
                    xml = zf.read(name).decode("utf-8", errors="ignore")
                    break
    except Exception:
        xml = ""

    if not xml:
        return fields

    for token in ["PAGE", "DATE", "TOC", "HYPERLINK", "SEQ"]:
        if f"{token} " in xml:
            fields.append({"type": token, "code": token, "switches": []})
    return fields


def _extract_fields_from_paragraph(paragraph: Paragraph) -> List[Dict[str, Any]]:
    """Extract field codes from a single paragraph.

    Field codes appear as ``w:instrText`` elements in the underlying
    XML. Each code is parsed into a ``{"type", "code", "switches"}``
    mapping when possible.
    """

    fields: List[Dict[str, Any]] = []
    for elem in paragraph._element.iter():  # type: ignore[attr-defined]
        if elem.tag.endswith("instrText"):
            raw = elem.text or ""
            info = _parse_field_code(raw)
            if info is not None:
                fields.append(info)
    return fields


def _parse_field_code(field_code: str) -> Optional[Dict[str, Any]]:
    """Parse a raw field code string into a structured mapping.

    Examples
    --------
    ``" PAGE  \\* MERGEFORMAT"`` → ``{"type": "PAGE", "code": ..., "switches": [...]}``
    """

    code = (field_code or "").strip()
    if not code:
        return None

    parts = code.split()
    if not parts:
        return None

    field_type = parts[0].upper()
    switches = parts[1:] if len(parts) > 1 else []
    return {"type": field_type, "code": code, "switches": switches}


def summarise_fields(fields: List[Dict[str, Any]]) -> Dict[str, int]:
    """Return a simple frequency map of field types.

    Useful for tests and logging.
    """

    counts: Dict[str, int] = {}
    for field in fields:
        ftype = str(field.get("type", "UNKNOWN"))
        counts[ftype] = counts.get(ftype, 0) + 1
    return counts


def replace_fields_in_markdown(markdown_text: str, fields: List[Dict[str, Any]]) -> str:
    """Append a comment block summarising detected fields.

    This is a non-invasive way to expose field information to callers
    without altering the visible markdown content. The summary lives in
    an HTML comment at the end of the document.
    """

    if not fields:
        return markdown_text

    summary_lines = ["", "<!-- Word Fields Detected:"]
    for field in fields:
        ftype = field.get("type", "UNKNOWN")
        code = field.get("code", "")
        summary_lines.append(f"  - {ftype}: {code}")
    summary_lines.append("-->")

    return markdown_text + "\n" + "\n".join(summary_lines) + "\n"
