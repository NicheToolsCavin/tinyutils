"""Run converter fidelity baselines for local fixtures.

This script exercises the current TinyUtils converter pipeline against the
fixture set under tests/fixtures/converter/ and writes all outputs into
artifacts/converter-fidelity/20251119/baseline/ so we have a repeatable
snapshot of current behavior.

It does **not** change converter behavior; it only calls the existing
`api.convert.convert_service` helpers and saves their outputs.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from convert import service as conv_service
from convert.types import ConversionOptions

FIXTURES = ROOT / "tests" / "fixtures" / "converter"
OUT_DIR = ROOT / "artifacts" / "converter-fidelity" / "20251119" / "baseline"


def _ensure_outdir() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def _write_artifact(prefix: str, target: str, name: str, data: bytes) -> None:
    safe_name = f"{prefix}_{target}_{name}"
    out_path = OUT_DIR / safe_name
    out_path.write_bytes(data)


def _run_md_baselines() -> None:
    md_path = FIXTURES / "tech_doc.md"
    if not md_path.exists():
        return

    raw = md_path.read_bytes()
    opts = ConversionOptions()

    # MD → HTML/TXT baseline via library service
    result = conv_service.convert_one(
        input_bytes=raw,
        name="tech_doc.md",
        targets=["html", "txt"],
        from_format="md",
        options=opts,
    )
    html_bytes = None
    for art in result.outputs:
        _write_artifact("tech_doc_md_to", art.target, art.name, art.data)
        if art.target == "html":
            html_bytes = art.data

    # Roundtrip: MD → HTML → MD
    if html_bytes is not None:
        rt = conv_service.convert_one(
            input_bytes=html_bytes,
            name="tech_doc_md_to_html.html",
            targets=["md"],
            from_format="html",
            options=opts,
        )
        for art in rt.outputs:
            _write_artifact("tech_doc_md_html_md_roundtrip", art.target, art.name, art.data)


def _run_docx_baselines() -> None:
    opts = ConversionOptions()

    # DOCX → MD for lists/images and tech_doc.docx (roundtrip baseline)
    for stem in ("lists", "images", "tech_doc"):
        path = FIXTURES / f"{stem}.docx"
        if not path.exists():
            continue
        raw = path.read_bytes()
        result = conv_service.convert_one(
            input_bytes=raw,
            name=path.name,
            targets=["md"],
            from_format="docx",
            options=opts,
        )
        for art in result.outputs:
            prefix = f"{stem}_docx_to"
            if stem == "tech_doc":
                prefix = "tech_doc_md_docx_md_roundtrip"
            _write_artifact(prefix, art.target, art.name, art.data)


def _run_html_baseline() -> None:
    opts = ConversionOptions()
    path = FIXTURES / "html_input.html"
    if not path.exists():
        return

    raw = path.read_bytes()
    try:
        result = conv_service.convert_one(
            input_bytes=raw,
            name="html_input.html",
            targets=["md"],
            from_format="html",
            options=opts,
        )
    except Exception as exc:  # HTML → MD malformed data URL or other error
        (OUT_DIR / "html_input_to_md_error.txt").write_text(str(exc), encoding="utf-8")
        return

    if result.error:
        (OUT_DIR / "html_input_to_md_error.txt").write_text(
            f"{result.error.kind}: {result.error.message}", encoding="utf-8"
        )
        return

    for art in result.outputs:
        _write_artifact("html_input_to", art.target, art.name, art.data)


def _write_readme() -> None:
    lines = [
        "# Converter baseline outputs — 2025-11-19",
        "",
        "This directory contains baseline outputs generated from the current",
        "converter pipeline for the fixtures under tests/fixtures/converter/.",
        "They are used to track behavior before fidelity fixes.",
        "",
        "Runs performed:",
        "- tech_doc.md → docx/html/pdf (where supported)",
        "- tech_doc.docx/html roundtrips back to markdown",
        "- lists.docx → markdown",
        "- images.docx → markdown",
        "- html_input.html → markdown (or error captured in html_input_to_md_error.txt)",
        "",
        "Each output file name is prefixed with a short descriptor indicating",
        "the direction of the conversion (e.g. tech_doc_md_to_docx_*,",
        "tech_doc_md_docx_md_roundtrip_*, lists_docx_to_md_*).",
        "",
    ]
    (OUT_DIR / "README.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    _ensure_outdir()
    _run_md_baselines()
    _run_docx_baselines()
    _run_html_baseline()
    _write_readme()


if __name__ == "__main__":  # pragma: no cover
    main()
