"""Tests for text box and shape preservation in DOCX→Markdown conversions.

Text boxes and drawing shapes have LIMITED pandoc support:
- Text box content → May be extracted as plain text
- Shape positioning → Lost
- Shape styling → Lost
- Grouped shapes → May be ungrouped

⚠️ Future enhancement: Google Cloud + LibreOffice/ImageMagick to
preserve layout and convert shapes to SVG/images.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
TEXTBOX_FIXTURE = FIXTURE_DIR / "textboxes_shapes_sample.docx"


def _render_markdown() -> str:
    raw_bytes = TEXTBOX_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw_bytes,
        name=TEXTBOX_FIXTURE.name,
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
    assert len(markdown_text) > 200
    return markdown_text


@pytest.mark.skipif(not TEXTBOX_FIXTURE.exists(), reason="Text box fixture missing")
def test_textbox_content_extracted() -> None:
    """Text box content markers should appear in the output.

    We only require the textual markers to survive; actual box
    positioning and styling are expected to be lost.
    """
    markdown_text = _render_markdown()

    assert "TEXTBOX-TEXT-001" in markdown_text, "text box marker missing"
    assert "TEXTBOX-INSIDE-001" in markdown_text, "text box inner content missing"


@pytest.mark.skipif(not TEXTBOX_FIXTURE.exists(), reason="Text box fixture missing")
def test_shape_section_content_preserved() -> None:
    """Shape section narrative should be preserved as plain text."""
    markdown_text = _render_markdown()

    assert "SHAPE-BASIC-001" in markdown_text, "shape heading missing"
    assert "SHAPE-TEXT-001" in markdown_text, "shape section content missing"


@pytest.mark.skipif(not TEXTBOX_FIXTURE.exists(), reason="Text box fixture missing")
def test_positioned_elements_content_preserved() -> None:
    """Content about positioned elements should survive, minus layout."""
    markdown_text = _render_markdown()

    assert "POSITION-TEST-001" in markdown_text, "positioned section heading missing"
    assert "POSITION-TEXT-001" in markdown_text, "positioned element content missing"


@pytest.mark.skipif(not TEXTBOX_FIXTURE.exists(), reason="Text box fixture missing")
def test_textbox_formatting_markers_present() -> None:
    """Formatted text box markers should be present in the output.

    We cannot assert bold/italic formatting in markdown reliably, but we
    can ensure that the marker paragraph text is preserved.
    """
    markdown_text = _render_markdown()

    assert "TEXTBOX-FORMAT-001" in markdown_text, "formatted text box heading missing"
    assert "TEXTBOX-FORMAT-TEXT-001" in markdown_text, "formatted text box marker missing"


@pytest.mark.skipif(not TEXTBOX_FIXTURE.exists(), reason="Text box fixture missing")
def test_pandoc_textbox_shapes_limitation_gcloud_todo() -> None:
    """Pandoc limitation note for text boxes/shapes is preserved."""
    markdown_text = _render_markdown()

    assert "TEXTBOX-TEST-001" in markdown_text
    assert "PANDOC LIMITATION" in markdown_text
    assert len(markdown_text) > 300, "expected substantial textbox/shape content"

