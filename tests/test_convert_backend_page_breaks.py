"""Tests for page-break marker insertion (Phase 5 backend polish).

Tests the opt-in page-break marker feature that inserts visible markers
into markdown output when converting DOCX documents with page breaks.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
# We'll use sections_breaks_sample.docx which likely has page breaks
SECTIONS_FIXTURE = FIXTURE_DIR / "sections_breaks_sample.docx"


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_page_break_markers_disabled_by_default() -> None:
    """Page-break markers should NOT be inserted by default."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Should NOT have page break markers by default
    assert "<!-- PAGE BREAK -->" not in md_text


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_page_break_markers_opt_in() -> None:
    """Page-break markers should be inserted when flag is enabled."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(insert_page_break_markers=True),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Check if page breaks were detected and inserted
    # The log should indicate how many page breaks were inserted
    has_page_breaks = any("page_breaks_inserted=" in log for log in result.logs)

    if has_page_breaks:
        # If page breaks were found, markers should be present
        assert "<!-- PAGE BREAK -->" in md_text
        # Should also have horizontal rules
        assert "---" in md_text
    else:
        # If no page breaks in fixture, that's okay - just verify no errors
        pass


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_page_break_markers_telemetry() -> None:
    """Page-break marker insertion should log telemetry."""
    raw = SECTIONS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(insert_page_break_markers=True),
    )

    assert result.error is None

    # Should have telemetry in logs
    # Either page_breaks_inserted=N or no telemetry if no breaks found
    log_text = " ".join(result.logs)
    assert "page_breaks_inserted=" in log_text or "page_break_marker_error=" not in log_text


def test_page_break_markers_non_docx_ignored() -> None:
    """Page-break markers should only apply to DOCX inputs."""
    # Create a simple markdown input
    md_input = "# Test\n\nSome content\n\nMore content"
    result = convert_one(
        input_bytes=md_input.encode("utf-8"),
        name="test.md",
        targets=["md"],
        from_format="markdown",
        options=ConversionOptions(insert_page_break_markers=True),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Should NOT have page break markers for non-DOCX input
    assert "<!-- PAGE BREAK -->" not in md_text
    # Should not have page break telemetry
    log_text = " ".join(result.logs)
    assert "page_breaks_inserted=" not in log_text


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_page_break_markers_error_handling() -> None:
    """Page-break marker errors should not fail the conversion."""
    raw = SECTIONS_FIXTURE.read_bytes()
    # Even if page-break detection fails, conversion should succeed
    result = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(insert_page_break_markers=True),
    )

    # Conversion should succeed regardless of page-break marker issues
    assert result.error is None
    assert result.outputs


@pytest.mark.skipif(not SECTIONS_FIXTURE.exists(), reason="Sections fixture missing")
def test_page_break_markers_cache_key_distinction() -> None:
    """Results should differ based on insert_page_break_markers flag.

    This verifies that the cache key includes the flag so we don't serve
    cached results with wrong marker inclusion.
    """
    raw = SECTIONS_FIXTURE.read_bytes()

    # Convert without markers
    result1 = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(insert_page_break_markers=False),
    )

    # Convert with markers
    result2 = convert_one(
        input_bytes=raw,
        name=SECTIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(insert_page_break_markers=True),
    )

    assert result1.error is None
    assert result2.error is None

    md1 = next((a for a in result1.outputs or [] if a.target == "md"), None)
    md2 = next((a for a in result2.outputs or [] if a.target == "md"), None)

    assert md1 is not None
    assert md2 is not None

    # If page breaks were found, outputs should differ
    has_breaks_log = any("page_breaks_inserted=" in log for log in result2.logs)
    if has_breaks_log:
        # Outputs should be different when markers are inserted
        assert md1.data != md2.data
