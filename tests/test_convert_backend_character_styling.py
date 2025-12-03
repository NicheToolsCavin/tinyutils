"""Tests for character-level styling preservation in DOCX→Markdown conversions.

Character styling includes:
- Bold (**text**)
- Italic (*text*)
- Bold+Italic (***text***)
- Strikethrough (~~text~~)
- Underline (<u>text</u>)
- Superscript (<sup>text</sup>)
- Subscript (<sub>text</sub>)

All of these are preserved by pandoc's DOCX→Markdown conversion.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
STYLING_FIXTURE = FIXTURE_DIR / "character_styling_sample.docx"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_bold() -> None:
    """Bold text should be converted to **bold** markdown syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Bold should be **text**
    assert "**STYLE-BOLD-001" in md_text, "bold text should use ** syntax"
    assert "bold text**" in md_text, "bold text should be wrapped in **"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_italic() -> None:
    """Italic text should be converted to *italic* markdown syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Italic should be *text*
    assert "*STYLE-ITALIC-001" in md_text, "italic text should use * syntax"
    assert "italic text*" in md_text, "italic text should be wrapped in *"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_bold_italic() -> None:
    """Bold+italic text should be converted to ***text*** markdown syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Bold+Italic should be ***text***
    assert "***STYLE-BOLDITALIC-001" in md_text, "bold+italic should use *** syntax"
    assert "bold italic***" in md_text, "bold+italic should be wrapped in ***"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_strikethrough() -> None:
    """Strikethrough text should be converted to ~~text~~ markdown syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Strikethrough should be ~~text~~
    assert "~~STYLE-STRIKE-001" in md_text, "strikethrough should use ~~ syntax"
    assert "strikethrough~~" in md_text, "strikethrough should be wrapped in ~~"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_underline() -> None:
    """Underline text should be converted to <u>text</u> HTML syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Underline uses HTML <u> tags (no pure markdown equivalent)
    assert "<u>STYLE-UNDERLINE-001" in md_text, "underline should use <u> HTML tag"
    assert "underline</u>" in md_text, "underline should be wrapped in <u></u>"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_superscript() -> None:
    """Superscript text should be converted to <sup>text</sup> HTML syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Superscript uses HTML <sup> tags
    assert "<sup>STYLE-SUPER-001</sup>" in md_text, "superscript should use <sup> HTML tag"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_docx_to_markdown_preserves_subscript() -> None:
    """Subscript text should be converted to <sub>text</sub> HTML syntax."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Subscript uses HTML <sub> tags
    assert "<sub>STYLE-SUB-001</sub>" in md_text, "subscript should use <sub> HTML tag"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_all_character_styles_in_single_conversion() -> None:
    """All character styles should be preserved in a single conversion."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check all style markers are present
    style_checks = [
        ("STYLE-BOLD-001", "bold"),
        ("STYLE-ITALIC-001", "italic"),
        ("STYLE-BOLDITALIC-001", "bold+italic"),
        ("STYLE-STRIKE-001", "strikethrough"),
        ("STYLE-UNDERLINE-001", "underline"),
        ("STYLE-SUPER-001", "superscript"),
        ("STYLE-SUB-001", "subscript"),
    ]

    for marker, style_name in style_checks:
        assert marker in md_text, f"{style_name} style marker should be in output"



@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_character_styling_combinations() -> None:
    """Multiple styles combined should be preserved."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have multiple formatting markers
    assert "**" in md_text, "should have bold"
    assert "*" in md_text or "_" in md_text, "should have italic"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_character_styling_consistency() -> None:
    """Character styles should be consistently applied."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Multiple instances of same style
    bold_count = md_text.count("**")
    assert bold_count >= 2, "should have multiple bold markers"


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_character_styling_html_output() -> None:
    """Character styles should convert to HTML tags."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have HTML formatting tags
    assert "<strong>" in html_text or "<b>" in html_text or "<em>" in html_text


@pytest.mark.skipif(not STYLING_FIXTURE.exists(), reason="Character styling fixture missing")
def test_character_styling_markers_present() -> None:
    """All character style markers should be in output."""
    raw = STYLING_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=STYLING_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Marker content
    assert "STYLE-" in md_text, "should have style markers"

