"""Unit tests for paragraph_extractor helpers."""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.paragraph_extractor import extract_paragraph_styles


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
PARA_FORMAT_FIXTURE = FIXTURE_DIR / "paragraph_formatting_sample.docx"


@pytest.mark.skipif(
    not PARA_FORMAT_FIXTURE.exists(),
    reason="Paragraph formatting fixture missing",
)
def test_extract_paragraph_styles_returns_marked_paragraphs() -> None:
    """Extractor should return paragraphs including known marker text."""
    data = extract_paragraph_styles(PARA_FORMAT_FIXTURE)
    paragraphs = data.get("paragraphs") or []

    assert paragraphs, "expected at least one paragraph entry"
    texts = {p.get("text", "") for p in paragraphs}

    # Reuse markers from existing paragraph_formatting tests to keep
    # expectations aligned.
    assert any("INDENT-FIRST-TEXT-001" in t for t in texts)
    assert any("SPACING-BEFORE-001" in t for t in texts)
    assert any("LINE-SINGLE-001" in t for t in texts)


@pytest.mark.skipif(
    not PARA_FORMAT_FIXTURE.exists(),
    reason="Paragraph formatting fixture missing",
)
def test_paragraph_styles_include_basic_metadata() -> None:
    """Each extracted paragraph should expose text, style, and alignment."""
    data = extract_paragraph_styles(PARA_FORMAT_FIXTURE)
    paragraphs = data.get("paragraphs") or []

    assert paragraphs, "expected paragraphs metadata"
    sample = paragraphs[0]
    assert "text" in sample
    assert "style" in sample
    assert "alignment" in sample

