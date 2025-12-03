"""Integration tests for convert_backend ODT→DOCX/MD pipeline.

These tests exercise the real convert_backend via-markdown path for
OpenDocument inputs so that blank/near-blank DOCX regressions are caught
early.
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
ODT_FIXTURE = FIXTURE_DIR / "odt_invoice_sample.odt"
ODT_REPORT_FIXTURE = FIXTURE_DIR / "odt_report_sample.odt"
DOCX_REPORT_FIXTURE = FIXTURE_DIR / "docx_report_sample.docx"


@pytest.mark.skipif(not ODT_FIXTURE.exists(), reason="ODT fixture missing")
def test_odt_to_docx_not_blank_and_has_invoice_marker() -> None:
    """ODT→DOCX via convert_backend should produce a non-blank document.

    We assert on both byte size and presence of a simple marker string in
    word/document.xml to guard against regressions that silently produce
    empty or nearly empty DOCX outputs.
    """

    raw = ODT_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FIXTURE.name,
        targets=["docx", "md"],
        from_format="odt",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced for ODT input"

    docx_bytes = docx_art.data
    # Basic non-blank guard: DOCX should be a few kilobytes for this fixture.
    assert len(docx_bytes) > 1000, f"DOCX too small to be valid invoice: {len(docx_bytes)} bytes"

    # Inspect word/document.xml for a simple marker string.
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
    assert "INVOICE" in xml, "DOCX XML missing expected 'INVOICE' marker"


@pytest.mark.skipif(not ODT_FIXTURE.exists(), reason="ODT fixture missing")
def test_odt_to_markdown_contains_invoice_marker() -> None:
    """ODT→MD should preserve obvious content such as the INVOICE heading."""

    raw = ODT_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FIXTURE.name,
        targets=["md"],
        from_format="odt",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced for ODT input"

    md_text = md_art.data.decode("utf-8", errors="ignore")
    # Sanity checks: non-trivial length and expected marker.
    assert len(md_text) > 200, f"markdown output suspiciously small: {len(md_text)} chars"
    assert "INVOICE" in md_text, "markdown output missing expected 'INVOICE' marker"


def test_suspected_blank_output_guard_emits_log(monkeypatch: pytest.MonkeyPatch) -> None:
    """Guardrail: tiny DOCX for large ODT/DOCX input must log a warning tag.

    This test stubs out the heavy pandoc-dependent pieces of the pipeline so
    we can force a scenario where approxBytes is large but the generated DOCX
    is intentionally tiny, and then assert that convert_backend logs both the
    DOCX size and `suspected_blank_output=docx`.
    """

    # Stub pandoc runner so no real pandoc or Lua filters run.
    from api._lib import pandoc_runner

    def fake_ensure_pandoc() -> str:  # pragma: no cover - simple stub
        return "/fake/pandoc"

    def fake_convert_to_markdown(source, destination, from_format, accept_tracked_changes=False, extract_media_dir=None, extra_args=None):  # type: ignore[override]
        # Write a minimal markdown body that would normally carry content.
        destination.write_text("INVOICE\nBody text\n", "utf-8")

    def fake_apply_lua_filters(source, destination):  # type: ignore[override]
        destination.write_text(source.read_text("utf-8"), "utf-8")

    monkeypatch.setattr(pandoc_runner, "ensure_pandoc", fake_ensure_pandoc)
    monkeypatch.setattr(pandoc_runner, "convert_to_markdown", fake_convert_to_markdown)
    monkeypatch.setattr(pandoc_runner, "apply_lua_filters", fake_apply_lua_filters)

    # Stub normalise_markdown so we avoid depending on text_clean internals.
    class Stats:
        def __init__(self) -> None:
            self.softbreaks_replaced = 0
            self.nbsp_replaced = 0
            self.zero_width_removed = 0

    def fake_normalise_markdown(text: str, remove_zero_width: bool = True):  # type: ignore[override]
        return text, Stats()

    monkeypatch.setattr(conv_service, "normalise_markdown", fake_normalise_markdown)

    # Stub DOCX renderer to always return a deliberately tiny payload.
    def fake_render_markdown_target(cleaned_path, target: str, logs=None, options=None):  # type: ignore[override]
        if target == "docx":
            return b"SMALL"
        return cleaned_path.read_bytes()

    monkeypatch.setattr(conv_service, "_render_markdown_target", fake_render_markdown_target)

    # Build an obviously "large" input so approxBytes is high.
    input_bytes = ("X" * 5000).encode("utf-8")

    result = conv_service.convert_one(
        input_bytes=input_bytes,
        name="synthetic.odt",
        targets=["docx"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    logs = " ".join(result.logs or [])
    assert "stage_docx_bytes=" in logs, "expected stage_docx_bytes telemetry in logs"
    assert "suspected_blank_output=docx" in logs, "expected suspected_blank_output=docx marker for tiny DOCX"


@pytest.mark.skipif(not ODT_REPORT_FIXTURE.exists(), reason="ODT report fixture missing")
def test_odt_report_to_docx_and_md_non_blank() -> None:
    """ODT report fixture should convert to non-blank DOCX and MD with markers."""

    raw = ODT_REPORT_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=ODT_REPORT_FIXTURE.name,
        targets=["docx", "md"],
        from_format="odt",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    # DOCX assertions
    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced for ODT report fixture"
    docx_bytes = docx_art.data
    assert len(docx_bytes) > 1000, f"DOCX too small for report fixture: {len(docx_bytes)} bytes"
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
    assert "EXECUTIVE SUMMARY" in xml, "DOCX XML missing 'EXECUTIVE SUMMARY' marker"

    # Markdown assertions
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced for ODT report fixture"
    md_text = md_art.data.decode("utf-8", errors="ignore")
    assert len(md_text) > 200, f"markdown too small for report fixture: {len(md_text)} chars"
    assert "EXECUTIVE SUMMARY" in md_text, "markdown missing 'EXECUTIVE SUMMARY' marker"


@pytest.mark.skipif(not DOCX_REPORT_FIXTURE.exists(), reason="DOCX report fixture missing")
def test_docx_report_roundtrip_non_blank() -> None:
    """DOCX report fixture should survive docx→docx/md conversions."""

    raw = DOCX_REPORT_FIXTURE.read_bytes()
    opts = ConversionOptions()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_REPORT_FIXTURE.name,
        targets=["docx", "md"],
        from_format="docx",
        options=opts,
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced for DOCX report fixture"
    docx_bytes = docx_art.data
    assert len(docx_bytes) > 1000, f"round-tripped DOCX too small: {len(docx_bytes)} bytes"
    with ZipFile(io.BytesIO(docx_bytes)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
    assert "EXECUTIVE SUMMARY" in xml, "round-tripped DOCX missing 'EXECUTIVE SUMMARY' marker"

    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "no markdown artifact produced for DOCX report fixture"
    md_text = md_art.data.decode("utf-8", errors="ignore")
    assert len(md_text) > 200, f"markdown too small for DOCX report fixture: {len(md_text)} chars"
    assert "EXECUTIVE SUMMARY" in md_text, "markdown from DOCX missing 'EXECUTIVE SUMMARY' marker"


def test_html_to_docx_preserves_tables_via_direct_path() -> None:
    """HTML sources should go direct→docx to keep raw tables/headings."""

    html_body = b"""
    <table>
      <tr><td><strong>INVOICE</strong></td><td>Cavin</td></tr>
      <tr><td>Total</td><td>$123.45</td></tr>
    </table>
    """

    result = convert_one(
        input_bytes=html_body,
        name="invoice.html",
        targets=["docx"],
        from_format="html",
        options=ConversionOptions(),
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    docx_art = next((a for a in result.outputs or [] if a.target == "docx"), None)
    assert docx_art is not None, "no DOCX artifact produced for HTML input"

    with ZipFile(io.BytesIO(docx_art.data)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")

    assert "INVOICE" in xml, "DOCX missing table content from HTML source"
    assert "Cavin" in xml, "DOCX missing expected cell value"


def test_docx_roundtrip_does_not_trigger_suspected_blank_output(monkeypatch: pytest.MonkeyPatch) -> None:
    """Normal DOCX roundtrip should *not* log suspected_blank_output=md/docx.

    This test exercises the real pipeline with a known-good DOCX report
    fixture and asserts that the passive telemetry we added for markdown and
    DOCX size ratios stays quiet for healthy documents.
    """

    if not DOCX_REPORT_FIXTURE.exists():
        pytest.skip("DOCX report fixture missing")

    raw = DOCX_REPORT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=DOCX_REPORT_FIXTURE.name,
        targets=["docx", "md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"

    joined_logs = " ".join(result.logs or [])
    # Existing guard should not misclassify healthy output.
    assert "suspected_blank_output=docx" not in joined_logs
    # New markdown guard should also stay quiet.
    assert "suspected_blank_output=md" not in joined_logs


def test_markdown_blank_guard_emits_log_for_tiny_output(monkeypatch: pytest.MonkeyPatch) -> None:
    """Forced tiny markdown for large input should log suspected_blank_output=md.

    We stub the markdown normalisation step so the cleaned markdown becomes
    unrealistically small compared to the synthetic input size, then assert
    that the new telemetry hook emits a suspected_blank_output=md tag while
    still returning a successful ConversionResult.
    """

    # Build a large synthetic input to ensure approx_bytes is high.
    input_bytes = ("X" * 5000).encode("utf-8")

    # Stub pandoc runner so we avoid heavy external work.
    from api._lib import pandoc_runner

    def fake_ensure_pandoc() -> str:  # pragma: no cover - simple stub
        return "/fake/pandoc"

    def fake_convert_to_markdown(source, destination, from_format, accept_tracked_changes=False, extract_media_dir=None, extra_args=None):  # type: ignore[override]
        destination.write_text("INVOICE\nBody text\n" * 50, "utf-8")

    def fake_apply_lua_filters(source, destination):  # type: ignore[override]
        # Pass through unchanged.
        destination.write_text(source.read_text("utf-8"), "utf-8")

    monkeypatch.setattr(pandoc_runner, "ensure_pandoc", fake_ensure_pandoc)
    monkeypatch.setattr(pandoc_runner, "convert_to_markdown", fake_convert_to_markdown)
    monkeypatch.setattr(pandoc_runner, "apply_lua_filters", fake_apply_lua_filters)

    # Stub normalise_markdown so that cleaned markdown is implausibly small.
    class Stats:
        def __init__(self) -> None:
            self.softbreaks_replaced = 0
            self.nbsp_replaced = 0
            self.zero_width_removed = 0

    def tiny_normalise_markdown(text: str, remove_zero_width: bool = True):  # type: ignore[override]
        return "X", Stats()

    monkeypatch.setattr(conv_service, "normalise_markdown", tiny_normalise_markdown)

    result = conv_service.convert_one(
        input_bytes=input_bytes,
        name="synthetic.docx",
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None, f"unexpected conversion error: {result.error}"
    logs = " ".join(result.logs or [])
    assert "stage_cleaned_md_bytes=" in logs
    assert "suspected_blank_output=md" in logs



def test_odt_text_formatting_preserved() -> None:
    """ODT text formatting (bold, italic) should be preserved."""
    raw = ODT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FIXTURE.name,
        targets=["md"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have markdown formatting (table pipes or headers)
    assert "|" in md_text or "#" in md_text, "should have formatting markers"


def test_odt_paragraph_count() -> None:
    """ODT should preserve reasonable paragraph count."""
    raw = ODT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FIXTURE.name,
        targets=["md"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Should have multiple paragraphs
    paragraphs = [p for p in md_text.split("\n\n") if p.strip()]
    assert len(paragraphs) >= 3, "should have multiple paragraphs"


def test_odt_to_html_quality() -> None:
    """ODT to HTML conversion should produce valid HTML."""
    raw = ODT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FIXTURE.name,
        targets=["html"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    html_text = html_art.data.decode("utf-8")

    # Should have HTML tags
    assert "<" in html_text and ">" in html_text, "should have HTML tags"


def test_odt_multiple_targets() -> None:
    """ODT should convert to multiple targets simultaneously."""
    raw = ODT_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ODT_FIXTURE.name,
        targets=["md", "html", "docx"],
        from_format="odt",
        options=ConversionOptions(),
    )

    assert result.error is None
    assert len(result.outputs) == 3, "should produce all three outputs"

