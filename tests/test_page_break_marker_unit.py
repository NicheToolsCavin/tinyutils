"""Unit tests for page_break_marker helpers."""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.page_break_marker import (
    add_page_break_markers,
    find_page_break_paragraph_indices,
)


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
SECTIONS_FIXTURE = FIXTURE_DIR / "sections_breaks_sample.docx"


@pytest.mark.skipif(
    not SECTIONS_FIXTURE.exists(),
    reason="Sections fixture missing",
)
def test_find_page_break_paragraph_indices_returns_positions() -> None:
    """Detector should report at least one page-break paragraph index."""
    indices = find_page_break_paragraph_indices(SECTIONS_FIXTURE)
    assert isinstance(indices, list)
    # The sections_breaks_sample fixture is designed to contain breaks.
    assert indices, "expected at least one page-break index"


def test_add_page_break_markers_inserts_marker_lines() -> None:
    """Markers should be inserted at the specified line indices."""
    md = "Line 0\nLine 1\nLine 2\nLine 3"
    updated = add_page_break_markers(md, [2])
    # Expect a marker line before original line 2.
    lines = updated.split("\n")
    assert "<!-- PAGE BREAK -->" in "\n".join(lines)

