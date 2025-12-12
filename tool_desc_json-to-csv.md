### Major changes — 2025-11-27 17:15 CET (UTC+01:00) — Initial release of Smart JSON ↔ CSV Converter

Added
• New backend endpoint `/api/json_tools` (`api/json_tools.py`) with two modes: `json_to_csv` (flatten nested JSON/JSONL into CSV) and `csv_to_json` (CSV/TSV to JSON array).
• JSON flattening helper that converts nested objects into dot-separated keys (e.g. `{"user": {"id": 1}}` → `user.id`) and represents arrays as pipe-joined strings (`a|b|c`) for CSV-friendly output.
• CSV hardening for all generated CSV rows so any value starting with `=`, `+`, `-`, or `@` is prefixed with a single quote to avoid spreadsheet formula execution.
• New Svelte tool page `/tools/json-to-csv/` with a mode switcher (JSON→CSV or CSV→JSON), file snippet preview, and a single “Download converted file” action.
• Tools hub entry in the “More tools” grid so the converter is discoverable under Data/Developer-oriented helpers.

Modified
• None.

Fixed
• None (new tool).

Human-readable summary

This change adds a **Smart JSON ↔ CSV Converter** that bridges developer-style JSON logs and business-user spreadsheets. When converting JSON to CSV, the API accepts either standard JSON arrays/objects or JSON Lines (one JSON object per line), flattens nested structures into `foo.bar` columns, and unifies headers across all records. When going the other direction, it reads CSV/TSV with auto-detected delimiters and returns a straightforward JSON array of objects keyed by the header row. The UI keeps things simple: pick a direction, drop a file, preview the first few hundred characters, and download the converted result.

Impact
• Makes it easy to turn complex JSON/JSONL log files into spreadsheet-ready CSV tables for analysis and reporting. ✅
• Provides a fast way to turn ad‑hoc CSV exports back into JSON arrays without writing scripts. ✅
• Ensures CSV outputs are hardened against spreadsheet formula injection, consistent with other TinyUtils CSV exports. ✅

Testing
• Manual round‑trip checks with nested JSON payloads, JSONL logs, and simple CSV fixtures to verify flattening, header union, and delimiter detection. ✅

Commits
• (pending) feat(json-tools): add /api/json_tools endpoint and JSON↔CSV Svelte tool

### Major changes — 2025-12-12 18:27 CET (UTC+01:00) — Python 3.13+ multipart parsing compatibility

Added
• New helper `api/_lib/multipart.py` that parses `multipart/form-data` uploads via the stdlib `email` module (avoids removed `cgi`).

Modified
• `/api/json_tools` (`api/json_tools.py`) now uses `parse_multipart_form(...)` for multipart parsing.

Fixed
• JSON↔CSV uploads no longer fail on Python 3.13+ where `import cgi` raises `ModuleNotFoundError`.

Human-readable summary

**Problem: uploads broke on newer Python**

The JSON↔CSV backend used Python’s old `cgi` module to read uploaded files. Newer Python versions removed `cgi`, which can crash uploads before the converter sees the file.

**The fix: modern multipart parsing**

TinyUtils now parses file uploads using a small helper built on Python’s `email` module (still standard library). The API behavior stays the same, but the tool works again on modern Python runtimes.

Impact
• Keeps `/api/json_tools` working on Python 3.13+ (local dev + future runtime upgrades). ✅

Testing
• `pnpm test` (includes Python import checks + multipart unit coverage) ✅
• `.venv/bin/pytest -q` ✅

Commits
• (pending) fix(json-tools): replace deprecated cgi multipart parsing
