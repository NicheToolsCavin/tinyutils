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
