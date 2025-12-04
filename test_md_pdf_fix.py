#!/usr/bin/env python3
"""Test script to verify the MD→PDF underscore fix."""

from pathlib import Path
import sys

# Add parent directory to path so we can import the convert service
sys.path.insert(0, str(Path(__file__).parent))

from convert_backend.convert_service import convert_one

# Read the input markdown
input_md = Path("/Users/cav/dev/TinyUtils/fuckups/Input_Md_KevinReview.md")
input_bytes = input_md.read_bytes()

# Convert to PDF
print("Converting MD→PDF with fix...")
result = convert_one(
    input_bytes=input_bytes,
    name="Input_Md_KevinReview.md",
    targets=["pdf"],
    from_format="markdown",
)

# Save the output PDF
output_pdf = Path("/Users/cav/dev/TinyUtils/fuckups/TinyUtils_Output_KevinReview_FIXED.pdf")
if result.outputs:
    output_pdf.write_bytes(result.outputs[0].data)
    print(f"✅ PDF saved to: {output_pdf}")
    print(f"📊 Logs: {result.logs}")
else:
    print(f"❌ Error: {result.error}")
    sys.exit(1)
