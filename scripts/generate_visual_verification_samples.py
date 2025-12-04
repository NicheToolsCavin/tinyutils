#!/usr/bin/env python3
"""Generate visual verification samples for Phase 4.5.

This script converts all test fixtures to multiple output formats
to create a visual verification packet for multimodal AI review.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from convert_backend.convert_service import convert_one

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "visual_verification_phase4.5"

# Define conversion matrix: fixture -> (from_format, [target_formats])
CONVERSION_MATRIX = {
    "rtf_sample.rtf": ("rtf", ["md", "docx", "html"]),
    "latex_complex_sample.tex": ("latex", ["md", "docx", "html"]),
    "docx_footnotes_sample.docx": ("docx", ["md", "html"]),
    "odt_footnotes_sample.odt": ("odt", ["md", "docx", "html"]),
    "report_2025_annual.pdf": ("pdf", ["md", "html"]),
}


def generate_samples() -> None:
    """Generate conversion samples for all fixtures."""
    print("🎨 Generating visual verification samples...\n")

    for fixture_name, (from_format, targets) in CONVERSION_MATRIX.items():
        fixture_path = FIXTURES_DIR / fixture_name

        if not fixture_path.exists():
            print(f"⚠️  Skipping {fixture_name} (not found)")
            continue

        # Determine output subdirectory
        subdir_name = fixture_name.replace("_sample", "").replace(".rtf", "").replace(".tex", "").replace(".docx", "").replace(".odt", "").replace(".pdf", "")
        output_subdir = OUTPUT_DIR / subdir_name
        output_subdir.mkdir(parents=True, exist_ok=True)

        # Copy source fixture to output directory for reference
        source_dest = output_subdir / fixture_name
        source_dest.write_bytes(fixture_path.read_bytes())
        print(f"📄 {fixture_name}")
        print(f"   └─ Copied source to {source_dest.relative_to(OUTPUT_DIR.parent)}")

        # Convert to each target format
        raw = fixture_path.read_bytes()

        for target in targets:
            try:
                result = convert_one(
                    input_bytes=raw,
                    name=fixture_name,
                    targets=[target],
                    from_format=from_format,
                )

                if result.error:
                    print(f"   └─ ❌ {from_format}→{target}: {result.error}")
                    continue

                if not result.outputs:
                    print(f"   └─ ❌ {from_format}→{target}: No output")
                    continue

                # Save output
                output_artifact = result.outputs[0]
                output_filename = f"{fixture_path.stem}_converted.{output_artifact.target}"
                output_path = output_subdir / output_filename
                output_path.write_bytes(output_artifact.data)

                size_kb = len(output_artifact.data) / 1024
                print(f"   └─ ✅ {from_format}→{target}: {output_filename} ({size_kb:.1f} KB)")

            except Exception as exc:
                print(f"   └─ ❌ {from_format}→{target}: {exc}")

        print()

    print(f"✨ All samples generated in {OUTPUT_DIR.relative_to(OUTPUT_DIR.parent)}\n")


if __name__ == "__main__":
    generate_samples()
