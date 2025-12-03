"""Tests for text alignment and color preservation.

Text alignment and colors have NO pandoc support - completely lost:
- Text color (RGB values, theme colors) → Lost
- Highlight color → Lost
- Text alignment (left/center/right/justify) → Lost
- Font background color → Lost
- Only plain text content is preserved

⚠️ Will be implemented via Google Cloud with LibreOffice HTML export for CSS styling.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
ALIGN_COLOR_FIXTURE = FIXTURE_DIR / "alignment_color_sample.docx"


@pytest.mark.skipif(not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing")
def test_colored_text_content_preserved() -> None:
    """Colored text content should be preserved (colors lost, text remains)."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # All color markers should be present (content preserved)
    assert "COLOR-TEXT-001" in md_text, "colored text content"
    assert "red" in md_text and "text" in md_text, "red text content"
    assert "blue" in md_text, "blue text content"
    assert "green" in md_text, "green text content"
    assert "COLOR-RAINBOW-001" in md_text, "rainbow text marker"


@pytest.mark.skipif(not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing")
def test_aligned_text_content_preserved() -> None:
    """Aligned text content should be preserved (alignment lost, text remains)."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # All alignment markers should be present
    assert "ALIGN-LEFT-TEXT-001" in md_text, "left-aligned text"
    assert "ALIGN-CENTER-TEXT-001" in md_text, "center-aligned text"
    assert "ALIGN-RIGHT-TEXT-001" in md_text, "right-aligned text"
    assert "ALIGN-JUSTIFY-TEXT-001" in md_text, "justified text"


@pytest.mark.skipif(not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing")
def test_combined_color_alignment_content() -> None:
    """Combined color + alignment content should be preserved."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Combined formatting marker
    assert "COMBO-TEXT-001" in md_text, "combined format content"
    assert "centered text is also colored red" in md_text, "combined format text"


@pytest.mark.skipif(not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing")
def test_alignment_color_structure_maintained() -> None:
    """Document structure should be maintained despite lost formatting."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify heading structure
    assert "# ALIGN-COLOR-TEST-001" in md_text, "main heading"
    assert "## COLOR-TEST-001" in md_text, "color section heading"
    assert "## ALIGN-LEFT-001" in md_text, "left align section"
    assert "## ALIGN-CENTER-001" in md_text, "center align section"

    # Verify sequence
    color_pos = md_text.find("COLOR-TEST-001")
    align_pos = md_text.find("ALIGN-LEFT-001")
    combo_pos = md_text.find("COMBO-001")

    assert color_pos < align_pos < combo_pos, "section sequence preserved"


@pytest.mark.skipif(not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing")
def test_pandoc_alignment_color_limitation_gcloud_todo() -> None:
    """Document pandoc limitation - will be implemented via Google Cloud.

    Current: Text colors and alignment completely lost
    Future: LibreOffice HTML export with CSS preservation (color, text-align)
    """
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify main heading and content present
    assert "ALIGN-COLOR-TEST-001" in md_text
    assert len(md_text) > 500, "substantial content preserved"

    # Test infrastructure ready for GCloud LibreOffice implementation
