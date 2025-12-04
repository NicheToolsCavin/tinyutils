"""Tests for hyperlink preservation in DOCX→Markdown conversions.

Hyperlinks are converted to markdown [text](url) syntax.
Email links (mailto:) are also preserved.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
HYPERLINKS_FIXTURE = FIXTURE_DIR / "hyperlinks_sample.docx"


@pytest.mark.skipif(not HYPERLINKS_FIXTURE.exists(), reason="Hyperlinks fixture missing")
def test_docx_to_markdown_preserves_external_links() -> None:
    """External HTTP links should be converted to [text](url) markdown syntax."""
    raw = HYPERLINKS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=HYPERLINKS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check for markdown link syntax
    assert "[LINK-EXT-001" in md_text, "external link text should be present"
    assert "](https://example.com/LINK-EXT-001)" in md_text, "external link URL should be preserved"


@pytest.mark.skipif(not HYPERLINKS_FIXTURE.exists(), reason="Hyperlinks fixture missing")
def test_docx_to_markdown_preserves_email_links() -> None:
    """Email mailto: links should be converted to [text](mailto:) markdown syntax."""
    raw = HYPERLINKS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=HYPERLINKS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check for mailto link
    assert "[LINK-MAIL-001" in md_text, "email link text should be present"
    assert "mailto:test@LINK-MAIL-001" in md_text, "mailto URL should be preserved"


@pytest.mark.skipif(not HYPERLINKS_FIXTURE.exists(), reason="Hyperlinks fixture missing")
def test_docx_to_markdown_preserves_multiple_links_in_paragraph() -> None:
    """Multiple links in a single paragraph should all be preserved."""
    raw = HYPERLINKS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=HYPERLINKS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Both links should be present
    assert "LINK-MULTI-001" in md_text, "first link in multi-link paragraph should be present"
    assert "first-link.com" in md_text, "first link URL should be preserved"
    assert "LINK-MULTI-002" in md_text, "second link in multi-link paragraph should be present"
    assert "second-link.com" in md_text, "second link URL should be preserved"


@pytest.mark.skipif(not HYPERLINKS_FIXTURE.exists(), reason="Hyperlinks fixture missing")
def test_all_hyperlinks_in_single_conversion() -> None:
    """All hyperlinks should be preserved in a single conversion."""
    raw = HYPERLINKS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=HYPERLINKS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check all link markers are present
    link_markers = [
        "LINK-EXT-001",
        "LINK-MAIL-001",
        "LINK-MULTI-001",
        "LINK-MULTI-002",
    ]

    for marker in link_markers:
        assert marker in md_text, f"link marker {marker} should be in output"

    # Check markdown link syntax is used (square brackets + parentheses)
    assert md_text.count("](") >= 4, "should have at least 4 markdown-style links"
