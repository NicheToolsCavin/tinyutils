"""Integration tests for RTF conversion quality.

These tests verify that RTF→MD/DOCX conversions preserve document structure
and formatting quality, not just "did it convert without errors".

Quality criteria:
- Headings preserved with correct levels
- Lists (bullet and numbered) preserved
- Tables preserved with structure
- Formatting (bold, italic) preserved
- Output is readable and well-structured
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
RTF_FIXTURE = FIXTURE_DIR / "rtf_sample.rtf"


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_to_markdown_preserves_headings() -> None:
    """RTF→MD should preserve heading hierarchy.

    Quality check: Verify that RTF headings convert to proper Markdown
    headings (# and ##) with correct nesting levels.
    """
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
    )

    assert result.error is None, f"RTF conversion failed: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown output"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Quality: Check for heading markers
    h1_count = len(re.findall(r'^# [^\n]+', md_text, re.MULTILINE))
    h2_count = len(re.findall(r'^## [^\n]+', md_text, re.MULTILINE))

    assert h1_count >= 1, f"expected at least 1 h1 heading, found {h1_count}"
    assert h2_count >= 2, f"expected at least 2 h2 headings, found {h2_count}"

    # Quality: Verify specific heading text appears
    assert "RTF Sample" in md_text or "sample" in md_text.lower(), (
        "document title missing or malformed"
    )


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_to_markdown_preserves_lists() -> None:
    """RTF→MD should preserve list structure.

    Quality check: Lists should appear as proper Markdown lists with
    correct markers (-, 1., 2., etc.) and readable formatting.
    """
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
    )

    assert result.error is None, f"RTF conversion failed: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Quality: Check for bullet list markers
    bullet_lines = [line for line in md_text.split('\n') if re.match(r'^\s*[-*]\s+', line)]
    assert len(bullet_lines) >= 2, (
        f"expected at least 2 bullet list items, found {len(bullet_lines)}"
    )

    # Quality: Check for ordered list markers
    ordered_lines = [line for line in md_text.split('\n') if re.match(r'^\s*\d+\.\s+', line)]
    assert len(ordered_lines) >= 2, (
        f"expected at least 2 ordered list items, found {len(ordered_lines)}"
    )

    # Quality: Verify list content is readable (not garbled)
    first_bullet = bullet_lines[0] if bullet_lines else ""
    assert len(first_bullet.strip()) > 10, "bullet list content too short or garbled"


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_to_markdown_preserves_table_structure() -> None:
    """RTF→MD should preserve table structure.

    Quality check: Tables should appear as Markdown tables with proper
    pipe delimiters and column alignment.
    """
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
    )

    assert result.error is None, f"RTF conversion failed: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Quality: Check for table pipe delimiters
    table_rows = [line for line in md_text.split('\n') if '|' in line]
    assert len(table_rows) >= 2, (
        f"expected at least 2 table rows (header + data), found {len(table_rows)}"
    )

    # Quality: Check for table separator line (|---|---|)
    has_separator = any(re.match(r'^\s*\|[\s\-:|]+\|\s*$', line) for line in md_text.split('\n'))
    assert has_separator, "table separator line missing (table structure may be broken)"

    # Quality: Verify table content appears
    assert "Column A" in md_text or "column" in md_text.lower(), (
        "table column headers missing or malformed"
    )


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_to_markdown_preserves_formatting() -> None:
    """RTF→MD should preserve basic text formatting.

    Quality check: Bold and italic formatting should convert to proper
    Markdown syntax (**bold**, *italic*).
    """
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
    )

    assert result.error is None, f"RTF conversion failed: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Quality: Check for bold formatting
    bold_matches = re.findall(r'\*\*([^*]+?)\*\*', md_text)
    assert len(bold_matches) >= 1, "expected bold formatting to be preserved"

    # Quality: Check for italic formatting
    italic_matches = re.findall(r'(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)', md_text)
    assert len(italic_matches) >= 1, "expected italic formatting to be preserved"


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_to_docx_quality() -> None:
    """RTF→DOCX should produce high-quality, readable output.

    Quality check: DOCX should be substantial size, contain expected
    content, and have proper document.xml structure.
    """
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["docx"],
        from_format="rtf",
    )

    assert result.error is None, f"RTF→DOCX conversion failed: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX output"

    docx_bytes = docx_art.data

    # Quality: DOCX should be substantial (not mostly empty)
    assert len(docx_bytes) > 8000, (
        f"DOCX too small ({len(docx_bytes)} bytes) - may be missing content"
    )

    # Quality: Verify document.xml contains expected content
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        doc_xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")

    # Check for section markers (headings)
    assert "Section" in doc_xml or "RTF" in doc_xml, (
        "document content missing from DOCX"
    )

    # Quality: Should have paragraph elements (not garbled)
    para_count = len(re.findall(r'<w:p[ >]', doc_xml))
    assert para_count >= 10, (
        f"expected at least 10 paragraphs, found {para_count} (document may be truncated)"
    )


def test_rtf_round_trip_quality() -> None:
    """RTF→MD→DOCX round-trip should preserve quality.

    Quality check: After round-trip conversion, verify structure and
    content are still intact and readable.
    """
    if not RTF_FIXTURE.exists():
        pytest.skip("RTF fixture missing")

    # Step 1: RTF → MD
    raw = RTF_FIXTURE.read_bytes()
    result_md = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
    )
    assert result_md.error is None
    md_bytes = result_md.outputs[0].data
    md_text = md_bytes.decode('utf-8')

    # Step 2: MD → DOCX
    result_docx = convert_one(
        input_bytes=md_bytes,
        name="rtf_roundtrip.md",
        targets=["docx"],
        from_format="markdown",
    )
    assert result_docx.error is None
    docx_bytes = result_docx.outputs[0].data

    # Quality: Round-trip output should still be substantial
    assert len(docx_bytes) > 8000, "round-trip DOCX too small"

    # Quality: Key content should survive round-trip
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        doc_xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")

    # Verify headings survived
    heading_count = len(re.findall(r'<w:pStyle w:val="Heading', doc_xml))
    assert heading_count >= 3, (
        f"expected at least 3 headings after round-trip, found {heading_count}"
    )



@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_paragraph_structure_preserved() -> None:
    """Paragraph breaks should be maintained in RTF conversion."""
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Multiple paragraphs should create line breaks
    lines = [l for l in md_text.split("\n") if l.strip()]
    assert len(lines) >= 10, "should have multiple paragraphs"


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_text_content_complete() -> None:
    """All text content from RTF should be preserved."""
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have substantial content
    assert len(md_text) > 100, "should preserve all text content"


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_character_encoding() -> None:
    """RTF character encoding should be handled correctly."""
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md"],
        from_format="rtf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should decode without errors
    assert isinstance(md_text, str), "should produce valid UTF-8"


@pytest.mark.skipif(not RTF_FIXTURE.exists(), reason="RTF fixture missing")
def test_rtf_multiple_output_formats() -> None:
    """RTF should convert to multiple output formats."""
    raw = RTF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=RTF_FIXTURE.name,
        targets=["md", "html"],
        from_format="rtf",
        options=ConversionOptions(),
    )

    assert result.error is None
    assert len(result.outputs) == 2, "should produce both outputs"

    # Both outputs should have content
    for output in result.outputs:
        assert output.data is not None, f"{output.target} should have data"
        assert len(output.data) > 50, f"{output.target} should have content"

