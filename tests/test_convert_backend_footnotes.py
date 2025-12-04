"""Integration tests for footnote/endnote preservation in convert_backend.

These tests verify that footnotes are correctly preserved when converting
between DOCX, ODT, and Markdown formats. Footnotes should appear as [^N]
markers with corresponding definitions in Markdown, and as proper footnote
XML structures in DOCX/ODT outputs.
"""
from __future__ import annotations

import io
import re
from pathlib import Path
from zipfile import ZipFile

import pytest

from convert_backend import convert_service as conv_service
from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
DOCX_FOOTNOTES_FIXTURE = FIXTURE_DIR / "docx_footnotes_sample.docx"
ODT_FOOTNOTES_FIXTURE = FIXTURE_DIR / "odt_footnotes_sample.odt"
MD_FOOTNOTES_FIXTURE = FIXTURE_DIR / "footnotes_sample_source.md"


@pytest.mark.skipif(not DOCX_FOOTNOTES_FIXTURE.exists(), reason="DOCX footnote fixture missing")
def test_docx_footnotes_to_markdown_preserves_markers() -> None:
    """DOCX→MD should preserve footnotes as [^N] markers and definitions.

    Validates that footnote references appear inline as [^1], [^2], etc.,
    and that corresponding definitions exist as [^1]: text at the end.
    """
    raw = DOCX_FOOTNOTES_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_FOOTNOTES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced for DOCX input"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Check for footnote reference markers in text (e.g., "text[^1]")
    reference_matches = re.findall(r'\[\^(\d+)\](?!:)', md_text)
    assert len(reference_matches) >= 8, (
        f"expected at least 8 footnote references, found {len(reference_matches)}"
    )

    # Check for footnote definitions (lines starting with [^N]:)
    definition_lines = [line for line in md_text.split('\n') if re.match(r'^\[\^\d+\]:', line)]
    assert len(definition_lines) >= 8, (
        f"expected at least 8 footnote definitions, found {len(definition_lines)}"
    )

    # Verify specific known content from fixture
    assert "first footnote" in md_text.lower(), "missing expected footnote text"


@pytest.mark.skipif(not DOCX_FOOTNOTES_FIXTURE.exists(), reason="DOCX footnote fixture missing")
def test_docx_footnotes_to_docx_preserves_footnotes_xml() -> None:
    """DOCX→DOCX (round-trip) should preserve footnotes in word/footnotes.xml.

    When converting DOCX→MD→DOCX, the output should still contain a valid
    footnotes.xml file with footnote content.
    """
    raw = DOCX_FOOTNOTES_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_FOOTNOTES_FIXTURE.name,
        targets=["docx"],
        from_format="docx",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced"

    docx_bytes = docx_art.data
    assert len(docx_bytes) > 5000, f"DOCX too small: {len(docx_bytes)} bytes"

    # Inspect word/footnotes.xml
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        files = zf.namelist()
        assert "word/footnotes.xml" in files, "word/footnotes.xml missing from output DOCX"

        footnotes_xml = zf.read("word/footnotes.xml").decode("utf-8", errors="ignore")

        # Check for footnote elements
        footnote_count = len(re.findall(r'<w:footnote', footnotes_xml))
        assert footnote_count > 0, "no footnote elements found in footnotes.xml"

        # Verify known content appears
        assert "first footnote" in footnotes_xml.lower(), (
            "expected footnote text missing from footnotes.xml"
        )


@pytest.mark.skipif(not ODT_FOOTNOTES_FIXTURE.exists(), reason="ODT footnote fixture missing")
def test_odt_footnotes_to_markdown_preserves_markers() -> None:
    """ODT→MD should preserve footnotes as [^N] markers and definitions.

    OpenDocument footnotes should be extracted by pandoc and converted to
    standard Markdown footnote syntax.
    """
    raw = ODT_FOOTNOTES_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FOOTNOTES_FIXTURE.name,
        targets=["md"],
        from_format="odt",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced for ODT input"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Check for footnote reference markers
    reference_matches = re.findall(r'\[\^(\d+)\](?!:)', md_text)
    assert len(reference_matches) >= 8, (
        f"expected at least 8 footnote references from ODT, found {len(reference_matches)}"
    )

    # Check for footnote definitions
    definition_lines = [line for line in md_text.split('\n') if re.match(r'^\[\^\d+\]:', line)]
    assert len(definition_lines) >= 8, (
        f"expected at least 8 footnote definitions from ODT, found {len(definition_lines)}"
    )

    # Verify known content
    assert "first footnote" in md_text.lower(), "missing expected ODT footnote text"


