"""Integration tests for LaTeX conversion quality.

These tests verify that LaTeX→MD conversions preserve STEM document features
with high quality: equations, sections, lists, code blocks, and footnotes.

Quality criteria:
- Mathematical equations preserved (display and inline)
- Section hierarchy preserved
- Lists (itemize/enumerate) preserved with nesting
- Code blocks (verbatim) preserved
- Footnotes preserved
- Output is readable and well-structured
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from convert_backend import convert_service as conv_service
from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
LATEX_FIXTURE = FIXTURE_DIR / "latex_complex_sample.tex"
LATEX_SIMPLE_FIXTURE = FIXTURE_DIR / "sample.tex"


@pytest.mark.skipif(not LATEX_FIXTURE.exists(), reason="LaTeX fixture missing")
def test_latex_to_markdown_preserves_equations() -> None:
    """LaTeX→MD should preserve mathematical equations.

    Quality check: Display equations should convert to $$ blocks,
    inline equations to $ inline $ syntax. Math should be readable.
    """
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )

    assert result.error is None, f"LaTeX conversion failed: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown output"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Quality: Check for display equations (```math blocks or $$...$$)
    # Pandoc may use different output formats depending on version
    display_equations_fenced = re.findall(r'```\s*math\n(.*?)```', md_text, re.DOTALL)
    display_equations_dollars = re.findall(r'\$\$[^\$]+\$\$', md_text, re.DOTALL)
    total_display = len(display_equations_fenced) + len(display_equations_dollars)
    assert total_display >= 2, (
        f"expected at least 2 display equations, found {total_display} "
        f"({len(display_equations_fenced)} fenced, {len(display_equations_dollars)} $$)"
    )

    # Quality: Check for inline equations ($`...`$ or $...$)
    inline_equations_backtick = re.findall(r'\$`([^`]+?)`\$', md_text)
    inline_equations_dollars = re.findall(r'(?<!\$)\$(?!\$)(?!`)([^\$\n]+?)(?<!`)\$(?!\$)', md_text)
    total_inline = len(inline_equations_backtick) + len(inline_equations_dollars)
    assert total_inline >= 3, (
        f"expected at least 3 inline equations, found {total_inline} "
        f"({len(inline_equations_backtick)} backtick, {len(inline_equations_dollars)} dollars)"
    )

    # Quality: Verify specific equations appear
    assert "frac{" in md_text or "\\frac" in md_text, (
        "expected fraction syntax in equations"
    )
    assert "E = mc" in md_text or "E=mc" in md_text, (
        "E=mc² equation missing or malformed"
    )


@pytest.mark.skipif(not LATEX_FIXTURE.exists(), reason="LaTeX fixture missing")
def test_latex_to_markdown_preserves_section_hierarchy() -> None:
    """LaTeX→MD should preserve section/subsection hierarchy.

    Quality check: \\section should become #, \\subsection should become ##,
    with proper nesting and structure.
    """
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Check for heading hierarchy
    h1_headings = re.findall(r'^# ([^\n]+)', md_text, re.MULTILINE)
    h2_headings = re.findall(r'^## ([^\n]+)', md_text, re.MULTILINE)

    assert len(h1_headings) >= 3, (
        f"expected at least 3 h1 headings (sections), found {len(h1_headings)}"
    )
    assert len(h2_headings) >= 2, (
        f"expected at least 2 h2 headings (subsections), found {len(h2_headings)}"
    )

    # Quality: Verify specific section titles appear
    all_headings = ' '.join(h1_headings + h2_headings).lower()
    assert "mathematical" in all_headings or "equation" in all_headings, (
        "expected 'Mathematical Equations' section missing"
    )


@pytest.mark.skipif(not LATEX_FIXTURE.exists(), reason="LaTeX fixture missing")
def test_latex_to_markdown_preserves_lists() -> None:
    """LaTeX→MD should preserve itemize and enumerate lists.

    Quality check: \\itemize should become bullets, \\enumerate should
    become numbered lists, with nesting preserved.
    """
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Check for bullet lists
    bullet_items = re.findall(r'^\s*[-*]\s+(.+)', md_text, re.MULTILINE)
    assert len(bullet_items) >= 4, (
        f"expected at least 4 bullet items (from \\itemize), found {len(bullet_items)}"
    )

    # Quality: Check for ordered lists
    ordered_items = re.findall(r'^\s*\d+\.\s+(.+)', md_text, re.MULTILINE)
    assert len(ordered_items) >= 4, (
        f"expected at least 4 ordered items (from \\enumerate), found {len(ordered_items)}"
    )

    # Quality: Check for nested lists (indentation)
    nested_items = re.findall(r'^  [-*]\s+(.+)', md_text, re.MULTILINE)
    assert len(nested_items) >= 1, (
        f"expected nested list items, found {len(nested_items)}"
    )


@pytest.mark.skipif(not LATEX_FIXTURE.exists(), reason="LaTeX fixture missing")
def test_latex_to_markdown_preserves_code_blocks() -> None:
    """LaTeX→MD should preserve verbatim/code blocks.

    Quality check: \\begin{verbatim} should convert to fenced code blocks
    with proper formatting.
    """
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Check for fenced code blocks
    code_blocks = re.findall(r'```[^\n]*\n(.*?)```', md_text, re.DOTALL)
    assert len(code_blocks) >= 1, (
        f"expected at least 1 code block, found {len(code_blocks)}"
    )

    # Quality: Verify code content is preserved (not garbled)
    if code_blocks:
        first_block = code_blocks[0]
        assert len(first_block.strip()) > 10, (
            "code block content too short or empty"
        )
        # Should contain code-like patterns
        assert "def " in first_block or "return" in first_block or "{" in first_block, (
            "code block doesn't look like actual code"
        )


@pytest.mark.skipif(not LATEX_FIXTURE.exists(), reason="LaTeX fixture missing")
def test_latex_to_markdown_preserves_footnotes() -> None:
    """LaTeX→MD should preserve \\footnote{} as Markdown footnotes.

    Quality check: LaTeX footnotes should convert to [^N] syntax with
    corresponding definitions.
    """
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Check for footnote references
    footnote_refs = re.findall(r'\[\^(\d+)\](?!:)', md_text)
    assert len(footnote_refs) >= 3, (
        f"expected at least 3 footnote references, found {len(footnote_refs)}"
    )

    # Quality: Check for footnote definitions
    footnote_defs = re.findall(r'^\[\^(\d+)\]:', md_text, re.MULTILINE)
    assert len(footnote_defs) >= 3, (
        f"expected at least 3 footnote definitions, found {len(footnote_defs)}"
    )

    # Quality: Footnote definitions should have content
    first_def_line = next((line for line in md_text.split('\n') if line.startswith('[^')), "")
    if first_def_line:
        content_after_marker = first_def_line.split(':', 1)[1] if ':' in first_def_line else ""
        assert len(content_after_marker.strip()) > 5, (
            "footnote definition appears empty or truncated"
        )


@pytest.mark.skipif(not LATEX_FIXTURE.exists(), reason="LaTeX fixture missing")
def test_latex_to_markdown_handles_tables() -> None:
    """LaTeX→MD should preserve tabular environments as tables.

    Quality check: \\begin{tabular} should convert to Markdown pipe tables
    with proper column alignment.
    """
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )

    assert result.error is None
    md_text = result.outputs[0].data.decode("utf-8", errors="ignore")

    # Quality: Check for table markers (pipe delimiters)
    table_rows = [line for line in md_text.split('\n') if '|' in line]
    assert len(table_rows) >= 2, (
        f"expected table with at least 2 rows, found {len(table_rows)} rows"
    )

    # Quality: Check for table separator
    has_separator = any(re.match(r'^\s*\|[\s\-:|]+\|\s*$', line) for line in md_text.split('\n'))
    assert has_separator, "table separator line missing"


def test_latex_round_trip_stem_quality() -> None:
    """LaTeX→MD→DOCX should preserve STEM content quality.

    Quality check: Mathematical and technical content should survive
    round-trip conversion with reasonable fidelity.
    """
    if not LATEX_SIMPLE_FIXTURE.exists():
        pytest.skip("LaTeX simple fixture missing")

    # Step 1: LaTeX → MD
    raw = LATEX_SIMPLE_FIXTURE.read_bytes()
    result_md = convert_one(
        input_bytes=raw,
        name=LATEX_SIMPLE_FIXTURE.name,
        targets=["md"],
        from_format="latex",
    )
    assert result_md.error is None
    md_text = result_md.outputs[0].data.decode('utf-8')

    # Quality: MD should have math content
    assert "$" in md_text, "math equations missing from MD output"

    # Step 2: MD → DOCX
    md_bytes = result_md.outputs[0].data
    result_docx = convert_one(
        input_bytes=md_bytes,
        name="latex_roundtrip.md",
        targets=["docx"],
        from_format="markdown",
    )
    assert result_docx.error is None

    # Quality: DOCX should be substantial
    docx_bytes = result_docx.outputs[0].data
    assert len(docx_bytes) > 8000, (
        f"round-trip DOCX too small ({len(docx_bytes)} bytes)"
    )



def test_latex_complex_document_structure() -> None:
    """Complex LaTeX documents should preserve overall structure."""
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have multiple sections
    heading_count = md_text.count("#")
    assert heading_count >= 3, "should have multiple headings"


def test_latex_text_content_complete() -> None:
    """All LaTeX text content should be extracted."""
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have substantial text
    assert len(md_text) > 500, "should extract all text content"


def test_latex_to_docx_quality() -> None:
    """LaTeX to DOCX conversion should produce usable output."""
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["docx"],
        from_format="latex",
        options=ConversionOptions(),
    )

    assert result.error is None
    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "should produce DOCX output"
    assert len(docx_art.data) > 1000, "DOCX should have substantial content"


def test_latex_formatting_markers() -> None:
    """LaTeX formatting should convert to appropriate markdown."""
    raw = LATEX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LATEX_FIXTURE.name,
        targets=["md"],
        from_format="latex",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have some formatting (bold, italic, or headings)
    has_formatting = ("**" in md_text or "*" in md_text or "#" in md_text)
    assert has_formatting, "should preserve some formatting"

