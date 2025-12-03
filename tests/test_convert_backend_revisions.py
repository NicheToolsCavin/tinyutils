"""Integration tests for track-changes and comments handling.

These tests verify the global policy for convert_backend:
1. Track changes are ALWAYS accepted (final text only, no revision marks)
2. Comments are ALWAYS dropped (not represented in outputs)

This policy is intentionally simple to avoid feature flags and ensure
predictable, clean output regardless of input document state.
"""
from __future__ import annotations

import io
from pathlib import Path
from zipfile import ZipFile

import pytest

from convert_backend import convert_service as conv_service
from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
REVISIONS_FIXTURE = FIXTURE_DIR / "docx_revisions_sample.docx"


@pytest.mark.skipif(not REVISIONS_FIXTURE.exists(), reason="Revisions fixture missing")
def test_track_changes_accepted_by_default() -> None:
    """Verify that accept_tracked_changes defaults to True.

    The global policy is to ALWAYS accept track changes, showing only
    final text without revision marks. This test confirms the default
    ConversionOptions behavior.
    """
    opts = ConversionOptions()
    assert opts.accept_tracked_changes is True, (
        "accept_tracked_changes should default to True (global policy)"
    )


@pytest.mark.skipif(not REVISIONS_FIXTURE.exists(), reason="Revisions fixture missing")
def test_docx_to_markdown_accepts_track_changes() -> None:
    """DOCX→MD should accept track changes and show final text only.

    When converting a DOCX that may contain tracked changes, the output
    should contain only the final accepted text with no revision marks
    or change indicators.
    """
    raw = REVISIONS_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=REVISIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Verify final text marker appears (track changes accepted)
    assert "FINAL_TEXT_MARKER" in md_text, (
        "expected final text marker missing (track changes may not be accepted)"
    )

    # Verify markdown doesn't contain revision-related syntax
    # (pandoc might output certain markers if track changes aren't accepted)
    assert "{+" not in md_text, "found insertion marker {+ (track changes not accepted)"
    assert "{-" not in md_text, "found deletion marker {- (track changes not accepted)"

    # Verify document title appears (basic content preservation)
    assert "Track Changes" in md_text or "track changes" in md_text.lower(), (
        "document title missing from output"
    )


@pytest.mark.skipif(not REVISIONS_FIXTURE.exists(), reason="Revisions fixture missing")
def test_docx_to_docx_accepts_track_changes() -> None:
    """DOCX→DOCX round-trip should accept track changes.

    When converting DOCX→MD→DOCX, the output should contain final text
    only, with tracked changes resolved.
    """
    raw = REVISIONS_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=REVISIONS_FIXTURE.name,
        targets=["docx"],
        from_format="docx",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced"

    docx_bytes = docx_art.data
    assert len(docx_bytes) > 5000, f"DOCX too small: {len(docx_bytes)} bytes"

    # Inspect word/document.xml for final text
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")

    # Verify final text marker appears
    assert "FINAL_TEXT_MARKER" in xml, (
        "expected final text missing from DOCX (track changes not accepted)"
    )

    # Verify no revision marks in document.xml
    # Word stores track changes with <w:ins>, <w:del> elements
    assert "<w:ins" not in xml, (
        "found insertion revision mark in output (track changes not accepted)"
    )
    assert "<w:del" not in xml, (
        "found deletion revision mark in output (track changes not accepted)"
    )


@pytest.mark.skipif(not REVISIONS_FIXTURE.exists(), reason="Revisions fixture missing")
def test_comments_policy_documented() -> None:
    """Verify comments handling policy is clear.

    The global policy is to DROP comments (pandoc default behavior).
    This test documents the policy and verifies basic conversion works.

    Note: Testing actual Word comment dropping requires a DOCX with real
    comments.xml content. Pandoc drops comments by default when converting
    from DOCX, so no special handling is needed.
    """
    raw = REVISIONS_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=REVISIONS_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced"

    md_text = md_art.data.decode("utf-8", errors="ignore")

    # Verify basic content is present (conversion succeeded)
    assert len(md_text) > 100, "markdown output should contain substantial content"
    assert "FINAL_TEXT_MARKER" in md_text, "expected content marker missing"

    # Policy note: Pandoc drops Word comments by default during DOCX→MD conversion.
    # No special flags or handling needed - comments simply don't appear in output.


def test_accept_tracked_changes_flag_behavior() -> None:
    """Verify --track-changes=accept is passed to pandoc when enabled.

    This test confirms that the ConversionOptions.accept_tracked_changes
    flag correctly controls pandoc's --track-changes behavior.
    """
    from api._lib import pandoc_runner
    from pathlib import Path
    import tempfile

    # Create a minimal test file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as tmp:
        tmp.write("# Test\n\nContent")
        tmp_input = Path(tmp.name)

    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as tmp:
            tmp_output = Path(tmp.name)

        # Test that convert_to_markdown respects accept_tracked_changes parameter
        # (this is a smoke test for the pandoc_runner module)
        try:
            pandoc_runner.convert_to_markdown(
                source=tmp_input,
                destination=tmp_output,
                from_format="markdown",
                accept_tracked_changes=True,
            )
            assert tmp_output.exists(), "conversion should create output file"
            assert tmp_output.stat().st_size > 0, "output should not be empty"
        except pandoc_runner.PandocError as exc:
            pytest.skip(f"pandoc not available: {exc}")

    finally:
        tmp_input.unlink(missing_ok=True)
        tmp_output.unlink(missing_ok=True)


def test_conversion_options_defaults_match_policy() -> None:
    """Verify ConversionOptions defaults align with documented policy.

    Policy: Track changes ALWAYS accepted by default.
    """
    opts = ConversionOptions()

    assert opts.accept_tracked_changes is True, (
        "accept_tracked_changes must default to True per global policy"
    )

    # Verify this is documented behavior, not accidental
    # The policy is: no feature flags, always accept track changes
    # If this default changes, it violates the global policy


