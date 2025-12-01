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

### Major changes — 2025-12-01 07:45 CET (UTC+01:00) — Single PDF uploads + clearer UI

Added
• Support for uploading a single PDF file to `/api/pdf_extract` alongside the existing ZIP-of-PDFs bulk mode.
• Updated Svelte tool page `/tools/pdf-text-extractor/` so the upload input accepts `.pdf`, `.zip`, `application/pdf`, and `application/zip`, with helper text that clearly lists the accepted types and 50MB cap.
• New preview tests/smokes covering single-PDF uploads: a `pdf_extract` single-PDF test in `tests/data_tools_preview.test.mjs` and additional checks in `scripts/smoke_data_tools_preview.mjs` for the single-PDF path and the UI `accept` attribute.

Modified
• Backend handler `api/pdf_extract.py` now detects whether the uploaded payload is a ZIP or a single PDF (using `zipfile.is_zipfile`), still enforces a 50MB upload limit, and always returns a ZIP of `.txt` files.
• For single-PDF uploads, the endpoint extracts text from all pages and wraps the result in a ZIP containing `document.txt`, preserving the ZIP output contract used by the bulk mode.

Fixed
• Confusing ZIP-only UX on the tool page (it previously implied that only ZIP uploads were supported). The upload widget now advertises both PDFs and ZIPs explicitly.

Human-readable summary

**Problem: ZIP-only UI for a PDF text tool**

Previously, Bulk PDF Text Extractor only advertised and accepted ZIP uploads, which felt odd for a “PDF” tool and made it easy to assume single PDFs were unsupported. Users had to zip a folder just to extract text from one document, and the file input’s `accept` hinted ZIP-only behavior.

**The fix: accept both single PDFs and ZIPs, same output**

Now the tool happily accepts either a single PDF or a ZIP of PDFs. If you upload a ZIP, it behaves as before: each PDF becomes a `.txt` file in an output ZIP, plus an optional `_conversion_report.txt` summarizing any failures. If you upload just one PDF, the backend still returns a ZIP, but with a single `document.txt` inside, so download behavior is consistent and easy to script. The UI copy and input `accept` attribute have been updated so it’s crystal clear that `.pdf` and `.zip` are both valid.

Impact
• Makes the PDF extractor less confusing for one-off use: you can drag a single PDF straight into the tool without zipping it first. ✅
• Keeps the automation-friendly contract (always a ZIP of `.txt` files), so existing bulk workflows and scripts continue to work unchanged. ✅

Testing
• Local backend exercised with both ZIP-of-PDFs and single-PDF uploads to confirm 200/application-zip responses and sensible `.txt` output for known fixtures. ✅
• Preview-level tests wired via `tests/data_tools_preview.test.mjs` and `scripts/smoke_data_tools_preview.mjs` to hit `/api/pdf_extract` with ZIP and single-PDF payloads, plus a UI smoke that inspects the `accept` attribute on `/tools/pdf-text-extractor/`. On the current preview, ZIP-mode checks pass; single-PDF checks fail with 422 until this backend change is deployed. ✅

Commits
• (pending) feat(pdf-extract): accept single PDF uploads and clarify accepted types in Bulk PDF Text Extractor UI.

