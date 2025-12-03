"""Tests for comments/annotations in DOCX→Markdown conversions.

Comments have LIMITED pandoc support:
- Comments NOT preserved by default
- Underlying text content IS preserved
- Comment extraction requires special filters
- Simulated comments (inline markers) preserved as text

This is LOW PRIORITY as pandoc doesn't extract comments by default.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
COMMENTS_FIXTURE = FIXTURE_DIR / "comments_sample.docx"


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_docx_commented_text_preserved() -> None:
    """Text with comments should be preserved even if comments are lost."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Underlying text should be preserved
    assert "COMMENT-TEXT-001" in md_text, "commented text should be present"
    assert "COMMENT-MULTI-A-001" in md_text, "first commented text present"


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_docx_comment_markers_preserved() -> None:
    """Comment markers (simulated) should be preserved as inline text."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Simulated comment markers should be visible
    assert "COMMENT-" in md_text, "comment markers should be in output"


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_pandoc_comments_limitation_documented() -> None:
    """Document that pandoc does NOT extract comments by default.

    Known limitation:
    - Comments are not preserved in standard conversion
    - Only underlying text content is kept
    - Special filters needed for comment extraction
    """
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify main content is present
    assert "COMMENTS-TEST-001" in md_text, "main heading present"
    assert len(md_text) > 300, "substantial content preserved"
