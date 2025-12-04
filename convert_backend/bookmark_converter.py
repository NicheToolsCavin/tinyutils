"""Bookmark extraction and markdown anchor helpers.

These helpers operate directly on DOCX files using ``python-docx`` to
extract bookmark definitions, and provide utilities to inject HTML
anchors into markdown based on those bookmarks. They are conservative
and do not attempt to infer cross-reference semantics yet.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from docx import Document


def extract_bookmarks(docx_path: Path) -> List[Dict[str, Any]]:
    """Extract bookmark definitions from a DOCX document.

    Each bookmark is returned as a mapping with keys:

    * ``id`` – internal numeric id
    * ``name`` – bookmark name (excluding internal ``_GoBack``)
    * ``text`` – paragraph text at the bookmark location
    """

    doc = Document(docx_path)
    bookmarks: List[Dict[str, Any]] = []

    for paragraph in doc.paragraphs:
        for elem in paragraph._element.iter():  # type: ignore[attr-defined]
            if elem.tag.endswith("bookmarkStart"):
                bid = elem.get(
                    "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}id",
                )
                name = elem.get(
                    "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}name",
                )
                if not name or name == "_GoBack":
                    continue
                bookmarks.append(
                    {
                        "id": bid,
                        "name": name,
                        "text": paragraph.text,
                    }
                )

    return bookmarks


def add_html_anchors_to_markdown(markdown_text: str, bookmarks: List[Dict[str, Any]]) -> str:
    """Inject HTML anchors into markdown based on bookmark text.

    For each bookmark, the first occurrence of the paragraph text in the
    markdown string is prefixed with ``<a id="bookmark_name"></a>``.
    """

    updated = markdown_text
    for bm in bookmarks:
        text = (bm.get("text") or "").strip()
        name = bm.get("name") or ""
        if not text or not name:
            continue
        anchor = f'<a id="{name}"></a>'
        idx = updated.find(text)
        if idx == -1:
            continue
        updated = updated.replace(text, f"{anchor}{text}", 1)
    return updated


def convert_cross_references(markdown_text: str, bookmarks: List[Dict[str, Any]]) -> str:
    """Placeholder for bookmark-based cross-reference conversion.

    Currently returns the input markdown unchanged. Future work may use
    bookmark metadata to convert plain-text references into links.
    """

    return markdown_text

