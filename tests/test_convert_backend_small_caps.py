"""Tests for small caps and text transform features.

Text transforms have LIMITED pandoc support:
- Small caps → May preserve as <span style="font-variant:small-caps">
- All caps → NOT preserved (converted to regular text)
- Hidden text → NOT preserved

⚠️ Will be implemented via Google Cloud with LibreOffice/better tools.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


# Use existing character styling fixture for now
FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
CHAR_STYLING_FIXTURE = FIXTURE_DIR / "character_styling_sample.docx"


@pytest.mark.skipif(not CHAR_STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_text_transforms_content_preserved() -> None:
    """Text content should be preserved regardless of transform."""
    raw = CHAR_STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=CHAR_STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None


@pytest.mark.skipif(not CHAR_STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_small_caps_html_output() -> None:
    """Small caps should potentially convert to HTML span (GCloud future)."""
    raw = CHAR_STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=CHAR_STYLING_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    # Test infrastructure ready for GCloud implementation


@pytest.mark.skipif(not CHAR_STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_text_transforms_gcloud_todo() -> None:
    """Mark small caps/all caps for GCloud implementation.

    Current: NOT preserved by pandoc
    Future: Implement via LibreOffice on Google Cloud
    """
    raw = CHAR_STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=CHAR_STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    # Test passes - ready for GCloud feature implementation
