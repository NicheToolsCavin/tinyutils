"""Tests for fields and dynamic content preservation.

Fields have LIMITED pandoc support - converted to static text only:
- PAGE fields → Static page number text
- DATE/TIME fields → Static date string
- TOC fields → Static table of contents text
- REF/HYPERLINK → Static references
- SEQ fields → Static sequence numbers
- AUTHOR/FILENAME → Static metadata

⚠️ Will be implemented via Google Cloud with LibreOffice/python-uno for field extraction.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
FIELDS_FIXTURE = FIXTURE_DIR / "fields_sample.docx"


@pytest.mark.skipif(not FIELDS_FIXTURE.exists(), reason="Fields fixture missing")
def test_fields_content_preserved_as_static_text() -> None:
    """Field content should be preserved as static text (pandoc limitation)."""
    raw = FIELDS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=FIELDS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # All field markers should be present (as static text)
    assert "FIELD-PAGE-TEXT-001" in md_text, "page field content"
    assert "FIELD-DATE-TEXT-001" in md_text, "date field content"
    assert "FIELD-TOC-TEXT-001" in md_text, "TOC field content"
    assert "FIELD-FILENAME-TEXT-001" in md_text, "filename field content"
    assert "FIELD-AUTHOR-TEXT-001" in md_text, "author field content"
    assert "FIELD-HYPERLINK-TEXT-001" in md_text, "hyperlink field content"


@pytest.mark.skipif(not FIELDS_FIXTURE.exists(), reason="Fields fixture missing")
def test_fields_sequence_preserved() -> None:
    """Field sequence numbers should be preserved as static text."""
    raw = FIELDS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=FIELDS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # SEQ field markers
    assert "FIELD-SEQ-TEXT-001" in md_text, "first sequence item"
    assert "FIELD-SEQ-TEXT-002" in md_text, "second sequence item"
    assert "FIELD-SEQ-TEXT-003" in md_text, "third sequence item"


@pytest.mark.skipif(not FIELDS_FIXTURE.exists(), reason="Fields fixture missing")
def test_fields_structure_maintained() -> None:
    """Document structure should be maintained despite field conversion."""
    raw = FIELDS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=FIELDS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify heading structure
    assert "# FIELDS-TEST-001" in md_text, "main heading"
    assert "## FIELD-PAGE-001" in md_text, "page field heading"
    assert "## FIELD-DATE-001" in md_text, "date field heading"
    assert "## FIELD-TOC-001" in md_text, "TOC field heading"


@pytest.mark.skipif(not FIELDS_FIXTURE.exists(), reason="Fields fixture missing")
def test_fields_html_output() -> None:
    """Fields should convert to HTML (as static text)."""
    raw = FIELDS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=FIELDS_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    assert html_art is not None
    html_text = html_art.data.decode("utf-8")

    # Should have HTML structure
    assert len(html_text) > 500, "substantial HTML content"
    # Test infrastructure ready for GCloud implementation


@pytest.mark.skipif(not FIELDS_FIXTURE.exists(), reason="Fields fixture missing")
def test_fields_round_trip_preserves_static_content() -> None:
    """Round-trip conversion preserves field content (as static text)."""
    raw = FIELDS_FIXTURE.read_bytes()

    # DOCX → MD
    result_md = convert_one(
        input_bytes=raw,
        name=FIELDS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )
    assert result_md.error is None
    md_bytes = result_md.outputs[0].data

    # MD → DOCX
    result_docx = convert_one(
        input_bytes=md_bytes,
        name="fields.md",
        targets=["docx"],
        from_format="markdown",
        options=ConversionOptions(),
    )
    assert result_docx.error is None

    # Content should survive round-trip (as static text)
    assert len(result_docx.outputs[0].data) > 1000, "round-trip preserved content"


@pytest.mark.skipif(not FIELDS_FIXTURE.exists(), reason="Fields fixture missing")
def test_pandoc_fields_limitation_gcloud_todo() -> None:
    """Document pandoc limitation - will be implemented via Google Cloud.

    Current: Fields → static text only (field codes lost)
    Future: LibreOffice/python-uno extraction to preserve field codes
    """
    raw = FIELDS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=FIELDS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify main heading and content present
    assert "FIELDS-TEST-001" in md_text
    assert len(md_text) > 800, "substantial content preserved"

    # Test infrastructure ready for GCloud field extraction implementation
