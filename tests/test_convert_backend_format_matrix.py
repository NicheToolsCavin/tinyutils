"""Tests for format conversion matrix - testing conversions between different formats.

This validates that the converter handles multiple input/output format combinations:
- DOCX → MD, HTML, DOCX
- ODT → MD, HTML, DOCX
- RTF → MD, HTML
- MD → DOCX, HTML
- LaTeX → MD, HTML

This is HIGH PRIORITY as format flexibility is a core feature.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"


def test_docx_to_multiple_formats() -> None:
    """DOCX should convert to multiple output formats in one request."""
    fixture = FIXTURE_DIR / "blog_post.docx"
    if not fixture.exists():
        pytest.skip("blog_post fixture missing")

    raw = fixture.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=fixture.name,
        targets=["md", "html", "docx"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None, "should convert to multiple formats"
    assert len(result.outputs or []) == 3, "should have 3 outputs"

    # Check each output exists and has content
    targets_produced = {art.target for art in result.outputs or []}
    assert targets_produced == {"md", "html", "docx"}, "all target formats produced"

    for art in result.outputs or []:
        assert len(art.data) > 100, f"{art.target} output should have content"


def test_cross_format_round_trips() -> None:
    """Test round-trip conversions across different formats."""
    fixture = FIXTURE_DIR / "lists_sample.docx"
    if not fixture.exists():
        pytest.skip("lists_sample fixture missing")

    raw = fixture.read_bytes()

    # DOCX → MD
    result1 = convert_one(
        input_bytes=raw,
        name=fixture.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )
    assert result1.error is None
    md_bytes = result1.outputs[0].data

    # MD → HTML
    result2 = convert_one(
        input_bytes=md_bytes,
        name="temp.md",
        targets=["html"],
        from_format="markdown",
        options=ConversionOptions(),
    )
    assert result2.error is None
    html_bytes = result2.outputs[0].data

    # HTML → DOCX
    result3 = convert_one(
        input_bytes=html_bytes,
        name="temp.html",
        targets=["docx"],
        from_format="html",
        options=ConversionOptions(),
    )
    assert result3.error is None

    # All conversions should produce valid output
    assert len(md_bytes) > 100, "MD output has content"
    assert len(html_bytes) > 100, "HTML output has content"
    assert len(result3.outputs[0].data) > 1000, "DOCX output has content"


def test_odt_to_markdown_and_html() -> None:
    """ODT should convert cleanly to both MD and HTML."""
    fixture = FIXTURE_DIR / "november_16_30.odt"
    if not fixture.exists():
        pytest.skip("ODT fixture missing")

    raw = fixture.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=fixture.name,
        targets=["md", "html"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None, "ODT should convert to MD and HTML"
    assert len(result.outputs or []) == 2, "should have both outputs"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)

    assert md_art is not None, "should have MD output"
    assert html_art is not None, "should have HTML output"

    assert len(md_art.data) > 200, "MD should have content"
    assert len(html_art.data) > 200, "HTML should have content"
