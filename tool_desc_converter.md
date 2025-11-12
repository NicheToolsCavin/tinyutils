## Converter Tool — Description and Change Log

### Major changes — 2025-11-12 PM CET (UTC+01:00)

Added
• Extended API Options model with normalization fields: `normalizeLists`, `normalizeUnicode`, `removeNbsp`, `wrap`, `headers`, `asciiPunctuation` to support advanced pandoc cleanup options.
• `preview` parameter to ConvertRequest model; when set to `true`, API returns preview metadata (headings/snippets/images) without full conversion.
• Lua filter infrastructure: created `/filters` directory with `softbreak_to_space.lua`, `strip_empty_spans.lua`, `normalize_lists.lua` for pandoc normalization pipeline.
• API utility modules in `api/_lib/` (blob, utils, pandoc_runner, text_clean, manifests, regex_tools) to support conversion logic.
• HTML-to-Markdown lander page at `/html-to-markdown/` (already present in sitemap).

Modified
• API now accepts and validates extended options; ready for backend wiring to pandoc_runner when normalization toggles are enabled.

Removed
• None.

Human-readable summary
Closed gaps between the Universal Converter spec and current implementation. The API now supports preview-first requests (UI can call with `preview=true` to get document structure before full conversion) and accepts extended normalization options. Lua filters are in place for pandoc pipeline cleanup. The html-to-markdown lander completes the initial SEO lander set. Backend wiring of options to pandoc runner remains pending but contract is ready.

Impact
• Preview-first flow: UI can request document metadata without full conversion, enabling faster feedback.
• Extended options contract: API accepts normalization parameters; backend can wire these to pandoc without breaking existing clients.
• Lua filters: Normalization pipeline infrastructure ready for activation.
• Lander coverage: All primary conversion routes (docx/rtf/html → markdown) now have dedicated entry points.

Notes / follow-ups
• Wire extended Options (normalizeLists, normalizeUnicode, etc.) to pandoc_runner extra_args in convert batch logic.
• Enable preview-first mode in backend conversion flow (check request.preview flag).
• Batch ZIP input/output handling remains future work.
• Test preview smoke and prod smoke workflows.

### Major changes — 2025-11-12 CET (UTC+01:00)

Added
• New static UI at `/tools/text-converter/` supporting paste or file upload; formats: .md, .txt, .html, .docx, .rtf (input); targets: md, txt, html, docx, rtf.
• Options UI wired to API for `acceptTrackedChanges`, `extractMedia`, `removeZeroWidth`.
• Preview (MVP) panel that renders headings/snippets/images when `preview` is present in the API response.
• SEO landers: `/docx-to-markdown/`, `/rtf-to-markdown/`, `/html-to-markdown/` redirect to the converter with presets.
• Sitemap entries for the converter and landers.

Modified
• Text Converter UI now maps API fields accurately (`target`→format, `name`→filename, `blobUrl` for download); removed reliance on non-existent `data.ok`.
• Canonical link on converter page is site-relative (`/tools/text-converter/`).

Removed
• None.

Human-readable summary
The Universal Converter is now visible in the UI. Users can paste or upload a document (Word/RTF/HTML/Markdown/Text), pick output formats, and download results. Basic options (accept tracked changes, extract media, remove zero-width) are available. A simple preview panel appears when the backend returns preview metadata. We also added SEO-friendly landers for common conversions and listed them in the sitemap.

Impact
• Users can run docx→md/html/txt and similar flows directly from the tools page; batch ZIP and full normalization presets remain future work.
• Existing API contract is honored (no breaking changes); UI no longer assumes differing field names.
• Landers provide shareable routes for specific conversions; sitemap updated accordingly.

Notes / follow-ups
• Batch ZIP input, media packaging as ZIP, and extended normalization toggles (`normalizeLists`, `normalizeUnicode`, `wrap`, `headers`, `asciiPunctuation`) are planned; UI stubs can be surfaced once backend wiring lands.
• Add Lua filters under `/filters` and wire in `pandoc_runner` for full cleanup parity.
• Consider switching canonical domains at release time to production domain.

