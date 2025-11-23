### Major changes — 2025-11-21 10:30 CET (UTC+01:00) — Add Multi-file Search & Replace tool

Added
• New Edge API `/api/multi-file-search-replace` with http(s)-only + private host blocking, timeouts, single retry with jitter, size caps, diff truncation, and JSON envelopes with request-id.
• New UI page `/tools/multi-file-search-replace/` aligned with existing tool shells (hero, aria-live status, sticky diff pane, guarded Cmd/Ctrl+Enter, ad/CMP/theme parity, preview-bypass header support).
• Site wiring: tools hub card, sitemap entry, and tests covering happy path, zero matches, and invalid regex.

Modified
• None.

Fixed
• None.

Human-readable summary
Introduced a bulk search & replace tool that converts uploads to text, shows safe diffs, and lets you download only the changed files. The backend now enforces host safety, timeouts, and size limits, while the frontend matches the other TinyUtils tools with live status, sticky diffs, and preview-bypass handling for protected previews.

Impact
• Users can preview and download multi-file find/replace results safely with regex support. ✅
• Site navigation and sitemap now include the tool for discovery and SEO. ✅

Testing
• `npm test -- tests/multi-file-search-replace.test.mjs` ✅

Commits
• (pending in working tree)

### Major changes — 2025-11-23 12:30 CET (UTC+01:00) — WS3 risk-reduction hardening

Added
• Clear 400 JSON envelope for unsupported export formats via a small allowlist (md/markdown and txt/text only).
• Targeted tests to cover invalid exportFormat handling and ZIP entry name sanitisation.

Modified
• Hardened ZIP entry naming so downloaded archives no longer contain absolute paths, drive letters, or traversal segments; all names are normalised to safe relative paths.
• Updated the results summary copy after preview to highlight total files, total matches, and how many files actually changed.
• Added a lightweight confirmation step before destructive runs (global replacements with empty replacement or very large match counts), using the last preview stats when available.

Fixed
• Path traversal risk in ZIP exports
  - **Problem:** User-supplied file names could be propagated into ZIP entry names with `..`, absolute paths, or Windows drive prefixes.
  - **Root cause:** The original ZIP builder did not normalise or sanitise entry names before writing headers.
  - **Fix:** Introduced stricter name normalisation (separator unification, absolute prefix stripping, `.`/`..` removal) before adding entries to the archive.
  - **Evidence:** `tests/multi-file-search-replace.test.mjs` now decodes the ZIP and asserts entry names have no leading `/`, drive letters, or `..` segments. Log: `artifacts/ws3-mfsr/20251123/node-test-mfsr.log`.

Human-readable summary

This pass tightens the safety of Multi-file Search & Replace without changing how it feels to use. The backend now rejects bogus export formats instead of silently guessing, and ZIP downloads are built with cleaned-up paths so archives cannot contain sneaky `../` or drive-letter prefixes. On the front end, the summary after a preview clearly shows how many files and matches are involved, and obviously destructive runs (like global replace to empty across many matches) ask for a quick confirmation so you don’t wipe content by accident.

Impact
• Bulk replacements produce ZIPs with safe, normalised entry names that are easier to inspect and safer to unpack. ✅
• Users get clearer feedback when an export format is unsupported instead of mysterious failures. ✅
• Destructive search/replace runs are less likely to be triggered by mistake thanks to the confirmation guard. ✅

Testing
• `node --test tests/multi-file-search-replace.test.mjs` ✅
• `node --test` (full suite) ✅

Commits
• (pending in working tree)

### Major changes — 2025-11-23 21:50 CET (UTC+01:00) — WS5a regression test for missing_search

Added
• A focused regression test in `tests/multi-file-search-replace.test.mjs` that covers the "missing search pattern" edge case, asserting a 400 JSON envelope with `meta.error = 'Search pattern is required'` and `meta.note = 'missing_search'` when no search term is provided.

Modified
• None; the backend behaviour was already present from WS3 and remains unchanged, this entry simply documents the new test coverage.

Fixed
• None.

Human-readable summary

Multi-file Search & Replace already rejected requests without a search pattern, but that behaviour wasn’t covered by tests. WS5a adds a small regression test to make sure the handler continues to return a clear 400 error with a stable `missing_search` note instead of silently doing nothing, which helps catch regressions early.

Impact
• Better safety net for an important validation rule (you can’t run a bulk replace without a search pattern), with no change in user-facing behaviour. ✅

Testing
• `node --test tests/multi-file-search-replace.test.mjs` ✅
• `node --test` (full suite) ✅

Commits
• (pending) test(multi-file-search-replace): add missing_search regression case
