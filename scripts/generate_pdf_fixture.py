#!/usr/bin/env python3
"""Generate PDF fixture from DOCX using TinyUtils converter."""
from pathlib import Path
import sys

# Add parent to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from convert_backend.convert_service import convert_one

def main():
    fixtures_dir = ROOT / "tests" / "fixtures" / "converter"
    input_docx = fixtures_dir / "report_2025_annual.docx"
    output_pdf = fixtures_dir / "report_2025_annual.pdf"

    if not input_docx.exists():
        print(f"❌ Input not found: {input_docx}")
        return 1

    print(f"Converting {input_docx.name} → PDF...")
    input_bytes = input_docx.read_bytes()

    result = convert_one(
        input_bytes=input_bytes,
        name=input_docx.name,
        targets=["pdf"],
        from_format="docx",
    )

    if result.error:
        print(f"❌ Conversion failed: {result.error.message}")
        return 1

    if not result.outputs:
        print("❌ No outputs generated")
        return 1

    pdf_output = result.outputs[0]
    output_pdf.write_bytes(pdf_output.data)
    print(f"✅ PDF generated: {output_pdf.name} ({pdf_output.size:,} bytes)")

    if result.logs:
        print(f"📋 Logs: {', '.join(result.logs)}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
