"""Unit tests for bookmark_converter helpers."""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.bookmark_converter import add_html_anchors_to_markdown, extract_bookmarks


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
BOOKMARKS_FIXTURE = FIXTURE_DIR / "bookmarks_sample.docx"


@pytest.mark.skipif(
    not BOOKMARKS_FIXTURE.exists(),
    reason="Bookmarks fixture missing",
)
def test_extract_bookmarks_returns_named_entries() -> None:
    """Extractor should return non-internal bookmark names and text."""
    bookmarks = extract_bookmarks(BOOKMARKS_FIXTURE)
    assert bookmarks, "expected at least one bookmark"

    names = {bm.get("name") for bm in bookmarks}
    assert all(name and not str(name).startswith("_") for name in names)


@pytest.mark.skipif(
    not BOOKMARKS_FIXTURE.exists(),
    reason="Bookmarks fixture missing",
)
def test_add_html_anchors_to_markdown_injects_ids() -> None:
    """Anchors should be injected before the first occurrence of bookmark text."""
    bookmarks = extract_bookmarks(BOOKMARKS_FIXTURE)
    assert bookmarks

    # Build a tiny markdown string containing the text of the first bookmark.
    first = bookmarks[0]
    text = (first.get("text") or "").strip()
    name = first.get("name")
    md = f"# Heading\n\n{text}\n"

    updated = add_html_anchors_to_markdown(md, [first])
    assert f'id="{name}"' in updated
    # Ensure the anchor appears immediately before the text content.
    anchor_index = updated.find(f'id="{name}"')
    text_index = updated.find(text)
    assert anchor_index < text_index

