"""Tests for paragraph formatting in DOCX→Markdown conversions.

Paragraph formatting has LIMITED pandoc support:
- Indents (first-line, hanging, left/right) → NOT preserved
- Paragraph spacing (before/after) → NOT preserved
- Line spacing (single, 1.5, double) → NOT preserved
- Content and text markers → Fully preserved

⚠️ PANDOC LIMITATION - Will be implemented via Google Cloud for advanced processing.
Tests establish infrastructure for future GCloud implementation.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
PARA_FORMAT_FIXTURE = FIXTURE_DIR / "paragraph_formatting_sample.docx"


@pytest.mark.skipif(not PARA_FORMAT_FIXTURE.exists(), reason="Paragraph formatting fixture missing")
def test_paragraph_content_preserved() -> None:
    """Paragraph text content should be preserved even if formatting is lost."""
    raw = PARA_FORMAT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PARA_FORMAT_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # All content markers should be present
    assert "INDENT-FIRST-TEXT-001" in md_text, "first-line indent content"
    assert "INDENT-HANG-TEXT-001" in md_text, "hanging indent content"
    assert "MARGINS-TEXT-001" in md_text, "margins content"


@pytest.mark.skipif(not PARA_FORMAT_FIXTURE.exists(), reason="Paragraph formatting fixture missing")
def test_paragraph_spacing_markers() -> None:
    """Paragraph spacing markers should be present in output."""
    raw = PARA_FORMAT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PARA_FORMAT_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Spacing markers
    assert "SPACING-BEFORE-001" in md_text
    assert "SPACING-AFTER-001" in md_text
    assert "SPACING-BOTH-001" in md_text


@pytest.mark.skipif(not PARA_FORMAT_FIXTURE.exists(), reason="Paragraph formatting fixture missing")
def test_line_spacing_content() -> None:
    """Line spacing content should be preserved."""
    raw = PARA_FORMAT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PARA_FORMAT_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Line spacing markers
    assert "LINE-SINGLE-001" in md_text
    assert "LINE-ONEHALF-001" in md_text
    assert "LINE-DOUBLE-001" in md_text


@pytest.mark.skipif(not PARA_FORMAT_FIXTURE.exists(), reason="Paragraph formatting fixture missing")
def test_paragraph_sequence_maintained() -> None:
    """Paragraph sequence should be maintained despite lost formatting."""
    raw = PARA_FORMAT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PARA_FORMAT_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify sequence
    indent_pos = md_text.find("INDENT-FIRST-TEXT-001")
    spacing_pos = md_text.find("SPACING-BEFORE-001")
    line_pos = md_text.find("LINE-SINGLE-001")

    assert indent_pos < spacing_pos < line_pos, "paragraph sequence preserved"


@pytest.mark.skipif(not PARA_FORMAT_FIXTURE.exists(), reason="Paragraph formatting fixture missing")
def test_pandoc_paragraph_formatting_limitation() -> None:
    """Document pandoc limitation - will be implemented via Google Cloud.

    Known limitation: Paragraph formatting (indents, spacing, line spacing) NOT preserved.
    Future: Will implement via Google Cloud Functions with advanced pandoc processing.
    """
    raw = PARA_FORMAT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PARA_FORMAT_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify main heading and content present
    assert "PARA-FORMAT-TEST-001" in md_text
    assert len(md_text) > 500, "substantial content preserved"

    # Test infrastructure ready for GCloud implementation
