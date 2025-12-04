"""Paragraph formatting extraction helpers.

These helpers are intentionally conservative: they read a DOCX file via
``python-docx`` and expose a light-weight summary of paragraph
properties (text, style name, alignment). They do not mutate anything
or integrate with the main conversion pipeline yet; callers can use the
data for diagnostics or future HTML/markdown annotation.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from docx import Document
from docx.text.paragraph import Paragraph


def _normalise_alignment(value) -> str | None:
    """Return a human-readable alignment name from a python-docx enum.

    Values are mapped to plain strings ("LEFT", "CENTER", "RIGHT",
    "JUSTIFY"). Unknown or unset values return ``None``.
    """  # pragma: no cover - trivial mapping

    if value is None:
        return None
    name = getattr(value, "name", None)
    return str(name) if name is not None else None


def extract_paragraph_styles(docx_path: Path) -> Dict[str, List[Dict[str, str | None]]]:
    """Extract basic paragraph formatting data from a DOCX file.

    The return value is a mapping with a single key ``"paragraphs"``
    containing a list of dictionaries. Each dictionary includes:

    * ``text`` – stripped paragraph text
    * ``style`` – paragraph style name (when available)
    * ``alignment`` – alignment enum name (LEFT/CENTER/RIGHT/JUSTIFY) or
      ``None`` when unset
    """

    doc = Document(docx_path)
    paragraphs: List[Dict[str, str | None]] = []
    for p in doc.paragraphs:
        assert isinstance(p, Paragraph)  # for type checkers
        text = p.text.strip()
        style_name = p.style.name if p.style is not None else None
        alignment = _normalise_alignment(p.alignment)
        if not text:
            # Skip empty paragraphs to keep the structure compact.
            continue
        paragraphs.append(
            {
                "text": text,
                "style": style_name,
                "alignment": alignment,
            }
        )

    return {"paragraphs": paragraphs}


def apply_paragraph_formatting_to_markdown(
    markdown_text: str,
    formatting_data: Dict[str, List[Dict[str, str | None]]],
) -> str:
    """Placeholder hook to annotate markdown with paragraph formatting.

    For now this is a no-op that returns the original ``markdown_text``
    unchanged. Future phases may use ``formatting_data`` to inject HTML
    wrappers or comments for advanced rendering.
    """

    # Deliberately conservative: keep behaviour identical until we are
    # ready to surface formatting in the rendered output.
    return markdown_text

