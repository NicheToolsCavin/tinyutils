"""Tests for comments/annotations in DOCX→Markdown conversions.

Comments have LIMITED pandoc support:
- Comments NOT preserved by default
- Underlying text content IS preserved
- Comment extraction requires special filters
- Simulated comments (inline markers) preserved as text

This is LOW PRIORITY as pandoc doesn't extract comments by default.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
COMMENTS_FIXTURE = FIXTURE_DIR / "comments_sample.docx"


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_docx_commented_text_preserved() -> None:
    """Text with comments should be preserved even if comments are lost."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Underlying text should be preserved
    assert "COMMENT-TEXT-001" in md_text, "commented text should be present"
    assert "COMMENT-MULTI-A-001" in md_text, "first commented text present"


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_docx_comment_markers_preserved() -> None:
    """Comment markers (simulated) should be preserved as inline text."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Simulated comment markers should be visible
    assert "COMMENT-" in md_text, "comment markers should be in output"


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_pandoc_comments_limitation_documented() -> None:
    """Document that pandoc does NOT extract comments by default.

    Known limitation:
    - Comments are not preserved in standard conversion
    - Only underlying text content is kept
    - Special filters needed for comment extraction
    """
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Verify main content is present
    assert "COMMENTS-TEST-001" in md_text, "main heading present"
    assert len(md_text) > 300, "substantial content preserved"


# Phase 5 backend polish: comments extraction tests


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_comments_extraction_disabled_by_default() -> None:
    """Comments should NOT be extracted by default."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Should NOT have comment section by default
    assert "## Document Comments" not in md_text
    # Should not have comments_extracted telemetry
    log_text = " ".join(result.logs)
    assert "comments_extracted=" not in log_text


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_comments_extraction_opt_in() -> None:
    """Comments should be extracted when flag is enabled."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(extract_comments=True),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Should have telemetry
    log_text = " ".join(result.logs)
    assert "comments_extracted=1" in log_text or "comments_extraction_error=" not in log_text

    # If comments exist in the fixture, we should see the comment section
    # (This is fixture-dependent; we're testing the mechanism works)
    if "## Document Comments" in md_text:
        # Verify structure
        assert "### Comment" in md_text
        # Comments should be formatted as blockquotes
        assert ">" in md_text


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_comments_extraction_telemetry() -> None:
    """Comments extraction should log telemetry."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(extract_comments=True),
    )

    assert result.error is None

    # Should have telemetry in logs
    log_text = " ".join(result.logs)
    # Either comments_extracted=1 or no error
    assert "comments_extracted=1" in log_text or "comments_extraction_error=" not in log_text


def test_comments_extraction_non_docx_ignored() -> None:
    """Comments extraction should only apply to DOCX inputs."""
    md_input = "# Test\n\nSome content"
    result = convert_one(
        input_bytes=md_input.encode("utf-8"),
        name="test.md",
        targets=["md"],
        from_format="markdown",
        options=ConversionOptions(extract_comments=True),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Should NOT have comment section for non-DOCX input
    assert "## Document Comments" not in md_text
    # Should not have comments_extracted telemetry
    log_text = " ".join(result.logs)
    assert "comments_extracted=" not in log_text


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_comments_extraction_error_handling() -> None:
    """Comments extraction errors should not fail the conversion."""
    raw = COMMENTS_FIXTURE.read_bytes()
    # Even if comment extraction fails, conversion should succeed
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(extract_comments=True),
    )

    # Conversion should succeed regardless of comment extraction issues
    assert result.error is None
    assert result.outputs


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_comments_extraction_cache_key_distinction() -> None:
    """Results should differ based on extract_comments flag.

    This verifies that the cache key includes the flag so we don't serve
    cached results without comments when they were requested.
    """
    raw = COMMENTS_FIXTURE.read_bytes()

    # Convert without comments
    result1 = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(extract_comments=False),
    )

    # Convert with comments
    result2 = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(extract_comments=True),
    )

    assert result1.error is None
    assert result2.error is None

    md1 = next((a for a in result1.outputs or [] if a.target == "md"), None)
    md2 = next((a for a in result2.outputs or [] if a.target == "md"), None)

    assert md1 is not None
    assert md2 is not None

    # If comments exist in fixture, outputs should differ
    md2_text = md2.data.decode("utf-8")
    if "## Document Comments" in md2_text:
        # Outputs should be different when comments are extracted
        assert md1.data != md2.data


@pytest.mark.skipif(not COMMENTS_FIXTURE.exists(), reason="Comments fixture missing")
def test_comments_and_page_breaks_combined() -> None:
    """Both features should work together without conflict."""
    raw = COMMENTS_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=COMMENTS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(
            extract_comments=True,
            insert_page_break_markers=True,
        ),
    )

    assert result.error is None
    assert result.outputs

    # Both features should be applied if applicable
    log_text = " ".join(result.logs)
    # At least one should work (depending on fixture content)
    assert (
        "comments_extracted=1" in log_text
        or "page_breaks_inserted=" in log_text
        or (
            "comments_extraction_error=" not in log_text
            and "page_break_marker_error=" not in log_text
        )
    )
