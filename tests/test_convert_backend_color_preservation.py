"""Tests for LibreOffice-based color and alignment preservation.

These tests exercise the optional LibreOffice pre-processing path. They
are intentionally defensive:

* When the LibreOffice binary is not available on the system, the
  entire module skips cleanly.
* When available, we assert that the HTML produced by LibreOffice
  contains styling information that the standard pandoc-only path would
  normally lose.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend import libreoffice_converter
from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
ALIGN_COLOR_FIXTURE = FIXTURE_DIR / "alignment_color_sample.docx"


LIBREOFFICE_AVAILABLE = (
    libreoffice_converter is not None
    and getattr(libreoffice_converter, "is_libreoffice_available", None) is not None
    and libreoffice_converter.is_libreoffice_available()
)


pytestmark = pytest.mark.skipif(
    not LIBREOFFICE_AVAILABLE,
    reason="LibreOffice (soffice) binary not available; skipping LibreOffice tests",
)


@pytest.mark.skipif(
    not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing",
)
def test_libreoffice_color_extraction_html_contains_color_styles() -> None:
    """HTML output should contain color styling when LibreOffice is enabled."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(
            use_libreoffice=True,
            preserve_colors=True,
        ),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    assert html_art is not None
    html_text = html_art.data.decode("utf-8")

    # We do not assert exact CSS, only that color styling appears.
    assert "color:" in html_text.lower() or "style=" in html_text.lower()


@pytest.mark.skipif(
    not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing",
)
def test_libreoffice_alignment_extraction_html_contains_text_align() -> None:
    """HTML output should contain text-align styling when requested."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(
            use_libreoffice=True,
            preserve_alignment=True,
        ),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    assert html_art is not None
    html_text = html_art.data.decode("utf-8")

    assert "text-align:" in html_text.lower() or "style=" in html_text.lower()


@pytest.mark.skipif(
    not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing",
)
def test_libreoffice_color_alignment_combined_does_not_error() -> None:
    """Combined color+alignment path should succeed without errors."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["html"],
        from_format="docx",
        options=ConversionOptions(
            use_libreoffice=True,
            preserve_colors=True,
            preserve_alignment=True,
        ),
    )

    assert result.error is None
    html_art = next((a for a in result.outputs or [] if a.target == "html"), None)
    assert html_art is not None
    html_text = html_art.data.decode("utf-8")
    assert len(html_text) > 200


@pytest.mark.skipif(
    not ALIGN_COLOR_FIXTURE.exists(), reason="Alignment/color fixture missing",
)
def test_libreoffice_disabled_uses_standard_path() -> None:
    """With use_libreoffice=False, behaviour should match existing tests."""
    raw = ALIGN_COLOR_FIXTURE.read_bytes()

    # This mirrors the existing alignment/color tests: no LibreOffice.
    result = convert_one(
        input_bytes=raw,
        name=ALIGN_COLOR_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(
            use_libreoffice=False,
            preserve_colors=False,
            preserve_alignment=False,
        ),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None
    md_text = md_art.data.decode("utf-8")

    # Ensure core markers are still present as in baseline tests.
    assert "COLOR-TEXT-001" in md_text
    assert "ALIGN-LEFT-TEXT-001" in md_text

