### Major changes — 2025-11-27 17:20 CET (UTC+01:00) — Initial release of Bulk PDF Text Extractor

Added
• New backend endpoint `/api/pdf_extract` (`api/pdf_extract.py`) that accepts a ZIP upload (up to 50MB, max 50 PDFs) and returns a ZIP of `.txt` files extracted with `pypdf`.
• Per-file extraction loop that processes each PDF page-by-page via `PdfReader`, concatenating text with blank lines and preserving original filenames (e.g. `Report_2025.pdf` → `Report_2025.txt`).
• Error reporting via an optional `_conversion_report.txt` entry inside the output ZIP, listing any corrupted, password-protected, non-PDF, or over-limit files that were skipped.
• New Svelte tool page `/tools/pdf-text-extractor/` with a ZIP dropzone, clear size/file limits, and a single “Download text files (.zip)” action.
• Tools hub entry advertising the extractor for research, legal review, and AI data preparation workloads.

Modified
• Existing Python `requirements.txt` already includes `pypdf` via `api/convert/requirements.txt`; no additional dependency wiring required, but this tool now relies on that existing dependency at runtime.

Fixed
• None (new tool).

Human-readable summary

This change introduces a **Bulk PDF Text Extractor** tailored for people sitting on folders of PDFs—researchers, lawyers, and anyone building AI corpora. Instead of opening each document and copy‑pasting its text, users compress a folder of PDFs into a ZIP, upload it, and receive a matching ZIP of `.txt` files. The backend uses `pypdf` (no OCR) to walk each page and extract digital text layers while skipping non-PDF entries. Any failures or skips are summarized in `_conversion_report.txt` so users can see exactly which files need manual attention.

Impact
• Makes it practical to transform a library of digital PDFs into a searchable, scriptable text corpus in one step. ✅
• Provides a lightweight pre-processing path for AI/LLM workflows without introducing heavy OCR dependencies into the TinyUtils stack. ✅

Testing
• Manual tests with small ZIP archives containing a mix of simple PDFs, non-PDF files, and intentionally broken PDFs to validate text extraction, limits, and error report generation. ✅

Commits
• (pending) feat(pdf-extract): add /api/pdf_extract endpoint and Bulk PDF Text Extractor tool page

