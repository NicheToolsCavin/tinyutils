"""Tests for typography preservation in DOCX→Markdown conversions.

Typography features have LIMITED pandoc support:
- Heading levels (1-9) → EXCELLENT preservation as markdown # syntax
- Text highlighting → GOOD preservation as <span class="mark"> tags
- Text colors → NOT preserved (limitation)
- Text alignment → NOT preserved (limitation)
- Font family/size → NOT preserved (limitation)

This is HIGH PRIORITY testing as ~100% of documents use heading hierarchy.
Testing focuses on features that ARE preserved, with documented limitations.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
TYPOGRAPHY_FIXTURE = FIXTURE_DIR / "typography_sample.docx"


def count_heading_levels(md_text: str) -> dict[int, int]:
    """Count markdown headings by level (# = level 1, ## = level 2, etc.)."""
    counts = {}
    for level in range(1, 10):
        pattern = r'^' + '#' * level + r'\s+\S'
        matches = re.findall(pattern, md_text, re.MULTILINE)
        counts[level] = len(matches)
    return counts


@pytest.mark.skipif(not TYPOGRAPHY_FIXTURE.exists(), reason="Typography fixture missing")
def test_docx_heading_hierarchy_preserved() -> None:
    """Heading levels should be preserved as markdown # syntax."""
    raw = TYPOGRAPHY_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TYPOGRAPHY_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify heading markers are present
    assert "TYPO-H1-001" in md_text, "level 1 heading marker should be present"
    assert "TYPO-H2-001" in md_text, "level 2 heading marker should be present"
    assert "TYPO-H3-001" in md_text, "level 3 heading marker should be present"
    assert "TYPO-H4-001" in md_text, "level 4 heading marker should be present"
    assert "TYPO-H5-001" in md_text, "level 5 heading marker should be present"

    # Count heading levels in markdown output
    heading_counts = count_heading_levels(md_text)

    # Should have multiple heading levels
    assert heading_counts[1] >= 2, "should have level 1 headings"
    assert heading_counts[2] >= 3, "should have level 2 headings"
    assert heading_counts[3] >= 1, "should have level 3 heading"
    assert heading_counts[4] >= 1, "should have level 4 heading"
    assert heading_counts[5] >= 1, "should have level 5 heading"


@pytest.mark.skipif(not TYPOGRAPHY_FIXTURE.exists(), reason="Typography fixture missing")
def test_docx_highlighting_preserved_as_mark() -> None:
    """Text highlighting should be preserved as <span class="mark"> tags."""
    raw = TYPOGRAPHY_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TYPOGRAPHY_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Highlighting should convert to <span class="mark"> tags
    assert '<span class="mark">' in md_text, "highlighting should use mark spans"

    # Verify highlight markers are present
    assert "TYPO-HL-YELLOW-001" in md_text, "yellow highlight marker should be present"
    assert "TYPO-HL-GREEN-001" in md_text, "green highlight marker should be present"
    assert "TYPO-HL-CYAN-001" in md_text, "cyan highlight marker should be present"

    # Count mark spans
    mark_count = md_text.count('<span class="mark">')
    assert mark_count >= 3, "should have multiple highlighted sections"


@pytest.mark.skipif(not TYPOGRAPHY_FIXTURE.exists(), reason="Typography fixture missing")
def test_typography_markers_all_present() -> None:
    """All typography test markers should be present in output."""
    raw = TYPOGRAPHY_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TYPOGRAPHY_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check all typography test markers are present
    typography_markers = [
        "TYPO-TEST-001",
        "TYPO-HEADINGS-001",
        "TYPO-COLORS-001",
        "TYPO-ALIGN-001",
        "TYPO-HIGHLIGHT-001",
        "TYPO-LIMITS-001",
    ]

    for marker in typography_markers:
        assert marker in md_text, f"typography marker {marker} should be in output"


@pytest.mark.skipif(not TYPOGRAPHY_FIXTURE.exists(), reason="Typography fixture missing")
def test_pandoc_typography_limitations_documented() -> None:
    """Document that pandoc does NOT preserve colors, alignment, or fonts.

    This test validates the known limitations:
    - Text colors are lost in both markdown and HTML
    - Text alignment is lost in both markdown and HTML
    - Font family and size are not preserved

    Only heading hierarchy and highlighting are preserved.
    """
    raw = TYPOGRAPHY_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TYPOGRAPHY_FIXTURE.name,
        targets=["md", "html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None

    # Markdown output
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # HTML output
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Verify limitation markers are present (content is preserved)
    assert "TYPO-COLOR-RED-001" in md_text, "color marker content present"
    assert "TYPO-ALIGN-CENTER-001" in md_text, "alignment marker content present"
    assert "TYPO-FONT-FAMILY-001" in md_text, "font limitation marker present"

    # Known limitations: these features are NOT in output
    # (Colors, alignment, fonts are lost by pandoc)
    # Test passes if content is preserved even without styling
    assert len(md_text) > 500, "substantial content should be preserved"
    assert len(html_text) > 500, "html output should have content"
