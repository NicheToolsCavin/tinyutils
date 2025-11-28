### Major changes — 2025-11-27 17:10 CET (UTC+01:00) — Initial release of Big CSV Joiner

Added
• New backend endpoint `/api/csv_join` implemented as a Python handler (`api/csv_join.py`) that supports a two-stage workflow: header scan and hash join on a chosen column.
• Streaming-friendly hash join for two CSV/TSV files with automatic delimiter detection (comma, tab, semicolon) and configurable join type (`inner` or `left`).
• CSV hardening on all outputs (including headers) so any cell starting with `=`, `+`, `-`, or `@` is prefixed with a single quote to avoid spreadsheet formula execution.
• New Svelte tool page `/tools/csv-joiner/` with a three-step flow (upload, configure join keys, download) and automatic suggestion of matching columns when header names overlap.
• Tools hub wiring so the CSV Joiner appears in the “More tools” grid with icon, copy, and badges.

Modified
• None.

Fixed
• None (new tool).

Human-readable summary

This change introduces **Big CSV Joiner**, a data tool that lets you merge two CSV/TSV files by a shared column (like Email or Customer ID) without relying on Excel VLOOKUP or Google Sheets. Under the hood, the backend first inspects both files to detect delimiters and headers, then performs a hash join where file B is loaded into memory and file A is streamed row by row. The UI guides users through uploading exactly two files, picking match columns (auto-suggested when header names match), choosing between an inner or left join, and downloading the result as a hardened CSV that is safe to open in spreadsheets.

Impact
• Users can now perform VLOOKUP-style joins on large CSV files in the browser without running into spreadsheet limits or crashes. ✅
• Output CSVs are hardened against formula injection, aligning with existing CSV security practices in other TinyUtils tools. ✅

Testing
• Manual end-to-end checks via `/tools/csv-joiner/` using sample CSVs with matching and non-matching keys, delimiter variations, and values starting with `=`, `+`, `-`, and `@`. ✅

Commits
• (pending) feat(csv-joiner): add /api/csv_join endpoint and Svelte tool page

