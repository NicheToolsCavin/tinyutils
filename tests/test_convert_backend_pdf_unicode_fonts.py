from __future__ import annotations

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


def test_markdown_to_pdf_uses_dejavu_for_ipa(monkeypatch) -> None:
    """Ensure IPA symbols use a Unicode-capable font in the ReportLab fallback PDF path."""

    # Force ReportLab fallback for deterministic behavior.
    monkeypatch.delenv("PDF_RENDERER_URL", raising=False)

    md = "# IPA\n\nSymbols: ɪ ə ʃ ŋ θ\n"
    result = convert_one(
        input_bytes=md.encode("utf-8"),
        name="ipa.md",
        targets=["pdf"],
        from_format="markdown",
        options=ConversionOptions(),
    )

    assert result.error is None
    pdf_art = next((a for a in result.outputs or [] if a.target == "pdf"), None)
    assert pdf_art is not None
    assert pdf_art.data

    # DejaVu font names should be present in the PDF when ReportLab is used.
    assert b"DejaVuSans" in pdf_art.data

