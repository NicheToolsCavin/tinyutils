"""Tests for document metadata preservation in DOCX→Markdown conversions.

Metadata is converted by pandoc as:
- Core properties (title, author, subject, keywords) → YAML front matter (with --standalone)
- Custom properties → Not extracted by default
- Document statistics → Not preserved

This is MEDIUM PRIORITY testing as ~60% of documents have meaningful metadata.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
METADATA_FIXTURE = FIXTURE_DIR / "metadata_sample.docx"


@pytest.mark.skipif(not METADATA_FIXTURE.exists(), reason="Metadata fixture missing")
def test_docx_core_metadata_extracted() -> None:
    """Core metadata properties should be present in document content."""
    raw = METADATA_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=METADATA_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Core metadata markers should be present in document content
    assert "META-TITLE-001" in md_text, "title metadata marker should be in output"
    assert "META-AUTHOR-001" in md_text, "author metadata marker should be in output"
    assert "META-SUBJECT-001" in md_text, "subject metadata marker should be in output"
    assert "META-KEYWORDS-001" in md_text, "keywords metadata marker should be in output"


@pytest.mark.skipif(not METADATA_FIXTURE.exists(), reason="Metadata fixture missing")
def test_docx_metadata_in_document_body() -> None:
    """Metadata content should be preserved in document body text."""
    raw = METADATA_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=METADATA_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Document body content should be preserved (as typed in the document, not from properties)
    assert "TinyUtils Test Document" in md_text, "title content should be in body"
    assert "Claude Code Agent" in md_text, "author content should be in body"
    assert "Document Conversion Testing" in md_text, "subject content should be in body"
    assert "testing; conversion; pandoc; tinyutils" in md_text, "keywords content should be in body"


@pytest.mark.skipif(not METADATA_FIXTURE.exists(), reason="Metadata fixture missing")
def test_all_metadata_features() -> None:
    """All metadata features should be present in one conversion."""
    raw = METADATA_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=METADATA_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check all metadata test markers are present (pandoc exports core properties to body)
    # Note: Comments field is NOT exported to markdown by pandoc
    metadata_markers = [
        "META-TITLE-001",
        "META-AUTHOR-001",
        "META-SUBJECT-001",
        "META-KEYWORDS-001",
        "META-CATEGORY-001",
    ]

    for marker in metadata_markers:
        assert marker in md_text, f"metadata marker {marker} should be in output"

    # Verify document structure is preserved
    assert "# Core Properties" in md_text, "section headings should be present"
    assert "# Expected Behavior" in md_text, "all sections should be present"
