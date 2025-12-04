"""Tests for cross-reference preservation in DOCX→Markdown conversions.

Cross-references have LIMITED pandoc support:
- REF fields → Static text only
- PAGEREF fields → Static page numbers only
- Cross-reference linking → Lost
- Referenced content → Preserved

⚠️ Future enhancement: Google Cloud + LibreOffice field extraction to
rebuild proper HTML anchors and links.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
XREF_FIXTURE = FIXTURE_DIR / "cross_references_sample.docx"


def _render_markdown() -> str:
    raw_bytes = XREF_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw_bytes,
        name=XREF_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_artifact = next(
        (artifact for artifact in result.outputs or [] if artifact.target == "md"),
        None,
    )
    assert md_artifact is not None
    markdown_text = md_artifact.data.decode("utf-8")
    # Basic sanity: we should get a non‑trivial document back.
    assert len(markdown_text) > 200
    return markdown_text


@pytest.mark.skipif(not XREF_FIXTURE.exists(), reason="Cross-reference fixture missing")
def test_cross_reference_content_preserved() -> None:
    """Referenced section content markers should survive conversion.

    Even though field codes and links are lost, the surrounding text for
    headings, figures, and tables should still be present.
    """
    markdown_text = _render_markdown()

    assert "XREF-HEADING-TEXT-001" in markdown_text, "heading reference content"
    assert "XREF-FIGURE-TEXT-001" in markdown_text, "figure reference content"
    assert "XREF-TABLE-TEXT-001" in markdown_text, "table reference content"


@pytest.mark.skipif(not XREF_FIXTURE.exists(), reason="Cross-reference fixture missing")
def test_cross_reference_link_text_preserved() -> None:
    """Cross-reference link text should appear exactly once per link marker."""
    markdown_text = _render_markdown()

    for marker in [
        "XREF-LINK-TEXT-001",
        "XREF-LINK-TEXT-002",
        "XREF-LINK-TEXT-003",
    ]:
        count = markdown_text.count(marker)
        assert count == 1, f"expected {marker} once, found {count}"


@pytest.mark.skipif(not XREF_FIXTURE.exists(), reason="Cross-reference fixture missing")
def test_pageref_content_preserved() -> None:
    """PAGEREF field content should be preserved as static text."""
    markdown_text = _render_markdown()

    assert "XREF-PAGEREF-TEXT-001" in markdown_text, "PAGEREF marker missing"
    # The visible page label should be present even if field semantics are lost.
    assert "Page 1" in markdown_text, "PAGEREF page label missing"


@pytest.mark.skipif(not XREF_FIXTURE.exists(), reason="Cross-reference fixture missing")
def test_cross_reference_structure_maintained() -> None:
    """Document structure around cross-references should be intact."""
    markdown_text = _render_markdown()

    # We only assert that the key heading labels survive, not the exact
    # Markdown heading syntax, to keep this robust across md dialects.
    assert "XREF-TEST-001" in markdown_text, "main heading missing"
    assert "XREF-HEADING-001" in markdown_text, "section heading missing"
    assert "XREF-LINKS-001" in markdown_text, "links section heading missing"


@pytest.mark.skipif(not XREF_FIXTURE.exists(), reason="Cross-reference fixture missing")
def test_pandoc_cross_reference_limitation_gcloud_todo() -> None:
    """Cross-reference limitations are documented in the converted output.

    This test ensures that the explanatory text about pandoc limitations is
    preserved so future LibreOffice/GCloud work has a clear baseline.
    """
    markdown_text = _render_markdown()

    assert "XREF-TEST-001" in markdown_text
    assert "PANDOC LIMITATION" in markdown_text
    # The document should remain reasonably large; this guards against
    # truncation or gross conversion failures.
    assert len(markdown_text) > 500, "expected substantial cross-reference content"

