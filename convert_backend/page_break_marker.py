"""Page break detection and marker helpers for DOCX.

These helpers use ``python-docx`` to locate page breaks inside a DOCX
document and provide a small utility to insert visible markers into a
markdown string. Mapping between paragraph indices and markdown lines is
left to higher-level callers.
"""
from __future__ import annotations

from pathlib import Path
from typing import List

from docx import Document


def find_page_break_paragraph_indices(docx_path: Path) -> List[int]:
    """Return a list of paragraph indices that contain a page break.

    Detection covers both explicit ``w:br`` elements with ``type="page"``
    and the form-feed character that Word sometimes embeds in runs.
    """

    doc = Document(docx_path)
    indices: List[int] = []

    for idx, paragraph in enumerate(doc.paragraphs):
        has_break = False
        # Character-level form feed markers
        for run in paragraph.runs:
            if "\f" in run.text or "\x0c" in run.text:
                has_break = True
                break
        if has_break:
            indices.append(idx)
            continue

        # Explicit page break elements in XML
        for elem in paragraph._element.iter():  # type: ignore[attr-defined]
            if not elem.tag.endswith("br"):
                continue
            br_type = elem.get(
                "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}type",
            )
            if br_type == "page":
                indices.append(idx)
                break

    return indices


def add_page_break_markers(markdown_text: str, line_indices: List[int]) -> str:
    """Insert visible page break markers into markdown.

    ``line_indices`` are interpreted as line numbers in the markdown
    string (0-based). At each specified index we insert a horizontal
    rule and a comment marker. This function does not attempt to compute
    indices from DOCX; callers are responsible for mapping paragraphs to
    markdown lines when necessary.
    """

    if not line_indices:
        return markdown_text

    lines = markdown_text.split("\n")
    marker = "---\n<!-- PAGE BREAK -->"

    for idx in sorted(set(line_indices), reverse=True):
        if 0 <= idx <= len(lines):
            lines.insert(idx, marker)

    return "\n".join(lines)

