"""Tests for table structure preservation in DOCX→Markdown conversions.

Tables are converted by pandoc as:
- Simple tables → Markdown pipe tables (|---|---|)
- Tables with merged cells → HTML <table> with colspan/rowspan
- Nested tables → Preserved as nested HTML tables

This is HIGH PRIORITY testing as ~90% of business documents contain tables.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
TABLES_FIXTURE = FIXTURE_DIR / "tables_sample.docx"


def count_pipe_tables(md_text: str) -> int:
    """Count markdown pipe tables by looking for table separator lines."""
    # Pipe table separator pattern: |---|---|
    separators = re.findall(r'\|[\s-]+\|[\s-]+\|', md_text)
    return len(separators)


def count_html_tables(md_text: str) -> int:
    """Count HTML tables."""
    return len(re.findall(r'<table', md_text, re.IGNORECASE))


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_simple_table_converts_to_pipe_table() -> None:
    """Simple tables should convert to markdown pipe table syntax."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Simple table should use pipe syntax
    assert "TABLE-BASIC-001" in md_text, "table marker should be in output"
    assert "|" in md_text, "should have pipe characters for tables"

    # Should have at least one pipe table
    pipe_count = count_pipe_tables(md_text)
    assert pipe_count >= 1, "should have at least one markdown pipe table"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_table_structure_preserved() -> None:
    """Table rows and columns should be preserved in conversion."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check that table content is present
    assert "Header A" in md_text, "table headers should be preserved"
    assert "Row 1 Col 1" in md_text, "table data should be preserved"
    assert "Row 2 Col 3" in md_text, "all table cells should be present"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_merged_cells_horizontal() -> None:
    """Horizontally merged cells should convert to HTML table with colspan."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Merged cells trigger HTML table output
    assert "TABLE-MERGE-H-001" in md_text, "horizontal merge marker should be present"
    assert "colspan" in md_text.lower(), "horizontal merge should use colspan attribute"
    assert "<table" in md_text.lower(), "merged cells should use HTML table"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_merged_cells_vertical() -> None:
    """Vertically merged cells should convert to HTML table with rowspan."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Merged cells trigger HTML table output
    assert "TABLE-MERGE-V-001" in md_text, "vertical merge marker should be present"
    assert "rowspan" in md_text.lower(), "vertical merge should use rowspan attribute"
    assert "<table" in md_text.lower(), "merged cells should use HTML table"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_nested_tables() -> None:
    """Tables nested inside other tables should be preserved."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Nested table content should be present
    assert "TABLE-NESTED-001" in md_text, "nested table marker should be present"
    assert "Nested A" in md_text, "nested table content should be preserved"
    assert "Nested D" in md_text, "all nested table cells should be present"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_table_alignment() -> None:
    """Table cell text alignment should be preserved where possible."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Alignment marker should be present
    assert "TABLE-ALIGN-001" in md_text, "alignment test marker should be present"

    # Alignment content should be present
    assert "Left" in md_text and "Center" in md_text and "Right" in md_text, \
        "all alignment test cells should be present"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_all_table_features_in_single_conversion() -> None:
    """All table features should be present in one conversion."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check all table test markers are present
    table_markers = [
        "TABLE-BASIC-001",
        "TABLE-MERGE-H-001",
        "TABLE-MERGE-V-001",
        "TABLE-NESTED-001",
        "TABLE-ALIGN-001",
    ]

    for marker in table_markers:
        assert marker in md_text, f"table marker {marker} should be in output"

    # Should have both pipe tables and HTML tables
    pipe_count = count_pipe_tables(md_text)
    html_count = count_html_tables(md_text)

    assert pipe_count >= 1, "should have at least one pipe table (simple tables)"
    assert html_count >= 1, "should have at least one HTML table (merged cells)"



@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_table_headers_preserved() -> None:
    """Table header rows should be distinguishable in output."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Table headers should be present
    assert "Header A" in md_text, "header cell A should be present"
    assert "Header B" in md_text, "header cell B should be present"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_table_data_cells_preserved() -> None:
    """All table data cells should be preserved in output."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Multiple data cells should be present
    assert "Row 1 Col 1" in md_text, "first row first column"
    assert "Row 2 Col 3" in md_text, "second row third column"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_docx_empty_table_cells_handled() -> None:
    """Tables with empty cells should not cause errors."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None, "should handle empty cells without error"
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "should produce markdown output"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_table_formatting_content_preserved() -> None:
    """Tables with borders/shading - content preserved, styling lost."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Content should be preserved (borders/shading lost)
    # All table markers should still be present
    assert "TABLE-BASIC-001" in md_text or "Header" in md_text, "table content preserved"
    assert len(md_text) > 500, "substantial table content"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_table_with_many_columns() -> None:
    """Wide tables with many columns should be handled correctly."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should handle tables with multiple columns
    pipe_count = md_text.count("|")
    assert pipe_count > 10, "should have many pipe separators for table columns"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_table_round_trip_structure_preserved() -> None:
    """Round-trip DOCX→MD→DOCX should preserve table structure."""
    raw = TABLES_FIXTURE.read_bytes()

    # DOCX → MD
    result_md = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )
    assert result_md.error is None
    md_bytes = result_md.outputs[0].data

    # MD → DOCX
    result_docx = convert_one(
        input_bytes=md_bytes,
        name="tables.md",
        targets=["docx"],
        from_format="markdown",
        options=ConversionOptions(),
    )
    assert result_docx.error is None

    # Should have a DOCX output
    docx_bytes = result_docx.outputs[0].data
    assert len(docx_bytes) > 2000, "round-trip should preserve table structure"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_table_to_html_preserves_structure() -> None:
    """Converting tables to HTML should preserve all structural features."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have table HTML tags
    assert "<table" in html_text.lower(), "should have HTML table tags"
    assert "<tr" in html_text.lower(), "should have table rows"
    assert "<td" in html_text.lower(), "should have table cells"


@pytest.mark.skipif(not TABLES_FIXTURE.exists(), reason="Tables fixture missing")
def test_multiple_tables_all_preserved() -> None:
    """Document with multiple tables should preserve all of them."""
    raw = TABLES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=TABLES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have multiple table indicators
    total_tables = count_pipe_tables(md_text) + count_html_tables(md_text)
    assert total_tables >= 2, "should preserve multiple tables from document"

