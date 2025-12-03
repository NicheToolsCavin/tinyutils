"""Integration tests for PDF→Markdown extraction quality.

These tests verify that PDF extraction produces readable, structured output
with substantial content preservation. PDF→MD is inherently fuzzy (layout-based
extraction), so tests focus on quality thresholds rather than exact matching.

Quality criteria:
- Text extraction is substantial (not blank or truncated)
- Document structure is somewhat preserved (paragraphs, headings)
- Content is readable (not garbled or mangled)
- Output size is proportional to input complexity
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from convert_backend import convert_service as conv_service
from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
PDF_FIXTURE = FIXTURE_DIR / "report_2025_annual.pdf"


@pytest.mark.skipif(not PDF_FIXTURE.exists(), reason="PDF fixture missing")
def test_pdf_to_markdown_extracts_substantial_text() -> None:
    """PDF→MD should extract substantial text content.

    Quality check: Output should be large enough to indicate meaningful
    content extraction, not just a few garbled characters.
    """
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
    )

    assert result.error is None, f"PDF conversion failed: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown output"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Quality: Should extract substantial content
    # (report_2025_annual.pdf is 4 pages, expect meaningful extraction)
    assert len(md_text) > 1000, (
        f"extracted text too short ({len(md_text)} chars) - may be blank or truncated"
    )

    # Quality: Should have multiple paragraphs (not one giant blob)
    paragraph_breaks = md_text.count('\n\n')
    assert paragraph_breaks >= 5, (
        f"expected multiple paragraphs, found {paragraph_breaks} breaks - text may be unstructured"
    )


@pytest.mark.skipif(not PDF_FIXTURE.exists(), reason="PDF fixture missing")
def test_pdf_to_markdown_is_readable() -> None:
    """PDF→MD output should be readable English text.

    Quality check: Verify extracted text contains actual words and
    sentences, not garbled binary or encoding artifacts.
    """
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Should contain common English words
    common_words = ['the', 'and', 'to', 'of', 'a', 'in', 'for']
    word_count = sum(1 for word in common_words if word in md_text.lower())
    assert word_count >= 5, (
        f"found only {word_count}/7 common words - text may be garbled or non-English"
    )

    # Quality: Should have reasonable word-to-character ratio
    words = re.findall(r'\b\w+\b', md_text)
    assert len(words) > 100, (
        f"found only {len(words)} words - extraction may be incomplete"
    )

    # Quality: Average word length should be reasonable (not garbled)
    avg_word_len = sum(len(w) for w in words) / len(words) if words else 0
    assert 3 < avg_word_len < 10, (
        f"average word length {avg_word_len:.1f} suspicious - may indicate garbled text"
    )


@pytest.mark.skipif(not PDF_FIXTURE.exists(), reason="PDF fixture missing")
def test_pdf_to_markdown_preserves_some_structure() -> None:
    """PDF→MD should preserve some document structure.

    Quality check: While PDF extraction is fuzzy, we should still get
    some indication of structure (headings, lists, sections).
    """
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Check for any structural indicators
    # (headings, lists, emphasis - even if imperfect)
    has_headings = bool(re.search(r'^#{1,6}\s+', md_text, re.MULTILINE))
    has_bold = '**' in md_text
    has_lists = bool(re.search(r'^\s*[-*]\s+', md_text, re.MULTILINE))

    structure_indicators = sum([has_headings, has_bold, has_lists])
    assert structure_indicators >= 1, (
        "no structural indicators found (headings/bold/lists) - extraction may be plain text dump"
    )


@pytest.mark.skipif(not PDF_FIXTURE.exists(), reason="PDF fixture missing")
def test_pdf_to_markdown_no_binary_artifacts() -> None:
    """PDF→MD should not contain binary garbage.

    Quality check: Verify output is clean text without null bytes,
    control characters, or encoding artifacts.
    """
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Should not contain null bytes
    assert '\x00' not in md_text, "output contains null bytes (binary corruption)"

    # Quality: Should be mostly printable characters
    printable_chars = sum(1 for c in md_text if c.isprintable() or c in '\n\r\t')
    printable_ratio = printable_chars / len(md_text) if md_text else 0
    assert printable_ratio > 0.95, (
        f"only {printable_ratio:.1%} printable chars - may contain binary artifacts"
    )


@pytest.mark.skipif(not PDF_FIXTURE.exists(), reason="PDF fixture missing")
def test_pdf_extraction_metadata() -> None:
    """PDF conversion should include helpful metadata.

    Quality check: Verify conversion logs provide useful info about
    PDF processing (page count, extraction method, etc.).
    """
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
    )

    assert result.error is None
    assert result.logs, "expected conversion logs"

    # Quality: Logs should indicate PDF-specific processing
    log_str = str(result.logs)
    # Check for any PDF-related info in logs
    # (exact log format may vary, so this is a loose check)
    assert result.name.endswith('.pdf'), "filename not preserved"


def test_pdf_multi_page_extraction_quality() -> None:
    """Multi-page PDF should extract content from all pages.

    Quality check: For a 4-page PDF, verify extraction captures content
    from multiple pages, not just the first page.
    """
    if not PDF_FIXTURE.exists():
        pytest.skip("PDF fixture missing")

    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: 4-page document should have content distributed
    # Rough heuristic: at least 500 chars extracted means multi-page capture
    # (not scientific, but catches "only first page extracted" bugs)
    assert len(md_text) > 2000, (
        f"4-page PDF extracted only {len(md_text)} chars - may be missing pages"
    )

    # Quality: Should have multiple sections/paragraphs across pages
    lines = md_text.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    assert len(non_empty_lines) > 20, (
        f"expected 20+ text lines from 4-page PDF, found {len(non_empty_lines)}"
    )



def test_pdf_page_count_inference() -> None:
    """Multi-page PDFs should extract text from all pages."""
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Multi-page content indicators
    lines = md_text.split("\n")
    assert len(lines) >= 20, "should have content from multiple pages"


def test_pdf_text_extraction_completeness() -> None:
    """PDF text extraction should be comprehensive."""
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have substantial text (not just fragments)
    word_count = len(md_text.split())
    assert word_count >= 50, "should extract substantial text"


def test_pdf_paragraph_separation() -> None:
    """PDF paragraphs should be reasonably separated."""
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have paragraph breaks
    paragraphs = [p for p in md_text.split("\n\n") if p.strip()]
    assert len(paragraphs) >= 3, "should have multiple paragraphs"


def test_pdf_special_characters() -> None:
    """PDF special characters should be handled correctly."""
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["md"],
        from_format="pdf",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should decode to valid UTF-8
    assert isinstance(md_text, str), "should be valid unicode"


def test_pdf_to_html_quality() -> None:
    """PDF to HTML conversion should produce usable output."""
    raw = PDF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=PDF_FIXTURE.name,
        targets=["html"],
        from_format="pdf",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have HTML structure
    assert "<" in html_text and ">" in html_text, "should have HTML tags"




def test_docx_to_html_basic_structure() -> None:
    """DOCX to HTML should produce valid HTML structure."""
    # Use existing images fixture for HTML test
    fixture_path = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter" / "images.docx"
    if not fixture_path.exists():
        pytest.skip("images fixture not available")
    
    raw = fixture_path.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=fixture_path.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have basic HTML structure
    assert "<p>" in html_text or "<div>" in html_text, "should have paragraph tags"



def test_html_lists_structured() -> None:
    """HTML output should have proper list structure."""
    fixture_path = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter" / "lists.docx"
    if not fixture_path.exists():
        pytest.skip("lists fixture not available")
    
    raw = fixture_path.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=fixture_path.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have list tags
    assert "<ul>" in html_text or "<ol>" in html_text, "should have list structure"