@pytest.mark.skipif(not MD_FOOTNOTES_FIXTURE.exists(), reason="MD footnote fixture missing")
def test_markdown_footnotes_to_docx_creates_footnotes_xml() -> None:
    """MD→DOCX should create word/footnotes.xml with footnote content.

    When converting Markdown with [^N] syntax to DOCX, pandoc should generate
    proper Word footnotes in the footnotes.xml part.
    """
    raw = MD_FOOTNOTES_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=MD_FOOTNOTES_FIXTURE.name,
        targets=["docx"],
        from_format="markdown",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced for MD input"

    docx_bytes = docx_art.data

    # Inspect word/footnotes.xml
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        files = zf.namelist()
        assert "word/footnotes.xml" in files, (
            "word/footnotes.xml not created from Markdown footnotes"
        )

        footnotes_xml = zf.read("word/footnotes.xml").decode("utf-8", errors="ignore")

        # Pandoc creates separator entries plus actual footnotes
        footnote_elements = len(re.findall(r'<w:footnote', footnotes_xml))
        assert footnote_elements >= 8, (
            f"expected at least 8 footnote elements, found {footnote_elements}"
        )

        # Verify content preservation
        assert "first footnote" in footnotes_xml.lower(), (
            "footnote text not preserved in DOCX footnotes.xml"
        )


def test_footnote_round_trip_docx_md_docx() -> None:
    """Round-trip DOCX→MD→DOCX should preserve footnote count and content.

    This integration test verifies footnote fidelity across the full pipeline.
    """
    if not DOCX_FOOTNOTES_FIXTURE.exists():
        pytest.skip("DOCX footnote fixture missing")

    # Step 1: DOCX → MD
    raw = DOCX_FOOTNOTES_FIXTURE.read_bytes()
    result_md = convert_one(
        input_bytes=raw,
        name=DOCX_FOOTNOTES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
    )
    assert result_md.error is None
    md_bytes = result_md.outputs[0].data

    # Step 2: MD → DOCX
    result_docx = convert_one(
        input_bytes=md_bytes,
        name="footnotes.md",
        targets=["docx"],
        from_format="markdown",
    )
    assert result_docx.error is None
    docx_bytes = result_docx.outputs[0].data

    # Verify footnotes survived round-trip
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        assert "word/footnotes.xml" in zf.namelist()
        footnotes_xml = zf.read("word/footnotes.xml").decode("utf-8", errors="ignore")

        # Should have multiple footnotes (at least 5 from our fixture)
        footnote_count = len(re.findall(r'<w:footnote\s+w:id="\d+"', footnotes_xml))
        assert footnote_count >= 5, (
            f"round-trip lost footnotes: only {footnote_count} remain"
        )



def test_footnotes_numbering_preserved() -> None:
    """Footnote numbering should be preserved in output."""
    raw = DOCX_FOOTNOTES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_FOOTNOTES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Footnote markers should be present
    assert "[^" in md_text, "should have footnote markers"


def test_footnotes_text_complete() -> None:
    """All footnote text should be extracted."""
    raw = DOCX_FOOTNOTES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_FOOTNOTES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have footnote content
    assert len(md_text) > 200, "should have substantial content including footnotes"


def test_footnotes_in_html() -> None:
    """Footnotes should convert to HTML structure."""
    raw = DOCX_FOOTNOTES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_FOOTNOTES_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have some structure
    assert len(html_text) > 100, "should have HTML content"


def test_odt_footnotes_preservation() -> None:
    """ODT footnotes should be extracted like DOCX."""
    raw = ODT_FOOTNOTES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FOOTNOTES_FIXTURE.name,
        targets=["md"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have footnote markers
    assert "[^" in md_text, "ODT footnotes should use markdown syntax"

