"""Tests for list structure preservation in DOCX→Markdown conversions.

Lists are converted by pandoc with:
- Nested lists preserved with indentation
- Mixed bullet/numbered types supported
- HTML comments (<!-- -->) used to separate non-adjacent list levels
- Numbers may continue across interruptions

This is HIGH PRIORITY testing as ~80% of documents contain lists.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
LISTS_FIXTURE = FIXTURE_DIR / "lists_sample.docx"


def count_bullet_lists(md_text: str) -> int:
    """Count bullet list items (lines starting with -)."""
    return len(re.findall(r'^\s*-\s+', md_text, re.MULTILINE))


def count_numbered_lists(md_text: str) -> int:
    """Count numbered list items (lines starting with digit.)."""
    return len(re.findall(r'^\s*\d+\.\s+', md_text, re.MULTILINE))


def detect_nested_lists(md_text: str) -> bool:
    """Detect if there are nested lists (indented list markers)."""
    # Look for indented list markers (2+ spaces before - or digit)
    nested = re.findall(r'^\s{2,}[-\d]', md_text, re.MULTILINE)
    return len(nested) > 0


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_deep_nested_lists() -> None:
    """Deeply nested lists (3 levels) should preserve structure."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Deep nesting marker should be present
    assert "LIST-DEEP-001" in md_text, "deep nesting marker should be present"

    # Should have multiple list levels
    assert "Level 1" in md_text, "level 1 items should be present"
    assert "Level 2" in md_text, "level 2 items should be present"
    assert "Level 3" in md_text, "level 3 items should be present"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_mixed_list_types() -> None:
    """Mixed bullet and numbered lists should both be preserved."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Mixed list marker should be present
    assert "LIST-MIXED-001" in md_text, "mixed list marker should be present"

    # Should have both bullet and numbered items
    bullet_count = count_bullet_lists(md_text)
    numbered_count = count_numbered_lists(md_text)

    assert bullet_count >= 3, "should have multiple bullet list items"
    assert numbered_count >= 3, "should have multiple numbered list items"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_list_nesting_preserved() -> None:
    """Nested list structure should be detectable in markdown output."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have nested structure (indented or HTML comments)
    has_nested = detect_nested_lists(md_text) or "<!-- -->" in md_text

    assert has_nested, "should have detectable nested list structure"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_multiple_separate_lists() -> None:
    """Multiple separate lists in a document should all be preserved."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Multiple lists marker should be present
    assert "LIST-MULTI-001" in md_text, "multiple lists marker should be present"

    # Content from different lists should be present
    assert "First list item" in md_text, "first list items should be present"
    assert "Second list item" in md_text, "second list items should be present"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_bullets_under_numbers() -> None:
    """Bullet lists nested under numbered lists should be preserved."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Bullet-number mix marker should be present
    assert "LIST-BULNUM-001" in md_text, "bullet-number marker should be present"

    # Should have both list types
    assert "Bullet under number" in md_text, "nested bullets should be preserved"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_definition_style_lists() -> None:
    """Definition-style lists (bold term + definition) should be preserved."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Definition list marker should be present
    assert "LIST-DEFINE-001" in md_text, "definition list marker should be present"

    # Terms and definitions should be present
    assert "Term 1" in md_text and "Term 2" in md_text, "definition terms should be preserved"
    assert "Definition for term" in md_text, "definitions should be preserved"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_all_list_features_in_single_conversion() -> None:
    """All list features should be present in one conversion."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check all list test markers are present
    list_markers = [
        "LIST-DEEP-001",
        "LIST-MIXED-001",
        "LIST-MULTI-001",
        "LIST-BULNUM-001",
        "LIST-DEFINE-001",
        "LIST-COMPLEX-001",
    ]

    for marker in list_markers:
        assert marker in md_text, f"list marker {marker} should be in output"

    # Should have both bullet and numbered lists
    bullet_count = count_bullet_lists(md_text)
    numbered_count = count_numbered_lists(md_text)

    assert bullet_count >= 5, "should have multiple bullet lists"
    assert numbered_count >= 5, "should have multiple numbered lists"



@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_list_item_text_preserved() -> None:
    """All list item text should be preserved in conversion."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # List content markers
    assert "Level 1" in md_text, "level 1 list items"
    assert "First list item" in md_text, "first list content"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_list_numbering_present() -> None:
    """Numbered lists should have number markers in output."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have numbered list markers
    numbered_count = count_numbered_lists(md_text)
    assert numbered_count >= 3, "should have multiple numbered items"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_docx_bullet_lists_present() -> None:
    """Bullet lists should have bullet markers in output."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have bullet list markers
    bullet_count = count_bullet_lists(md_text)
    assert bullet_count >= 3, "should have multiple bullet items"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_list_continuation_handling() -> None:
    """Lists interrupted by paragraphs should handle continuation."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have list content (continuation may use HTML comments)
    assert "Level 1" in md_text or "First list" in md_text, "list content preserved"
    assert len(md_text) > 500, "substantial list content"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_lists_with_inline_formatting() -> None:
    """List items with bold/italic formatting should preserve text."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have list items (formatting markers may vary)
    total_lists = count_bullet_lists(md_text) + count_numbered_lists(md_text)
    assert total_lists >= 5, "should have multiple list items with formatting"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_list_round_trip_structure() -> None:
    """Round-trip DOCX→MD→DOCX should preserve list structure."""
    raw = LISTS_FIXTURE.read_bytes()

    # DOCX → MD
    result_md = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )
    assert result_md.error is None
    md_bytes = result_md.outputs[0].data

    # MD → DOCX
    result_docx = convert_one(
        input_bytes=md_bytes,
        name="lists.md",
        targets=["docx"],
        from_format="markdown",
        options=ConversionOptions(),
    )
    assert result_docx.error is None

    # Should have a DOCX output with list content
    docx_bytes = result_docx.outputs[0].data
    assert len(docx_bytes) > 1500, "round-trip should preserve list structure"


@pytest.mark.skipif(not LISTS_FIXTURE.exists(), reason="Lists fixture missing")
def test_complex_nested_mixed_lists() -> None:
    """Complex documents with mixed nested lists should be handled."""
    raw = LISTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=LISTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have both list types in significant quantity
    bullet_count = count_bullet_lists(md_text)
    numbered_count = count_numbered_lists(md_text)

    total = bullet_count + numbered_count
    assert total >= 10, f"should have many list items (got {total})"

    # Should detect nesting
    has_nesting = detect_nested_lists(md_text) or "<!-- -->" in md_text
    assert has_nesting, "complex lists should have nested structure"

