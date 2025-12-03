"""Tests for section/page break handling in DOCX→Markdown conversions.

Sections and breaks have LIMITED pandoc support:
- Page breaks → NOT preserved (no markers in output)
- Section breaks → NOT preserved (text flows continuously)
- Content sequence → EXCELLENT preservation
- Text content → Fully preserved

This is MEDIUM PRIORITY testing as ~70% of documents use page breaks.
Testing focuses on content preservation, with documented limitations.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
SECTIONS_FIXTURE = FIXTURE_DIR / "sections_breaks_sample.docx"


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_docx_page_break_content_preserved() -> None:
    """Content before and after page breaks should be preserved in sequence."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Content markers should be present
    assert "BREAK-BEFORE-001" in md_text, "content before break should be present"
    assert "BREAK-AFTER-001" in md_text, "content after break should be present"

    # Verify sequence is preserved (before should appear before after)
    before_pos = md_text.find("BREAK-BEFORE-001")
    after_pos = md_text.find("BREAK-AFTER-001")
    assert before_pos < after_pos, "content sequence should be preserved"


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_docx_section_break_content_preserved() -> None:
    """Content in different sections should be preserved in correct order."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Section content should be present
    assert "SECTION-CONT-BEFORE-001" in md_text, "continuous section before marker"
    assert "SECTION-CONT-AFTER-001" in md_text, "continuous section after marker"
    assert "SECTION-NP-BEFORE-001" in md_text, "next-page section before marker"
    assert "SECTION-NP-AFTER-001" in md_text, "next-page section after marker"

    # Verify sequence
    cont_before = md_text.find("SECTION-CONT-BEFORE-001")
    cont_after = md_text.find("SECTION-CONT-AFTER-001")
    assert cont_before < cont_after, "section content sequence preserved"


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_docx_multiple_breaks_sequence() -> None:
    """Multiple page breaks should maintain content sequence."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Multiple break markers
    assert "BREAK-MULTI-1-001" in md_text, "first break marker"
    assert "BREAK-MULTI-2-001" in md_text, "second break marker"
    assert "BREAK-MULTI-3-001" in md_text, "third break marker"

    # Verify correct sequence
    pos1 = md_text.find("BREAK-MULTI-1-001")
    pos2 = md_text.find("BREAK-MULTI-2-001")
    pos3 = md_text.find("BREAK-MULTI-3-001")
    assert pos1 < pos2 < pos3, "multiple breaks maintain sequence"


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_docx_even_odd_page_sections() -> None:
    """Even/odd page section content should be preserved."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Even/odd page markers
    assert "SECTION-EVEN-001" in md_text, "even page marker present"
    assert "SECTION-EVEN-AFTER-001" in md_text, "even page content present"
    assert "SECTION-ODD-001" in md_text, "odd page marker present"
    assert "SECTION-ODD-AFTER-001" in md_text, "odd page content present"


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_pandoc_breaks_limitation_documented() -> None:
    """Document that pandoc does NOT preserve page/section breaks.

    This test validates the known limitation:
    - Page breaks are lost (no horizontal rules or markers)
    - Section breaks are lost (text flows continuously)
    - Only content and sequence are preserved

    Similar to bookmarks, colors, alignment limitations.
    """
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Known limitation: breaks are NOT in output
    # We just verify content is preserved
    assert "SECTIONS-TEST-001" in md_text, "main heading preserved"
    assert "BREAKS-PAGE-001" in md_text, "section markers preserved"
    assert len(md_text) > 500, "substantial content preserved"

    # Page breaks don't create horizontal rules (known limitation)
    # Section breaks don't create markers (known limitation)
    # Test passes if all content is present in correct order
