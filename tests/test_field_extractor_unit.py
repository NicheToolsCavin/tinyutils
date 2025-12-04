"""Unit tests for field_extractor helpers."""
from __future__ import annotations

from pathlib import Path

import pytest

from convert_backend.field_extractor import extract_fields_from_docx, summarise_fields


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
FIELDS_FIXTURE = FIXTURE_DIR / "fields_sample.docx"


@pytest.mark.skipif(
    not FIELDS_FIXTURE.exists(),
    reason="Fields fixture missing",
)
def test_extract_fields_from_docx_finds_expected_types() -> None:
    """Extractor should find a mix of PAGE/DATE/TOC/SEQ fields."""
    fields = extract_fields_from_docx(FIELDS_FIXTURE)
    assert fields, "expected at least one field definition"

    counts = summarise_fields(fields)
    # The fixture is designed to contain several common field types.
    assert {"PAGE", "DATE", "SEQ"} & counts.keys(), "expected core field types present"


@pytest.mark.skipif(
    not FIELDS_FIXTURE.exists(),
    reason="Fields fixture missing",
)
def test_field_entries_include_code_and_switches() -> None:
    """Parsed field entries should expose type, code, and switches."""
    fields = extract_fields_from_docx(FIELDS_FIXTURE)
    assert fields, "expected some fields"

    sample = fields[0]
    assert "type" in sample
    assert "code" in sample
    assert "switches" in sample

