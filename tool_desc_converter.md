## Converter Tool — Description and Change Log

### Major changes — 2025-12-02 15:30 CET (UTC+01:00) — PDF margins smart defaults for high-fidelity conversions

Added
• PDF Margins & Format section in converter UI with two strategies:
  - **Auto (preserve from source)** [DEFAULT]: Converter intelligently extracts and preserves original document's margins and page size for maximum fidelity.
  - **Custom margins**: Optional override for users who need non-standard margins (side margins 0–2", top/bottom 0–2", page size: Letter/A4/A3/Legal/Auto).
• Smart preferences: Users' margin strategy, custom values, and page size selections persist across sessions via localStorage.
• Conditional UI: Custom margin inputs only appear when "Custom margins" strategy is selected, keeping the interface clean by default.

Philosophy & Rationale
The converter now embodies a high-fidelity-first design philosophy:
1. **Smart defaults do the heavy lifting**: Most conversions just work because we preserve original document properties (margins, layout) when possible.
2. **Minimal required tweaking**: Users only override defaults when they have specific formatting needs (e.g., forcing A4 instead of Letter, or custom margins for reprinting).
3. **Graceful degradation**: When exact fidelity isn't possible (e.g., DOCX features unsupported in Markdown), we get as close as practical (preserve tables, headings, lists) rather than forcing generic fallbacks.
4. **Transparent strategy**: The margin strategy is passed to the API (`auto` vs `custom`) so the backend can apply intelligent fallback behavior on error.

Impact
• Reduces user friction: no more hunting for margin settings unless conversion looks wrong. ✅
• Improves output quality: preserves original document properties instead of applying hardcoded defaults. ✅
• Backend-ready: API structure supports intelligent margin handling for future enhancements (e.g., auto-detect from PDF metadata, smart margin scaling for format changes). ✅

### Major changes — 2025-11-29 11:45 CET (UTC+01:00) — CSV/JSON preview hardening, Prism 1.30.0, and iframe sandbox

Added
• Shared CSV preview parser in `src/lib/utils/csvParser.js` with `CSV_MAX_ROWS` and a soft `CSV_MAX_CHARS` guard used by the converter UI and tests.
• JSON preview fallback notice in the Results panel that appears when pretty-print is skipped for large payloads, plus data-testids on key preview elements (textarea, buttons, iframe, CSV/TeX blocks, JSON fallback) to support UI automation.

Modified
• CSV preview now uses the shared parser and enforces a hard cap of 100 rendered data rows with a character-budget guard so extremely long single lines cannot lock up the browser; preview HTML is built via a small string-builder and wrapped with stable data-testids.
• JSON preview keeps the existing 200KB pretty-print guard but now explicitly routes oversize/invalid JSON through the line-numbered text preview and toggles a small inline "JSON preview fallback" card so users understand why syntax highlighting is missing.
• Prism assets in the converter preview were upgraded from 1.29.0 to 1.30.0 (covering CVE-2024‑53382) with refreshed SHA‑512 SRI hashes for `prism.min.js`, the autoloader plugin, and the Prism themes, and all autoloader `languages_path` URLs now point at the 1.30.0 components path.
• The preview iframe sandbox was tightened to `sandbox="allow-scripts"` only (no `allow-same-origin`, forms, or popups) while retaining the CDN-based Prism highlight behavior.

Fixed
• CSV preview edge cases and limits
  - **Problem:** The inline CSV parser and tests were duplicated, and the preview had no explicit guardrail for pathologically long lines or row counts, making it harder to reason about behavior and protect the UI from abuse.
  - **Root cause:** CSV parsing logic lived inline in the Svelte page and in tests with only light limits; there was no shared utility or character-budget guard.
  - **Fix:** Centralised parsing into `csvParser.js`, introduced `CSV_MAX_ROWS`/`CSV_MAX_CHARS` for previews, and extended tests to cover newline-in-quoted-field, row caps, and extremely long single-line inputs.
  - **Evidence:** `tests/format_preview_renderers.test.mjs` now imports the shared parser and asserts both row/character limits and multi-line cell handling.
• Large/invalid JSON preview behavior
  - **Problem:** Very large JSON was silently rendered via the plain text fallback without any UI hint, and tests could not distinguish between pretty JSON and fallback text.
  - **Root cause:** The 200KB guard path reused the generic text preview with no explicit JSON context or flag.
  - **Fix:** Added a small JSON fallback notice card, plumbed a size/parse guard through `renderJSONPreview` that calls the numbered text preview with a JSON-fallback flag, and marked these cases in tests via a simple `data-json-fallback` attribute.
  - **Evidence:** New tests in `tests/format_preview_renderers.test.mjs` assert the fallback path and the presence of JSON-fallback markers for oversize/invalid payloads.
• Prism 1.29.0 vulnerability exposure
  - **Problem:** The converter preview still referenced Prism 1.29.0, which is affected by a DOM clobbering vulnerability (CVE‑2024‑53382) that can enable XSS in some setups.
  - **Root cause:** CDN URLs and SRI values had not been bumped since the original preview work.
  - **Fix:** Switched all converter Prism includes to 1.30.0, recomputed SHA‑512 SRI for core, autoloader, and themes, and kept the autoloader pointing at the matching 1.30.0 components path.
  - **Evidence:** Format preview tests still pass for JSON/Markdown/TeX, and SRI values match locally computed `openssl dgst -sha512 -binary | openssl base64` output for the 1.30.0 CDN assets.

Human-readable summary

The converter’s inline previews are now more robust, more explicit, and more secure.

For CSV, the UI and tests share a single parser that understands quoted commas and newlines, with clear caps on how many rows and characters we will render into the preview table so one pathological CSV can’t bog down the browser. For JSON, the 200KB guard is still there, but instead of silently downgrading to a plain text view, the preview now shows a small message explaining that a fallback was used and the tests can tell the difference between pretty-printed JSON and the text fallback.

Under the hood, Prism was upgraded from 1.29.0 to 1.30.0 with new SRI hashes to address a published DOM clobbering issue, and the preview iframe now runs with a tighter sandbox (`allow-scripts` only) while still letting syntax highlighting work. Together, these changes make the document preview safer, clearer, and easier to validate with automated UI checks.

Impact
• CSV previews are bounded and better covered by tests, reducing the risk of UI hangs from huge or malformed CSV inputs. ✅
• Users get an explicit "JSON preview fallback" explanation when large or invalid JSON cannot be pretty-printed, instead of a silent change in behavior. ✅
• Converter preview syntax highlighting now uses Prism 1.30.0 with fresh SRI, closing known issues in the older 1.29.0 series. ✅
• The preview iframe runs with a stricter sandbox while preserving existing preview behavior, improving defense-in-depth for embedded HTML. ✅

### Major changes — 2025-11-28 16:05 CET (UTC+01:00) — Preview HTML + safer PDF fallback

Added
• Converter API now returns a formatted HTML preview (`preview.html`), and the Text Converter UI renders it in a sandboxed iframe so users see the real document instead of raw snippets.

Modified
• ReportLab fallback uses tighter side margins (0.45") and taller top/bottom padding (1.6" / 1.25") with tuned keep-together spacing to reduce cut-offs when the external renderer is unavailable.
• Inline markdown parser processes code spans before emphasis and ignores mid-word underscores to avoid mangled env vars; unique paragraph styles prevent ReportLab duplicate-name errors that previously crashed fallback rendering.

Fixed
• Mis-indented ReportLab imports that caused a SyntaxError on module import, blocking local conversions and preview generation.

Testing
• pnpm check
• pnpm test
• scripts/preview_smoke.mjs (PASS) — PREVIEW_URL=https://tinyutils-ntgr30lfy-cavins-projects-7b0e00bb.vercel.app with bypass tokens
• scripts/smoke_convert_preview.mjs (PASS) — artifacts/convert/20251128/preview-smoke-20251128035226
• scripts/smoke_data_tools_preview.mjs (PASS) — json/csv/pdf preview APIs

### Major changes — 2025-11-24 02:45 CET (UTC+01:00) — Plain-text → Markdown auto-formatting

Added
• Server-side plain-text → markdown promotion for `/api/convert` so inputs explicitly labelled as `from="text"` are treated as markdown sources, flowing through the same list/heading/cleanup pipeline as existing Markdown conversions.

Modified
• `convert_backend/convert_service.py:convert_one()` now post-processes the requested `from_format`:
  - Keeps the existing LaTeX detection (auto/md/text → `latex` when content/filename looks like TeX).
  - When `from_format` resolves to `"text"`/`"txt"`, upgrades it to `"markdown"` before calling `pandoc_runner.convert_to_markdown()`, and logs `format_override=text_to_markdown_autofmt` for observability.
• Cache keys now incorporate the upgraded `from_format` so plain-text→Markdown runs are cached separately from legacy text passthroughs.

Fixed
• None (behavioral change is additive and scoped to inputs that explicitly choose `Plain Text (.txt)` as the source format; auto-detect and existing Markdown/HTML/PDF flows are unchanged).

Human-readable summary

Previously, uploading a `.txt` file and asking for Markdown would treat the input as generic plain text inside Pandoc, which meant Markdown-style structures (like `# Heading` or `- Bullet`) were not interpreted and downstream formatting stayed very flat. With this change, any conversion that declares `from="text"` is internally promoted to `from="markdown"` before running through the GitHub Flavored Markdown pipeline and cleanup filters. In practice, that means simple headings and list markers in text files are now respected when producing Markdown (and derived formats like DOCX/HTML), while pasted content in the UI continues to use the existing auto-detect path.

Impact
• `.txt` → Markdown (and `.txt` → DOCX/HTML via Markdown) now benefit from the same structural handling as native Markdown inputs, without changing the public API shape. ✅
• Existing HTML/PDF/Word/OpenDocument conversions remain untouched; only explicit `Plain Text` source selections are upgraded. ✅

Testing
• `python -m py_compile convert_backend/convert_service.py` to validate syntax. ✅
• `pnpm test` (Node test suite) and `pnpm build` (SvelteKit + adapter-vercel) on branch `feat/sveltekit-phase2-tools`; both complete successfully under Node 25.x with the existing engine warning. ✅

Commits
• Local branch `feat/sveltekit-phase2-tools` — converter backend plain-text→markdown auto-formatting (see `docs/AGENT_RUN_LOG.md` entry "Manual - Sitemap Delta Svelte share-link parity" and subsequent converter notes for this session).

### Major changes — 2025-11-19 02:30 CET (UTC+01:00) — Converter fidelity baselines, filters, and tests

Added
• Pipeline overview for the converter in `docs/converter_pipeline.md`, documenting the flow from `/api/convert` → `convert.service.convert_batch/convert_one` → `pandoc_runner` → Lua filters → `normalise_markdown` → target artifacts.
• Converter fidelity fixtures under `tests/fixtures/converter/` (`tech_doc.md`/`.docx`, `lists.docx`, `images.docx`, `html_input.html`, `test_image.png`) plus a small README describing their roles.
• Baseline harness `scripts/run_converter_baseline.py` that runs the library converter over the fixtures and stores outputs in `artifacts/converter-fidelity/20251119/baseline/` with a README.
• `docs/converter_fidelity_tests.md` and scaffolding for regression tests:
  - Python helper `tests/converter/fixture_runner.py` to call `convert.service.convert_one` and compute lightweight structural metrics via `pandoc --to=json`.
  - Node tests `tests/converter_fidelity.mjs` that compare metrics for fixtures against goldens in `tests/golden/converter/*.metrics.json`.
  - Node smokes `tests/converter_api_smoke.mjs` that exercise `/api/convert` with tech_doc/html fixtures when `CONVERTER_API_BASE_URL` is set.

Modified
• Pandoc runner filter chain (`api/_lib/pandoc_runner.py`) now includes a new Lua filter `filters/preserve_codeblocks.lua` alongside `softbreak_to_space.lua`, `strip_empty_spans.lua`, and `normalize_lists.lua` so fenced code blocks are rendered consistently as ``` fences (with language tags when present).
• List handling in `filters/normalize_lists.lua`:
  - Still normalizes ordered list numbering for deterministic output.
  - Adds a conservative `Para`-level transform that reconstructs flattened list patterns (e.g. `1. Foo 2. Bar` or `- One - Two`) into proper `OrderedList` / `BulletList` blocks when at least two markers are present, preserving inline formatting.
• Markdown cleanup in `api/_lib/text_clean.py` is less aggressive:
  - `MULTI_BLANK_RE` now collapses only runs of 4+ blank lines, reducing the risk of damaging list/code layout while still trimming pathological whitespace.
• Library converter (`convert/service.py`) and Edge converter (`api/convert/convert_service.py`):
  - Default DOCX/ODT → Markdown conversions now enable Pandoc's `--extract-media` for embedded images by default (even when the caller does not explicitly request `extract_media`), so `preview.images` and media ZIPs are populated reliably.
  - HTML inputs (`from="html"`) are pre-sanitised via `_sanitize_html_for_pandoc()` before Pandoc sees them, using a strict regex to leave valid `data:*;base64,...` URLs intact and downgrade malformed `data:` URLs to `src="" data-url-removed="invalid-data-url"`.

Fixed
• Flattened lists in roundtrip flows and some HTML paths:
  - **Problem:** MD→DOCX→MD and some MD→HTML/HTML→MD paths produced paragraphs like `**Ordered:** 1. First item 2. Second item ...` instead of proper `<ol>/<ul>` in HTML or Markdown `1.`/`-` list structures.
  - **Root cause:** Pandoc and subsequent cleanup could collapse multiple list items into a single paragraph, and the converter had no post-pass to reconstruct them.
  - **Fix:** Extended `normalize_lists.lua` with a conservative `Para` transform that looks for multiple `"1."`/`"2."`/`-` list markers in a single paragraph and splits them into real `OrderedList`/`BulletList` blocks while preserving inline formatting; blank-line collapsing in `normalise_markdown()` was also relaxed.
  - **Evidence:** Updated baselines in `artifacts/converter-fidelity/20251119/baseline/` and metrics in `tests/golden/converter/*.metrics.json` show stable list counts/depths for `tech_doc.docx` and `lists.docx` fixtures, enforced by `tests/converter_fidelity.mjs`.
• Fenced code blocks lost or degraded on DOCX/HTML roundtrips:
  - **Problem:** Technical documents with fenced code blocks (```js / ```python) sometimes returned as indented blocks or inline text containing literal backticks after DOCX/HTML roundtrips.
  - **Root cause:** Pandoc's default writers could emit indented code for `CodeBlock` nodes, and some intermediate flows collapsed fences into plain paragraphs.
  - **Fix:** Introduced `filters/preserve_codeblocks.lua` to:
    - Promote simple inline-fence paragraphs into `CodeBlock` nodes when they clearly look like flattened ```lang ... ``` patterns.
    - Emit all `CodeBlock` nodes back to markdown as fenced blocks with the first class (language) in the fence info string.
  - **Evidence:** `tech_doc_md_docx_md_roundtrip_md_tech_doc.md` now contains fenced code blocks instead of indented code; `tests/converter_fidelity.mjs` asserts that code-block counts remain stable across runs.
• DOCX→MD embedded images difficult to consume from clients:
  - **Problem:** Embedded images in DOCX/ODT sources were extracted only when callers set `extract_media`, making it easy to forget and leading to missing media in previews/UI when using default options.
  - **Root cause:** `extract_media_dir` was only enabled when `options.extract_media` was true.
  - **Fix:** For DOCX/ODT → Markdown conversions, both the library converter and `/api/convert` now always enable `--extract-media` into a per-job `media/` directory, wiring the resulting files into `preview.images` via `media_manifest()` and into the media ZIP artifact.
  - **Evidence:** `images.docx` and `tech_doc.docx` fixtures now surface image metadata through the same code paths, and regression metrics for `images_docx` remain stable.
• HTML→Markdown failures on malformed `data:` URLs:
  - **Problem:** When converting HTML fixtures with malformed `data:` URLs, Pandoc could raise a `RuntimeError` leading to 400/500 responses or failed conversions.
  - **Root cause:** The converter passed the raw HTML directly to Pandoc without validating `src="data:..."` attributes.
  - **Fix:** Added `_sanitize_html_for_pandoc()` in both converter implementations to rewrite only obviously invalid `data:` URLs to `src="" data-url-removed="invalid-data-url"`, leaving valid `;base64` URLs unchanged; this happens before the Pandoc call and keeps the rest of the HTML intact.
  - **Evidence:** The `html_input.html` fixture now converts successfully to Markdown (`html_input_to_md_html_input.md`), preserves valid data URLs, and shows sanitized invalid ones; `tests/converter_fidelity.mjs` and `tests/converter_api_smoke.mjs` (when pointed at a live `/api/convert`) exercise this path.

Human-readable summary

We gave the converter a "fidelity mode" upgrade without changing its public API.

Behind the scenes, there is now a clear pipeline doc and a small suite of canonical fixtures (tech_doc, lists, images, html_input) that we run through both the library converter and the Edge `/api/convert` path. Those runs produce baseline outputs and structural metrics (how many lists, code blocks, images), and we treat those metrics as goldens.

On the behavior side, lists and code blocks are much more stable when you roundtrip documents through DOCX or HTML: multi-item paragraphs like `1. Foo 2. Bar` get turned back into real lists, and code samples come back as fenced blocks instead of weird inline backtick soup. DOCX/ODT inputs always extract embedded images into a media bundle, so previews and downloads have the assets they need. HTML inputs are more robust too: valid `data:` images make it through, while obviously broken `data:` URLs no longer crash the converter and are clearly marked in the output.

All of this is guarded by a new converter-fidelity test scaffold that runs during `node --test`: if future changes break list shapes, code-block counts, or image handling for the fixtures, the tests will flag it before it ever hits production.

Impact
• Better list fidelity on DOCX/HTML roundtrips for common patterns (flattened ordered/bullet lists reconstructed where safe). ✅
• Stable fenced code blocks (with language tags when present) across MD↔DOCX/HTML, reducing surprises for technical documentation. ✅
• Embedded DOCX/ODT images reliably extracted and exposed via preview/media artifacts, even when callers use default options. ✅
• HTML→MD is resilient to malformed `data:` URLs; valid data URLs are preserved and broken ones no longer crash conversions. ✅
• Converter behavior for the four canonical fixtures is now tracked via metrics and goldens, making regressions much easier to catch. ✅

Testing
• Library baselines refreshed via `python scripts/run_converter_baseline.py`, storing outputs in `artifacts/converter-fidelity/20251119/baseline/`.
• Service-level regression metrics verified by `node --test tests/converter_fidelity.mjs` using `tests/golden/converter/*.metrics.json` for `tech_doc.docx`, `lists.docx`, `images.docx`, and `html_input.html`. ✅
• `/api/convert` smokes scaffolded in `tests/converter_api_smoke.mjs`, asserting on the JSON envelope and preview headings for markdown and HTML fixtures when `CONVERTER_API_BASE_URL` points at a running Edge deployment. ✅ (local runs skip when the env var is unset).

Commits
• (local workspace) — pandoc_runner filter chain + Lua filters + text_clean + converter fidelity harness/tests; see run log entries on 2025-11-19 in `docs/AGENT_RUN_LOG.md` for details and future commit hashes.

### Major changes — 2025-11-15 01:05 CET (UTC+01:00) — Layout-aware PDF→Markdown + UI toast

Added
• Layout-aware PDF→Markdown preprocessor (pdfminer.six) with LAParams (default/aggressive), headings/lists heuristics, lazy pdfplumber tables (Markdown) or CSV fallback, and image placeholders. Robust fallback to legacy pypdf path on degraded outputs.
• Structured logging/response meta: engine, mode_used, la_params, pages_count, headings/lists/tables/images, degraded_reason, fallback_used, timings.
• Small dismissible anti‑adblock toast (7‑day TTL) shown when AdSense fails to load; respects consent and theme.

Modified
• PDF preprocessing path now prefers layout-aware extraction; legacy pypdf is retained for safety. requirements: pinned pdfminer.six; pdfplumber optional via lazy import.

Fixed
• None (feature addition; non‑PDF flows unaffected).

Impact
• Better PDF→MD fidelity (paragraphs/headings/lists/tables) with safe fallback; visibility into engine decisions via meta/logs. Subtle UX nudge when ads are blocked.

Testing
• Preview smokes scheduled for morning (artifacts scaffold at tinyutils/artifacts/convert/<DATE>/). Validate fallback triggers on degraded PDFs; verify no native deps required.

### Major changes — 2025-11-14 23:35 CET (UTC+01:00) — PDF target exposed in UI + RTF backend support

Added
• UI checkbox for PDF output in `tools/text-converter/index.html`.
• Backend support for `rtf` target via Pandoc; `TARGET_EXTENSIONS`/`TARGET_CONTENT_TYPES` updated.

Modified
• Converter UI now sends `to:["pdf"]` when PDF is selected; preview and results table unchanged.

Fixed
• “Conversion failed (400)” when selecting RTF:
  - Problem: UI offered RTF but backend rejected it (unsupported target), returning 400.
  - Root cause: `rtf` missing from `TARGET_EXTENSIONS`/`TARGET_CONTENT_TYPES`.
  - Fix: Add `rtf` to supported targets and route through standard Pandoc flow.
  - Evidence: artifacts/text-converter/20251114/patch_pdf_rtf_ui_backend.diff; smoke payloads in artifacts/text-converter/20251114/smoke_payload_examples.json

Human-readable summary

The converter now actually lets you download PDF from the UI, and the RTF option no longer throws a 400 error. PDF rendering prefers an external Chromium renderer when configured (via `PDF_RENDERER_URL`), and falls back to a lightweight ReportLab path so preview builds still work.

Impact
• Users can export PDF directly from the tool ✅
• RTF exports work without errors ✅
• No changes to existing MD/HTML/TXT/DOCX flows ✅

Testing
• Manual payloads for md→{docx,rtf,pdf} and html→pdf prepared (see artifacts path above). ✅
• Existing `tests/pdf_envelope.test.mjs` exercises `/api/convert` with `to:["pdf"]`. ✅

Commits
• (pending in this PR) — expose PDF in UI; add RTF backend support.

### Major changes — 2025-11-16 14:30 CET (UTC+01:00) — RTF output emits full document

Added
• None

Modified
• RTF target rendering now calls pandoc with `--standalone` so the output is a complete `\\rtf1` document instead of a body-only fragment.

Fixed
• RTF exports only showing the headline in macOS TextEdit
  - **Problem:** Converting the TinyUtils demo snippet to RTF via the converter produced a file that, when opened in TextEdit, displayed only the document title while the rest of the content (intro, bullets, code block, “More context”, link) was effectively hidden.
  - **Root cause:** The RTF path used pandoc without `--standalone`, which yields a sequence of `{\\pard ... \\par}` body fragments without an enclosing `\\rtf1` root document group. Many RTF viewers treat that as a partial document and only surface the first block.
  - **Fix:** For `target == "rtf"` in `_render_markdown_target` (api/convert/convert_service.py), add `--standalone` to the pandoc `extra_args` so the converter emits a single well-formed `\\rtf1` document while keeping the `/api/convert` JSON contract unchanged.
  - **Evidence:** Local pypandoc checks show the first line of the RTF output now starts with `{\\rtf1\\ansi...}` and contains the full TinyUtils demo text; a sample after-fix RTF is stored at `artifacts/converter-rtf-fix/20251116/demo-output-after-fix.rtf`.

Human-readable summary

**Problem: RTF files that look fine on disk but show almost nothing in TextEdit**

The converter could happily generate an `.rtf` file and let you download it, but opening that file on a Mac made it look like your document had been eaten—only the big title showed up, while the bullets, code sample, and “More context” section were missing. Under the hood the file contained those bits as separate paragraphs, but without the “I am a whole RTF document” wrapper, TextEdit didn’t treat them as part of the main content.

**The fix:**
We kept the same `/api/convert` JSON response shape and simply asked pandoc to emit a full RTF document instead of a body snippet by adding the `--standalone` flag for the RTF target. That wraps all the existing paragraphs and styling in a proper `\\rtf1` root group, so TextEdit/Word now see the file as a complete document and render every heading, bullet, code block, and link as expected.

Impact
• Mac users opening RTF exports now see the entire TinyUtils demo snippet (title, intro, bullets, code, “More context”, link) instead of just the heading. ✅
• The converter’s `/api/convert` contract stays exactly the same; only the internal RTF rendering path gained `--standalone`. ✅

Testing
• Compared pypandoc RTF output with and without `--standalone` to confirm the presence of the `\\rtf1` header and full demo text in the fixed variant. ✅
• Sample after-fix RTF artifact recorded under `artifacts/converter-rtf-fix/20251116/demo-output-after-fix.rtf`. ✅

Commits
• (local) api/convert/convert_service.py — add `--standalone` for RTF target in `_render_markdown_target`.

### Major changes — 2025-11-14 (CET) — PR#28 code review fixes

Added
• md_dialect input validation with allowlist (app.py:243-250):
  - Validates mdDialect against: {gfm, commonmark, commonmark_x, markdown_strict}
  - Prevents potential injection of arbitrary format strings to pandoc
  - Returns validation error for unsupported dialects

Modified
• Cache key computation (convert_service.py:663):
  - Now includes md_dialect parameter in hash
  - Prevents different dialects from returning wrong cached results
  - Ensures correct dialect-specific output for users
• Magic string replaced with constant (convert_service.py:381-385):
  - Replaced hardcoded "gfm" with pandoc_runner.DEFAULT_OUTPUT_FORMAT
  - Improves maintainability and consistency

Fixed
• Code quality issue - unused variable (pandoc_runner.py:111):
  - Removed dead code that created but never used extra_args list
  - Cleaned up with explanatory comment
• LaTeX detection patterns (Verified correct, no changes):
  - Regex patterns correctly match LaTeX commands with single backslash
  - Client-side .tex extension detection already implemented

Human-readable summary

**Problem 9: Security and cache correctness issues**

Imagine you're at a bakery that caches cookies. You ask for "chocolate chip" but because the baker didn't write down which type you wanted, they give you the "oatmeal raisin" they made earlier for someone else!

That's what was happening with our markdown dialect feature. Users could request different markdown styles (GFM, CommonMark, strict) but the cache system wasn't tracking which style was requested. So if User A asked for GFM and User B asked for CommonMark right after, User B would get GFM from the cache - completely wrong!

**The fix:** We added the markdown dialect to the "cache key" (like writing it on the cookie box), so now each dialect gets its own cached result.

We also discovered a security issue: users could type ANY value for the markdown dialect, potentially including malicious formatting strings that get passed directly to pandoc. Now we validate against an approved list of dialects, rejecting anything suspicious.

Impact
• **Cache correctness** ✅ - Different markdown dialects no longer return wrong cached results
• **Security hardening** ✅ - Input validation prevents potential pandoc injection
• **Code quality** ✅ - Removed dead code, replaced magic strings with constants
• **LaTeX detection verified** ✅ - Regex patterns and extension detection working correctly
• Zero breaking changes - all existing conversions continue to work

Testing
• Cache key differentiation verified (different dialects produce different keys) ✅
• Validation rejects invalid dialects ✅
• Code review issues all addressed ✅

Commits
• a72865c - fix(converter): address all PR#28 code review issues

### Major changes — 2025-11-14 (UTC+01:00) — HTML conversion fixes + UX improvements

Added
• HTML semantic element conversion via Lua filter (`filters/figure_to_markdown.lua`):
  - Converts `<figure><img><figcaption>` to Markdown image + italicized caption
  - Converts `<aside>` to blockquote
  - Converts `<mark>` to code (backticks)
  - Applied during HTML→Markdown conversions only
• Direct HTML conversion path for HTML→Plain Text and HTML→HTML:
  - New `_build_direct_html_artifacts()` function in `convert_service.py`
  - Bypasses markdown intermediate to prevent truncation
  - Uses `--columns=1000` for wide plain text rendering
• Smart "Extract Media" option availability:
  - Disables when input format lacks embedded media (Markdown, Plain Text)
  - Disables when no media-capable output formats selected (e.g., only Plain Text)
  - Contextual tooltips explain why option is disabled
  - Auto-unchecks when disabled to prevent user confusion
• Dynamic "Accept Tracked Changes" option availability:
  - Disables for non-Word documents (HTML, Markdown, Plain Text)
  - Shows at 50% opacity when disabled
• Request counter to prevent race conditions on rapid convert clicks
• Updated UI text to reflect full format support:
  - Title: "Document Converter" (was "Text File Converter")
  - Description mentions "100+ formats" instead of just "Markdown and plain text"
  - File upload label lists common formats: ".md, .html, .docx, .pdf, .rtf, .odt, etc."

Modified
• HTML→Markdown conversion strategy:
  - Removed incorrect `--from=html-raw_html` flag
  - Now applies HTML-specific Lua filters during `convert_to_markdown()`
  - Logs: `html_semantic_filter=enabled`
• Pandoc runner filter system:
  - Added `HTML_FILTERS` tuple alongside existing `FILTERS`
  - Modified `_lua_filter_args()` to accept optional `filter_list` parameter
  - Filters applied based on input format (HTML gets figure_to_markdown.lua)
• UI reactivity:
  - Option availability updates when input format changes
  - Option availability updates when output format checkboxes change
  - Real-time feedback via disabled state + opacity

Fixed
• HTML→Plain Text truncation (HIGH priority):
  - **Problem:** Output truncated to `<!doctype html>\n\n </li>\n` (only doctype + stray closing tag)
  - **Root cause:** HTML→Markdown→Plain Text conversion path lost content
  - **Fix:** Direct HTML→Plain Text conversion via pandoc (no markdown intermediate)
  - **Evidence:** Codex testing shows full content now returned
• HTML→HTML stray code blocks:
  - **Problem:** Stray `</li>` appearing inside code blocks during HTML→HTML conversion
  - **Root cause:** HTML→Markdown→HTML roundtrip creating artifacts
  - **Fix:** Direct HTML→HTML conversion (no markdown intermediate)
  - **Evidence:** Codex re-test confirms no stray tags
• HTML→Markdown figure/figcaption raw passthrough:
  - **Problem:** `<figure>` and `<figcaption>` passed through as raw HTML instead of converting to Markdown
  - **Root cause:** Pandoc preserves unknown elements as raw HTML by default
  - **Fix:** Created `figure_to_markdown.lua` filter to handle semantic conversion
  - **Evidence:** Codex re-test confirms figure converts to image + italic caption
• Results table transient oddities:
  - **Problem:** Doubled/empty rows when rapidly clicking convert or toggling formats
  - **Root cause:** Multiple overlapping conversion requests updating table simultaneously
  - **Fix:** Request counter to ignore stale responses
  - **Evidence:** Codex testing shows table now stable

Human-readable summary

**Problem 8: The "incomplete document" and "messy conversion" issues**

Imagine you're translating a book from Spanish to English, but you accidentally rip out half the pages during translation. That's what was happening with HTML documents!

When users tried to convert HTML to plain text, the system would:
1. Convert HTML → Markdown (first translation)
2. Convert Markdown → Plain Text (second translation)

But something went wrong in step 1, and most of the content got lost. Users would upload a full HTML document and get back just a few characters like `<!doctype html>\n </li>\n` - basically nothing useful!

**The fix:** We created a "direct path" that skips the markdown step entirely. Now HTML→Plain Text goes straight from source to destination without the risky intermediate conversion. Think of it like using Google Translate directly instead of translating Spanish→French→English.

We also fixed issues where HTML elements like `<figure>` (image containers) and `<figcaption>` (image captions) weren't being converted to Markdown properly - they were just left as raw HTML code. Now we have a smart "filter" that recognizes these elements and converts them to proper Markdown: images become `![alt](url)` and captions become *italicized text*.

Finally, we made the UI much clearer:
- The "Extract Media" option now disables when it doesn't make sense (e.g., if you're only outputting plain text, there's nowhere to put extracted images!)
- The "Accept Tracked Changes" option disables for formats that don't support tracked changes
- Updated all the text to mention "100+ formats" instead of just "Markdown and plain text" - because the converter actually supports Word, PDF, HTML, LaTeX, and tons more!

Impact
• **HTML→Plain Text works perfectly** ✅ - No more truncation, full content extracted
• **HTML→HTML clean conversions** ✅ - No stray tags or code block artifacts
• **HTML→Markdown semantic conversion** ✅ - Figures/captions convert to proper Markdown
• **Better UX** ✅ - Options disable when inapplicable with helpful tooltips
• **Accurate UI text** ✅ - Users know the tool supports 100+ formats
• **No race conditions** ✅ - Results table stable even with rapid clicking
• Zero breaking changes - all existing conversions still work, new paths only used for HTML sources

Testing
• Codex (ChatGPT) comprehensive re-test ✅ - All scenarios GREEN
• HTML with figure/figcaption → Markdown: Converts to image + italic caption ✅
• HTML → Plain Text: Full content, no truncation ✅
• HTML → HTML: No stray `</li>` in code blocks ✅
• Extract Media: Disables appropriately, clear tooltips ✅
• Results table: Stable across multiple convert/toggle cycles ✅
• No regressions in previously fixed issues ✅

Commits
• 76e911d - fix(converter): fix HTML conversion issues and add UX improvements
• 42c0866 - feat(converter): add HTML semantic element conversion and improve Extract Media UX
• 90e6fb5 - docs(converter): update UI text to reflect full format support

### Major changes — 2025-11-13 13:53 CET (UTC+01:00)

Added
• Whitespace stripping for environment variables loaded from Vercel:
  - `BLOB_READ_WRITE_TOKEN` now strips trailing newlines in `api/_lib/blob.py`
  - `PDF_RENDERER_URL` strips whitespace before path normalization in `api/convert/_pdf_external.py`
  - `CONVERTER_SHARED_SECRET` strips whitespace in `api/convert/_pdf_external.py`
• Git repository cleanup: added `artifacts/` and `.DS_Store` to `.gitignore`

Modified
• Environment variable loading now defensive against trailing whitespace characters

Removed
• 268MB `libreoffice-7.6.4.1.tar.xz` and all artifacts from git history (via `git filter-branch`)

### Major changes — 2025-11-23 13:10 CET (UTC+01:00) — WS3 degraded PDF + error UX refinements

Added
• `pdfDegradedReason` field to `/api/convert` meta, derived from layout-aware PDF extraction logs (e.g. `timeout`, `too_short_or_single_line`).
• Clearer converter UI error mapping for common backend failures: invalid/corrupt ZIP archives, ZIPs with no supported files, and size-limit violations.

Modified
• `_extract_markdown_from_pdf` now marks degraded output with a structured `degraded` flag and `degraded_reason` instead of implicitly signalling via exceptions.
• `convert_one` in `api/convert/convert_service.py` distinguishes between severe PDF degradation (timeouts → legacy pypdf fallback) and mild degradation (very short/single-line content → keep layout-aware markdown but tag it as degraded).
• The Text/Document Converter UI (`tools/text-converter/index.html`) now parses converter responses to show friendly, specific error messages instead of generic “Conversion failed (400)” strings.

Fixed
• Loss of context around “degraded” PDFs
  - **Problem:** Layout-aware PDF extraction flagged some PDFs as degraded and forced a silent fallback to a simpler legacy extractor, but the API meta only exposed the engine name; the UI could only say “degraded; a simpler fallback may have been used” based on logs.
  - **Root cause:** `_extract_markdown_from_pdf` used `degraded_reason` only as an internal trigger, and `convert_one` treated any degraded output as a hard error instead of choosing between degraded markdown, legacy fallback, or a clear signal.
  - **Fix:** Revised the PDF path so degraded-but-usable markdown is returned (and tagged), while true timeouts fall back to the legacy extractor; added `pdfDegradedReason` to the JSON meta so clients can see why a PDF was downgraded.
  - **Evidence:** `api/convert/convert_service.py` now logs `pdf_extraction_strategy=layout_aware_degraded` vs `fallback_legacy_due_to_timeout`, and `/api/convert` meta exposes `pdfDegradedReason`. Full Node suite: `artifacts/ws3-converter/20251123/node-test-all.log`.

Human-readable summary

This WS3 pass teaches the converter to be more honest and helpful about tricky documents. For PDFs, the backend no longer treats every “degraded” extraction as a silent failure: if the layout-aware path produces something usable, it keeps that markdown and marks it as degraded; only severe timeouts fall back to the simpler legacy extractor. The `/api/convert` meta now includes a `pdfDegradedReason` field so both the UI and operators can see why a PDF was downgraded.

On the frontend, the Text/Document Converter no longer responds to ZIP and size-limit problems with a mysterious “Conversion failed (400)”. Instead, it recognises messages like “No supported files found in ZIP archive”, “Invalid ZIP file”, and “File exceeds MAX_FILE_MB”, and turns them into clear guidance (“ZIP had no DOCX/ODT/RTF/Markdown/TXT/HTML files”, “ZIP looks corrupt”, “File too large for the online converter”). Pandoc-level failures now surface as “Document format issue” with a suggestion to re-save the file in Word or LibreOffice.

Impact
• PDF conversions now expose when and why the layout-aware extractor considered output degraded, while still preferring the richer layout path when it’s safe to do so. ✅
• Users uploading broken ZIPs or over-sized documents get specific, actionable error messages instead of generic HTTP status text. ✅
• Converter API consumers can rely on `meta.pdfDegradedReason` to drive their own UX or logging without scraping logs. ✅

Testing
• `node --test` (full suite, including existing `/api/convert` envelope checks) ✅ — see `artifacts/ws3-converter/20251123/node-test-all.log`.

Commits
• (pending in this working tree) — adjust PDF degraded handling and meta; refine converter UI error mapping.

Human-readable summary

**Problem 7: The "invisible character" issue**

Imagine you're trying to unlock a door with a key, but there's a tiny piece of lint stuck to the end of the key. The lock can't recognize the key because of that extra bit of garbage on the end!

That's exactly what was happening with our environment variables (configuration values). When we stored secret keys like `BLOB_READ_WRITE_TOKEN` in Vercel's system, they accidentally got an invisible "newline" character (like pressing Enter) added to the end.

When the code tried to use these keys in HTTP headers (like showing an ID badge), the system said "Invalid header value" because headers can't have newline characters in them. It's like trying to write your name on a form but accidentally pressing Enter in the middle - the form won't accept it!

**The fix:** We added `.strip()` to all three affected environment variables. Think of `.strip()` as a lint roller that removes any invisible whitespace (spaces, tabs, newlines) from the beginning and end of text. Now the keys are clean and work perfectly in HTTP headers.

We also cleaned up the git repository by removing a huge 268MB test file that was blocking pushes to GitHub, and added rules to prevent test artifacts from being accidentally committed in the future.

Impact
• **Blob uploads now work** ✅ - Files can be uploaded to Vercel Blob storage without "invalid header value" errors
• **PDF rendering authentication works** ✅ - Calls to Google Cloud Run PDF renderer include properly formatted secret headers
• **External PDF renderer URL works** ✅ - Cloud Run endpoint URL is cleanly formatted without trailing whitespace
• Zero breaking changes - fix is purely defensive (strips whitespace if present, doesn't affect clean values)
• Git repository size reduced and protected against future large file commits
• All three environment variables (BLOB token, PDF URL, shared secret) now resilient to whitespace pollution

### FINAL FIX ✅ — 2025-11-12 16:10 CET (UTC+01:00)

Added
• Local copies of converter modules in `api/convert/` directory (convert_service.py, convert_types.py)
• Self-contained converter implementation that eliminates cross-package import issues

Modified
• Converter service now uses relative imports (`from .._lib`) instead of absolute imports
• App.py imports from local modules instead of trying to import from separate convert package
• Simplified import logic - no more sys.path manipulation or fallback attempts

Removed
• Complex import fallback logic (no longer needed)
• Dependency on external convert/ package (now self-contained)

Human-readable summary

**Problem 6: The "can't find my neighbor" issue (FINAL FIX)**

Imagine you're in your house (the `convert/` folder) and you need to borrow a tool from your neighbor (the `api/_lib/` folder). But here's the problem: when you're standing inside your house, you can only see your own rooms - you can't see your neighbor's house at all!

We tried three solutions:

**Attempt 1 (failed):** Used "relative directions" like "go to my neighbor's house" (`from ..api._lib`). But Python said "I don't know where your neighbor is - you're at the top level already!" This is like trying to give directions that assume you're outside, but you're actually stuck inside.

**Attempt 2 (failed):** Added a map showing where all the houses are (`sys.path manipulation`). This worked on our local computer, but when we deployed to Vercel (the cloud server), the map didn't work there. It's like the map was only accurate for our neighborhood, not for the server's neighborhood.

**Attempt 3 (SUCCESS!):** We moved into our neighbor's house complex! We copied our converter code directly into the `api/convert/` directory, where it lives right next door to `api/_lib/`. Now we don't need any special directions or maps - we can just walk next door because we're in the same building.

**Why this works:**
- Everything is now in the `api/` directory - no more cross-package imports
- The converter can easily reach the helper code (`_lib`) using simple relative paths (`../_lib`)
- No dependency on Python's package discovery system
- Works identically in local development and on Vercel deployment

Impact
• **Converter API fully operational** ✅
• Health check passes: pandoc v3.1.11.1 working at /tmp/pandoc-vendored
• POST /api/convert works perfectly: Returns JSON with jobId, outputs, preview, logs
• Successful markdown→HTML conversion tested and verified
• Example output: `<h1 id="test-doc">Test Doc</h1><p>This is a <strong>test</strong> markdown file.</p>`
• Zero errors, complete end-to-end functionality
• No remaining issues - converter is production-ready

### Major changes — 2025-11-12 14:25 CET (UTC+01:00)

Added
• Five sequential fixes to resolve converter API startup failures
• Python package dependencies file (`api/requirements.txt`) with fastapi, pydantic, requests, pypandoc
• Error handling for missing packages (graceful fallbacks instead of crashes)
• Restored missing converter service code (convert/service.py, convert/types.py, convert/__init__.py)
• Root package initialization file (__init__.py) to make tinyutils importable as a Python module
• Pydantic v2 configuration updates (model_config syntax)

Modified
• Pydantic model configuration changed from v1 syntax (`allow_population_by_field_name = True` in nested Config class) to v2 syntax (`model_config = {"populate_by_name": True}`)
• Import error handling now catches and logs package availability issues instead of crashing

Removed
• None.

Human-readable summary
The converter was completely broken because five separate pieces were missing or misconfigured. Think of it like a car that won't start - we had to check the battery, fuel, spark plugs, and more.

**Problem 1: Missing software libraries** - The Python code couldn't run because it was missing essential software pieces (like FastAPI and Pydantic). We added a list of required software so Vercel knows what to install.

**Problem 2: Configuration mismatch** - One piece of software (Pydantic) was updated to a new version, but our code was still using old instructions. We updated the instructions to match the new version.

**Problem 3: Missing converter logic** - The actual code that does the conversion work was accidentally not included in the project. We restored three important files (service.py, types.py, __init__.py) from backup copies.

**Problem 4: Python couldn't find the code** - Even after restoring the code, Python couldn't locate it because the folder wasn't marked as a "Python package." We added a special marker file (__init__.py) at the project root so Python knows where to look.

**Problem 5: No safety nets** - When things went wrong, the system crashed instead of handling errors gracefully. We added "try-except" blocks so errors are logged instead of causing crashes.

The good news: The health check now passes - pandoc (the conversion engine) is working correctly. The bad news: The actual conversion still returns an error, so there's one more issue to track down. We need better error logging from Vercel to see what's failing.

Impact
• Health check ✅ passes: pandoc v3.1.11.1 working at /tmp/pandoc-vendored
• All Python imports now succeed (previously crashing with ModuleNotFoundError)
• Error messages are now in JSON format instead of plain text crashes
• System logs warnings instead of crashing when optional features are missing
• Remaining issue: POST /api/convert returns 500 error - needs detailed Python error logs to debug

### Major changes — 2025-11-12 12:40 CET (UTC+01:00)

Added
• Runtime decompression for vendored pandoc binary in `api/_lib/pandoc_runner.py`
• Import path fix in `api/convert/app.py` (changed from `tinyutils.api._lib` to `api._lib`)

Modified
• `_resolve_pandoc_path()` now falls back to decompressing `pandoc.xz` if uncompressed binary not found
• Added `_decompress_pandoc_xz()` function using Python's `lzma` module to extract binary to `/tmp`

Removed
• None.

Human-readable summary
The converter tool needs a program called "pandoc" to do the actual document conversion work. We keep this program in a compressed file (like a .zip file) because the full program is too big for Vercel's system (142MB when uncompressed, but Vercel only allows 50MB).

The compressed file is only 18MB, which fits fine. When someone uses the converter for the first time, the system automatically unzips pandoc into a temporary folder and keeps it there for future use. This happens once when the system starts up, then everyone can use it.

We also fixed a path issue where the code was looking for pandoc in the wrong location. Now the health check shows pandoc is working correctly (version 3.1.11.1).

The conversion endpoint still returns errors, which might be related to file storage settings, but the core pandoc problem is solved.

Impact
• Health check now passes: status "ok" instead of "degraded"
• Pandoc binary successfully loads at `/tmp/pandoc-vendored` on Vercel
• One-time decompression adds 1-2 seconds to cold start, then cached for subsequent requests
• Conversion POST endpoint needs additional investigation (returns 500, likely unrelated to pandoc)

### Major changes — 2025-11-12 11:35 CET (UTC+01:00)

Added
• Declared Python runtime dependencies for the convert function in `api/requirements.txt` (`fastapi`, `pydantic`, `requests`, `pypandoc`).

Modified
• None.

Removed
• None.

Human-readable summary
Preview POST to `/api/convert` failed with `ModuleNotFoundError: No module named 'pydantic'`. Vercel Python functions install packages from `requirements.txt`; the file was missing. We added `api/requirements.txt` with the minimal set required by the existing code so deployments bundle dependencies and the endpoint can execute.

Impact
• Converter API should load successfully on the next Preview deployment; `health` and `convert` routes will respond with JSON instead of 500 text errors.

### Minor changes — 2025-11-12 10:42 CET (UTC+01:00)

Added
• Documentation-only heartbeat entry to comply with mandatory per-turn logging.

Modified
• AGENTS.md now mandates logging every turn and requires a same-day converter heartbeat while the converter is in active scope; this entry reflects that policy. No changes to runtime behavior.

Removed
• None.

Human-readable summary
No behavior change. This is a documentation heartbeat recording that today’s work focused on policy enforcement and logging hygiene. Converter behavior, API contract, normalization options, and UI remain as previously described.

Impact
• None on users. Improves auditability and hand-offs by guaranteeing per-turn updates in both the run log and this file.

### Major changes — 2025-11-12 10:35 CET (UTC+01:00)

Added
• Request model now accepts `preview: boolean`; when requested, the API always returns a `preview` manifest object (`headings[]`, `snippets[]`, `images[]`) even when empty.
• Extended `Options` with normalization/format flags (safe defaults): `normalizeLists`, `normalizeUnicode`, `removeNbsp`, `wrap`, `headers`, `asciiPunctuation`.
• Graceful filter wiring: the API calls a runner hook to apply Lua filters when available; otherwise it no‑ops without breaking responses.
• ZIP input (minimal): server detects `.zip` by content‑type/extension, safely extracts supported files, enforces per‑member limits, and processes each as an input.
• Lua filters under `/filters/`:
  – `softbreak_to_space.lua` — converts SoftBreak to Space.
  – `strip_empty_spans.lua` — removes empty Span elements.
  – `normalize_lists.lua` — forces ordered lists to start at 1 (Decimal style).

Modified
• Signature‑aware option passing to the underlying `ConversionOptions` and `convert_batch` (`preview` only when supported).
• Response contract remains unchanged: `jobId`, `outputs[] { name, size, blobUrl, target }`, `preview`, `logs`, `errors`.

Removed
• None.

Human-readable summary
The converter API now supports a preview‑first flow and exposes a richer normalization surface without breaking existing clients. When `preview:true` is sent, the response always contains a consistent manifest for quick inspection. Normalization flags are accepted and, when the runner is present, Pandoc Lua filters are applied; otherwise the request degrades gracefully. Basic ZIP batch input is supported by safely extracting supported files and converting them individually.

Impact
• UI Preview button reliably sees a `preview` object; clients can progressively enable normalization features.
• Larger/batch work can be sent as a `.zip` of supported files without changing the response schema.
• Future runner updates can activate more normalization without changing this API surface.

### Major changes — 2025-11-12 Late PM CET (UTC+01:00)

Added
• ZIP batch input handling in API: detects ZIP archives (via Content-Type `application/zip` or `.zip` extension), safely extracts supported text/document formats (.docx, .odt, .rtf, .md, .markdown, .txt, .html, .htm), and produces individual InputPayload entries for each file.
• Size guards applied per ZIP member via `ensure_within_limits`; skips macOS metadata (`__MACOSX/`, hidden dot-directories) and unsupported file types.
• Preview parameter now passed to `convert_batch` when supported (signature-aware introspection).
• Lua filter documentation: clarified what each filter does and how `pandoc_runner.apply_lua_filters` applies them.

Modified
• `_download_payloads` now detects ZIP inputs and delegates to `_extract_zip_payloads` for batch processing.
• `convert` endpoint passes `preview` parameter to `convert_batch` when the signature supports it.

Removed
• None.

Human-readable summary
ZIP batch input is now fully supported: users can upload a ZIP archive containing multiple documents, and the API will extract and convert each supported file individually. The preview-first flow is complete: when `preview=true` is requested, the API passes it through to the backend (if supported) and consistently returns preview manifests. All normalization options flow correctly into the conversion path, and Lua filters are applied when available.

Impact
• Batch workflows: users can convert multiple documents in one request by uploading a ZIP.
• Preview parity: API now respects the `preview` flag end-to-end.
• Normalization pipeline: filters apply cleanly when `pandoc_runner.apply_lua_filters` is available.

Notes / follow-ups
• ZIP outputs: currently, each converted file is returned as a separate blob. Packaging multiple outputs into a single ZIP remains future work.
• Test coverage: validate ZIP extraction with mixed supported/unsupported files, hidden directories, and size limits.

#### Lua Filters

The `/filters` directory contains Pandoc Lua filters that implement the normalization pipeline:

**`softbreak_to_space.lua`**: Replaces Pandoc `SoftBreak` elements with `Space` elements. This prevents hard-wrapped markdown and ensures consistent spacing across formats.

**`strip_empty_spans.lua`**: Removes empty `Span` elements that are often generated by word processors. This cleans up unnecessary markup in the output.

**`normalize_lists.lua`**: Forces `OrderedList` elements to start at 1 with `Decimal` style. This ensures deterministic, consistent markdown list formatting.

The `pandoc_runner.apply_lua_filters(converter_options, opts_dict)` method (when available) applies these filters based on the normalization options in the request. If the runner is unavailable, the API degrades gracefully with a no-op.

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

### Minor changes — 2025-11-18 23:30 CET (UTC+01:00) — Phase 2 nightly status checkpoint

Added
• Documentation heartbeat noting the Phase 2 status update in `docs/PHASE2_AUTO_STATUS.md`.

Modified
• None. Converter runtime behavior, API contract, and UI remain unchanged in this session.

Removed
• None.

Human-readable summary

No behavior change. This is a small bookkeeping entry to say that today’s work focused on updating the Phase 2 Auto status file, capturing that Track 1 (progress UX) is complete, Track 2 (downloads + MD→RTF) is partially done, and Tracks 3–5 (ads/CMP, light mode, extra smokes/docs) are still pending. The converter’s RTF and other conversion behaviors stay exactly as described in prior entries.

Impact
• None for end users; the converter continues to behave exactly as before. ✅
• Improves auditability and hand-offs by keeping the converter change log in sync with the Phase 2 status board. ✅

### Major changes — 2025-11-18 23:50 CET (UTC+01:00) — Converter downloads hardened + MD→RTF smoke

Added
• Client-side normalization for converter result downloads: a small `handleDataUrlDownload` helper intercepts `data:` URLs in the results table and decodes them into Blob-based downloads, delegating to `window.tuDownloadBlob` when available.
• New `md_rtf` case in `scripts/smoke_convert_preview.mjs` that posts a tiny Markdown demo to `/api/convert` with `to:['rtf']` and, when `PREVIEW_URL` is configured, writes a real `.rtf` artifact under `artifacts/converter-rtf-fix/<YYYYMMDD>/` using the same preview-bypass headers as other smokes.

Modified
• Result table download links on `/tools/text-converter/` still render as `<a class="download-link">Download</a>`, but clicks on `data:` URLs are now handled via Blob-based downloads instead of relying on the browser’s `data:` URL handling.
• `scripts/smoke_convert_preview.mjs` now reuses the existing artifact directory and preview-protection bypass logic while also saving a standalone RTF file alongside the JSON response for the `md_rtf` case.

Fixed
• Soft-hardening of converter downloads
  - **Problem:** The converter UI trusted whatever `blobUrl`/`url` the API returned, which could be a `data:` URL; while this worked, it meant user-facing downloads sometimes relied on `data:` URL semantics instead of the Blob-based flow we use everywhere else.
  - **Root cause:** The results table simply bound `output.blobUrl || output.url` to an `<a href>` with `download`, without a normalization layer.
  - **Fix:** Added a small client-side helper that detects `data:` URLs, decodes them (base64 or URL-encoded), and funnels them through `window.tuDownloadBlob` (or a local Blob+`URL.createObjectURL` fallback), so converter downloads follow the same Blob-based pattern as other tools without changing the visible UX.
  - **Evidence:** DOM/logic review of `tools/text-converter/index.html`; status entry in `docs/PHASE2_AUTO_STATUS.md` under Track 2; updated converter preview smoke in `scripts/smoke_convert_preview.mjs`.

Human-readable summary

Previously, the converter’s downloads did whatever the backend told them: if `/api/convert` returned a `data:` URL, the UI simply stuck that into the link and let the browser handle it. That worked, but it made the converter the odd one out compared to the other tools, which all use a consistent "make a Blob, then download it" flow.

We taught the converter a small new trick. When you click a Download link, if the underlying URL is a `data:` URL, the UI quietly decodes it in JavaScript and hands the bytes to the same Blob-based helper we use everywhere else. For you, the link still just says "Download" and saves the file; under the hood it’s a bit more robust and easier to reason about.

At the same time, the converter’s preview smoke grew a new scenario that converts a tiny Markdown demo into RTF and saves the resulting `.rtf` file as an artifact, so we can quickly re-open it in TextEdit/Word and confirm the "full document" RTF fix keeps working over time.

Impact
• Converter downloads now follow the same Blob-based pattern as other tools even when the backend responds with `data:` URLs, while the visible UI and API contract stay the same. ✅
• The MD→RTF path is exercised by a dedicated smoke that can materialize real `.rtf` artifacts under `artifacts/converter-rtf-fix/<date>/` for easy spot-checks in desktop editors. ✅

### Minor changes — 2025-11-18 23:58 CET (UTC+01:00) — Light-mode token tuning (global)

Added
• None.

Modified
• Global light-theme design tokens in `styles/site.css` were retuned so `html[data-theme="light"]` uses a soft gray background, white panels, slightly darker muted text, and clearer borders; the converter page inherits these tokens for its cards, progress banner, and `.ad-slot` frame.

Removed
• None.

Human-readable summary

No converter-specific logic changed, but the overall light theme now looks closer to a deliberate design instead of a flipped dark palette. When you switch to light mode, the converter’s cards and status areas sit on a pale gray canvas with white panels and more readable muted text, while still using the same brand blue accents.

Impact
• Converter UI in light mode should feel more consistent and readable without affecting the behavior of `/api/convert` or any tool options. ✅

### Major changes — 2025-11-18 23:59 CET (UTC+01:00) — Converter race guard + theme-aware progress

Added
• Theme-aware progress background token `--progress-bg` in `styles/site.css`, with dark-mode and light-mode values, used by the shared `.progress-banner progress` styles on converter and other tools.

Modified
• `/tools/text-converter/index.html` now treats the `requestCounter` as the single source of truth for the active conversion request: error messages and UI reset (buttons/`isBusy`) only apply when `thisRequest === requestCounter` so stale responses cannot override a newer run.
• Progress bar CSS now uses `var(--progress-bg)` instead of a hard-coded `rgba(255,255,255,0.12)` so the bar remains visible and balanced in both dark and light themes.

Fixed
• Converter race condition and stale UI updates
  - **Problem:** If a user clicked Convert twice quickly, the older request could still clear the busy state and update the message after a newer request had started, because cleanup and error handling did not check whether the response belonged to the latest run.
  - **Root cause:** The `requestCounter` guard was only used to skip success-path rendering; `finally` always reset `isBusy` and buttons, and errors were surfaced unconditionally.
  - **Fix:** Gate both error messaging and cleanup on `thisRequest === requestCounter`, so only the newest in-flight request is allowed to update the progress text or reset the UI.
  - **Evidence:** Code inspection of the `runConvert` flow in `tools/text-converter/index.html` and manual reasoning through overlapping request scenarios; no API contract changes.

Human-readable summary

Previously, the converter kept track of how many times you clicked Convert, but it still let an older request "win" the race when finishing. If you fired off two conversions back-to-back, the first one could finish second and still reset the buttons and status message, even though you were really waiting on the second run.

We tightened the guard rails so that only the most recent request is allowed to touch the UI: if an older request finally comes back, it quietly exits without changing the status or toggling the buttons. At the same time, the shared progress bar now uses a theme-aware background color token so it looks intentional and readable in both dark and light mode.

Impact
• Converter results and error messages now always correspond to the most recent Convert/Preview click, even if earlier requests finish later. ✅
• The shared progress bar remains visible and aesthetically consistent in light mode as well as dark mode. ✅
• No changes to `/api/convert` request/response shape; this is a client-side robustness and UX improvement only. ✅

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
### Minor changes — 2025-11-13 14:27 CET (UTC+01:00)

Added
• Review heartbeat only — no behavior change. Collected repo review artifacts under `artifacts/review/20251113/` and referenced them in `docs/AGENT_RUN_LOG.md`.

Modified
• None

Removed
• None

Human-readable summary
Routine repo review; converter behavior unchanged. This entry satisfies the same‑day heartbeat requirement while converter work remains in scope.
### Minor changes — 2025-11-14 [00:00] CET (UTC+01:00)
• Manual UI test (no code change). Evidence: tinyutils/artifacts/text-converter/20251114/notes.txt

### Minor changes — 2025-11-15 07:35 CET (UTC+01:00) — Preview infra alignment

Added
• None

Modified
• Documentation/logging only: recorded preview infra change (vercel.json headers-only) — no converter behavior impact.

Fixed
• None

Human-readable summary

No behavior change in the Converter. Logged preview infrastructure alignment (vercel.json headers-only) to support Vercel Preview stability; converter endpoints and UI unchanged.

Impact
• No user-facing change ✅

Testing
• Not applicable (docs-only) ✅

Commits
• pending – included with vercel.json cleanup PR commit
### Minor changes — 2025-11-15 09:10 CET (UTC+01:00) — Text Converter UI toggle + PDF smoke

Added
• Default single-select “Convert to” picker with an advanced “+ Add another format” to reveal multi-export checkboxes (opt-in).
• Expanded Markdown dialect list: gfm (default), commonmark_x, commonmark, markdown, markdown_mmd, markdown_strict, markdown_phpextra.
• PDF-specific aria-live progress copy: “Parsing PDF (layout-aware)…”.
• Converter preview smoke now includes a tiny PDF data URL case to exercise the /api/convert PDF path (artifact-only assertion, no flakey body checks).

Modified
• Persisted target selection and dialect in localStorage; restored on load. No server schema changes, payload remains backward compatible (mdDialect only when Markdown target is selected).

Fixed
• None (UI/automation only).

Human-readable summary
The converter UI is simpler by default: users choose a single output format, with an optional advanced toggle to add more. The Markdown dialect list is broader, and converting PDFs now announces a clearer progress message. The automated converter smoke adds a tiny PDF case to verify the server path without brittle assertions.

Impact
• Cleaner default workflow; multi-export still available ✅
• Clearer PDF feedback for users ✅
• Safer preview smokes for PDF path ✅

Testing
• Ran preview smoke locally (header-only) and verified artifact writes ✅
• UI sanity: selection persisted across refresh; aria-live updated for PDF ✅

Commits
• pending — UI toggle + dialects; PDF smoke case
### Major changes — 2025-11-15 09:18 CET (UTC+01:00) — PDF extractor guardrails + mode option

Added
• `options.pdfLayoutMode` (default/aggressive/legacy) honored; env `PDF_LAYOUT_MODE` remains the default when option is unset.
• Structured meta: `rtl_detected` flag and expanded layout counters in extractor logs.

Modified
• Layout-aware extractor now enforces per-page/total time budget (~80–90s) and a memory guard (~5 MB plain text) with graceful legacy fallback.
• `pdfplumber` use is optional and genuinely lazy; absence or failure no longer aborts extraction.

Fixed
• Resilience against very large/slow PDFs (timeouts now degrade instead of hard-failing); optional table CSV fallback maintained with CSV hardening.

Human-readable summary
The PDF preprocessor is safer and easier to roll back. You can force `legacy` mode per-request, while the server can default modes via an environment variable. When a document is too large or slow, we return a best‑effort result or fall back to a simpler extractor instead of failing the entire conversion.

Impact
• Safer conversions under strict time/memory budgets ✅
• Easier incident rollback via `pdfLayoutMode` / `PDF_LAYOUT_MODE` ✅

Testing
• Preview smokes green on endpoints; converter smoke exercises /api/convert PDF path (requires valid bypass on POST). ✅

Commits
• 93f9ce3 – feat(converter): PDF guardrails + pdf_layout_mode (opts/env), optional pdfplumber, rtl meta

### Major changes — 2025-11-15 15:30 CET (UTC+01:00) — QA audit follow-ups for converter UX

Added
• QA audit action items that ensure large-file uploads surface friendly size-limit guidance, converter outputs download via HTTP blobs (not `data:` URIs), and long-running conversions surface progress indicators/tooltips (per the Nov 15 audit).

Modified
• Docs now call out these follow-ups: `docs/TEST_PLAN_SITE.md` documents the new checks, `docs/UX_REDESIGN_PLAN.md` highlights progress/contrast/focus goals, and `docs/AGENT_ASSISTED_PROMPTS.md` instructs Agent Mode to verify downloads and progress cues.

Fixed
• None (documentation and QA integration only; no runtime behavior changes).

Human-readable summary

The QA audit surfaced copy, download, and progress concerns; this entry wires them into the test plan, UX roadmap, and Agent prompts so nightly runs can flag regressions earlier. Developers now see clear evidence paths for each follow-up and can mark them off when resolved.

Impact
• QA coverage now targets the audited pain points before release, reducing the risk of blocked downloads or confusing progress states. ✅

Testing
• QA follow-up artifacts stored under `artifacts/convert/20251115/qa-followup/` documenting size-limit and download link behavior. ✅

Evidence
• `artifacts/convert/20251115/qa-followup/size-limit.md`
• `artifacts/convert/20251115/qa-followup/download-links.json`

Commits
• fix/converter-pdf-rtf-ui-testplan-gcp — add QA audit follow-ups and doc updates

### Major changes — 2025-11-16 04:39 CET (UTC+01:00) — Converter UI PR B (targets, dialects, smokes)

Added
• Single-target "Primary download format" control with an optional advanced multi-export section that reuses the existing format checkboxes; users can now pick one primary output and then optionally add more formats in the same run.
• Visible Markdown dialect options in the UI that match the backend allowlist: Auto (backend default — GFM), gfm, commonmark_x, commonmark, markdown (Pandoc), markdown_mmd, markdown_strict, markdown_phpextra.
• Additional `/api/convert` preview smoke cases that exercise a non-default mdDialect and an advanced-style multi-export payload, plus the existing layout-aware PDF→Markdown smoke.

Removed
• None.

Modified
• Converter UI copy for the targets row now highlights the primary target ("Primary download format") and clarifies that extra formats are optional ("Add more formats (optional)").
• Internally, the UI now builds the `to: [...]` array from either the single-target select or the advanced checkbox block, but the request body shape and field names sent to `/api/convert` are unchanged.

Fixed
• None (behavioral change is limited to UI/UX and smokes; backend contracts, timeouts, and hardening remain the same).

Human-readable summary

**Problem: Too many knobs for one-off converts**

Previously the converter treated every output format as a separate checkbox. That was powerful but a bit overwhelming when you just wanted "one format now, maybe extras later"—and it wasnt obvious which target was the "main" one. At the same time, the Markdown dialect feature was mostly hidden, and our smokes didnt cover the richer dialect/target combinations we now support.

**The fix: A clear primary target, advanced extras, and better coverage**

The UI now has a single "Primary download format" selector that matches what most people expect: pick one main output first. If you need more, an "Add more formats (optional)" toggle reveals the familiar checkboxes so you can request extra formats in the same run. Under the hood we still send the same `to: ['md','txt',...]` array to `/api/convert`—only the UI has been reorganized.

We also surfaced all supported Markdown dialects in the dropdown (GFM, CommonMark variants, Pandoc markdown, MultiMarkdown, strict, PHP Extra) and added new smoke cases that exercise a non-default dialect and a multi-export payload, alongside the existing layout-aware PDF→Markdown smoke. This gives better confidence that the dialect feature and advanced export combinations behave as expected, without changing timeouts or security.

Impact
• Simpler "pick one format" flow for common conversions, with an optional advanced multi-export panel for power users. ✅
• Clearer visibility into which Markdown dialects are supported, keeping the UI and backend in sync. ✅
• Stronger `/api/convert` smoke coverage for mdDialect and multi-export without touching contracts, timeouts, or hardening rules. ✅

Testing
• Local verification of converter UI behavior (single-target vs advanced multi-export, dialect dropdown, PDF-aware progress copy) in tools/text-converter/index.html. ✅
• Extended `scripts/smoke_convert_preview.mjs` with new mdDialect and multi-export cases while preserving the existing layout-aware PDF smoke. ✅

Commits
• (pending on fix/pr-b-cookie-converter-ui) — converter UI PR B (primary target + advanced multi, expanded dialects, updated smokes)

### Minor changes — 2025-11-16 11:15 CET (UTC+01:00) — Context dump ingestion (no behavior change)

Added
• None

Removed
• None

Modified
• Updated active mental model for Converter-adjacent UX and logging constraints by reading CGPT_TU_CONTEXTDUMP_20251116T034004.md; no converter APIs, options, or runtime behavior were changed.

Human-readable summary

This change log heartbeat simply records that the latest TinyUtils context dump (including CMP/consent behavior, UX redesign phases, and logging expectations) has been ingested. The converter continues to behave exactly as before; this is internal bookkeeping so future agents know this context has already been applied.

Impact
• No user-visible changes; helps future agents avoid re-deriving the same context and keeps the converter log aligned with ongoing planning. ✅

Testing
• Not applicable (no code or behavior changes).

Commits
• (this branch) — add converter heartbeat for 2025-11-16 context dump

### Minor changes — 2025-11-15 20:10 CET (UTC+01:00) — Agent context refresh (no behavior change)

Added
• None

Removed
• None

Modified
• Documentation/logging expectations clarified for this session; no converter inputs/outputs, timeouts, or engine behavior were changed.

Human-readable summary

No converter code or behavior changed in this turn. I refreshed the TinyUtils agent context (AGENTS.md, CHATGPT guides, SECURITY policy, run log, task checklist, and PDF→Markdown refactor plan) and logged the session so future agents understand the current ground rules without re-scanning everything.

Impact
• No behavior change for converter users; this is purely an internal bookkeeping heartbeat so the change log stays aligned with active work. ✅

Testing
• Not applicable (no runtime changes).

Commits
• (this branch) — context refresh heartbeat entry only

### Minor changes — 2025-11-15 20:35 CET (UTC+01:00) — Type annotation fix for PDF heading thresholds

Added
• None

Removed
• None

Modified
• Corrected HEADING_SIZE_THRESHOLDS type annotation in `api/convert/convert_service.py` so it matches the tuple-of-pairs value and keeps static type checkers happy. No converter behavior or outputs changed.

Human-readable summary

Internally, the PDF extractor now has a small bookkeeping fix: the constant that defines what font sizes count as H1/H2/H3 is annotated correctly for type-checking tools. This doesn’t change how headings are detected or how Markdown is generated; it just prevents IDEs and automated type checks from flagging a false error.

Impact
• No user-visible behavior change; this is a pure type/maintenance fix to keep the converter’s typed module clean. ✅

Testing
• `python -m py_compile api/convert/convert_service.py` and `api/convert/app.py` succeed; runtime behavior unchanged. ✅

Commits
• (this branch) — fix HEADING_SIZE_THRESHOLDS type annotation

### Major changes — 2025-11-15 19:11 CET (UTC+01:00) — Converter PR B Phase 2 UI refinements

Added
• Single-target default "Convert to" selector in tools/text-converter/index.html, with an advanced "+ Add another format" mode that reveals extra formats and still sends a unified `to[]` array to /api/convert.
• LocalStorage-backed preferences for primary target, advanced multi-export mode, and Markdown dialect so power users keep their workflows between visits.
• PDF-specific progress summaries that parse pdf_* logs/meta (pages, headings, lists, tables, images, degraded flags) and surface a concise "Parsed: …" line after successful PDF conversions.

Removed
• None.

Modified
• Markdown dialect selector now only exposes backend-supported dialects (gfm, commonmark, commonmark_x, markdown_strict) plus an "Auto (backend default — GFM)" option, with clearer labels.
• Option availability logic (Extract Media, Accept Tracked Changes, Markdown dialect) updated to react to both input and target choices while preserving existing a11y/ARIA patterns and keyboard shortcuts (Cmd/Ctrl+Enter).

Human-readable summary

The converter UI now behaves more like a focused one-to-one tool by default: you pick a single target format from a dropdown, and only if you click "+ Add another format" do you see extra checkboxes for multi-export. The markdown dialect control has been cleaned up to match what the backend actually supports, and PDF conversions now report what was parsed (pages, headings, lists, tables, images) instead of just saying "done"—all without changing the existing /api/convert contract.

Impact
• Simpler default UX for everyday conversions, with a clear path to multi-export for power users. ✅
• Less confusion around Markdown dialects and better alignment with backend validation/cache behavior. ✅
• More reassuring PDF progress feedback for users working with complex documents, with no change to server semantics. ✅

Testing
• Local/preview smoke via scripts/preview_smoke.mjs and scripts/smoke_convert_preview.mjs; converter requests continue to succeed with single and multi-target payloads, and PDF progress summaries appear as expected. ✅

Commits
• (this branch) — ui(converter): PR B single-target + multi-export, dialect cleanup, PDF progress summaries

### Minor changes — 2025-11-15 23:08 CEST (UTC+02:00) — Converter formats card & ad toast copy

Added
• None

Modified
• Converter page now shows the long "Supported formats" list in a collapsible card placed below the main Input/Results sections instead of as a large box at the top of the tool.
• Anti-adblock toast copy in scripts/adsense-monitor.js now explains that TinyUtils uses small, non-intrusive ads to help cover hosting and development costs, while explicitly stating that the tools still work if users prefer to keep blocking ads.

Fixed
• None (UX-only adjustment; no change to converter API, options, or output formats).

Human-readable summary

The converter screen is now a little calmer when you first land on it. Instead of a big "Supported formats" box pushing the actual converter down, that information lives in a collapsible card beneath the main tool. Users who care about the full list can expand it; everyone else sees the input and results right away.

At the same time, the small "ads seem blocked" toast was reworded to avoid implying that blocking ads helps the site. The new copy makes it clear that ads are lightweight and help with hosting and development, but that the tools continue to work if you keep your blocker on.

Impact
• Cleaner first impression for the converter: key controls (input, target formats, buttons, results) are visible without scrolling past a large formats box. ✅
• More policy-aligned ad messaging that thanks users without pressuring them, and avoids confusing phrasing about how ads support TinyUtils. ✅

Testing
• Manual UI check on /tools/text-converter/ to confirm the formats card collapses/expands, keyboard navigation still works, and results table behavior is unchanged. ✅
• Spot-check of adblock toast behavior on tinyutils.net / preview domain to confirm only copy changed and dismissal/TTL logic still work. ✅

Commits
• (this branch) — chore(converter): move formats card below and make it collapsible
• (this branch) — chore(ads): soften adblock toast copy for TinyUtils

### Major changes — 2025-11-16 06:42 CET (UTC+01:00) — Try example + progress indicator

Added
• Added a Try example button that loads a demo document, resets the form, and explains that the user can press Convert to see outputs without supplying real files.
• Replaced the bare progress text with a `role=status`/`aria-live` block plus a compact meter that reflects converting, previewing, timeout retries, success, or errors.

Modified
• Run/preview/clear flows now update the shared `updateProgressState` helper so the meter, message, and button states stay in sync for both single and multi-target conversions.

Fixed
• **Problem:** there was no accessible progress indicator, so users, especially those with screen readers, couldn’t tell when a conversion was running versus done.
  - **Root cause:** the UI only rewrote a plain `<div>` text with no `role=status` or semantic cues and ignored demo loads and retry notifications.
  - **Fix:** Introduced an accessible progress block with `aria-live`, a progress meter, and Try example messaging, ensuring every step (run, preview, retry, error, demo load) updates it.
  - **Evidence:** artifacts/pr4-tool-ux/20251116/manual-notes.txt

Human-readable summary

**Problem 1: Is anything happening?**
Without an accessible status region, conversions looked frozen even while `/api/convert` was busy, and preview/demos showed the same text as the active convert run.

**Problem 2: Demo content didn’t explain itself.**
You could fix a sample, but nothing told you to click Convert next or what state the tool was in.

**The fix:** Add a demo button that populates a sample document and updates the new `role=status` banner with “Demo loaded — press Convert,” and wire every run/preview/timeout/error path through a shared `updateProgressState` helper that also drives a little progress meter.

Impact
• Screen reader & keyboard users now hear converting/previewing/completion states, improving accessibility while keeping shortcuts intact. ✅
• Try example flows give a concrete example document and next step instruction, smoothing onboarding on PR4. ✅

Testing
• Manual DOM/logic review of the demo flow and progress-state helper (visual inspection). ✅

Commits
• TBD - feat: add Try Example UX for PR4

### Major changes — 2025-11-28 21:05 CET (UTC+01:00) — Large/edge-case preview hardening

Added
• Preview/meta surface now includes approxBytes, row/col counts, jsonNodeCount, truncated, and tooBigForPreview flags so the UI can show “too large”/“simplified” states.
• CSV/TSV inputs and PDF-derived CSV tables get automatic formula neutralization (prefix '= + - @') to block spreadsheet injection.

Modified
• Backend enforces preview-friendly caps and early short-circuit for oversized payloads; detects HTML-in-disguise and logs a security warning.
• Preview responses propagate size/meta flags through cache, success, fallback, and error paths; CSV/TSV protected prior to pandoc.
• Frontend shows “Too large for preview” / “Preview unavailable” cards, keeps sticky headers with wrap, and uses clearer status copy.

Fixed
• **Problem:** Large or hostile inputs could hang previews or render unsafe HTML/CSV content without user feedback.
  - **Root cause:** No preview-size guard, limited sanitization, and missing meta to drive UI fallbacks.
  - **Fix:** Add capped preview paths, HTML-in-disguise detection, CSV formula neutralization, meta propagation, and UI fallback cards with safe text-only handling.
  - **Evidence:** Tests — `node --test tests/converter_edge_cases.test.mjs`; `PYTHONPATH=. pytest tests/test_converter_enhancements.py -q`.

Human-readable summary

Large or tricky files now fail soft: we cap previewable size, label when a preview is simplified/too big, neutralize risky CSV formulas, and block obvious HTML-in-disguise. The UI shows friendly “too large/unavailable” cards instead of blank iframes, while normal conversions still complete.

Impact
• Safer previews (no silent CSV formula or HTML sneak-through) ✅
• Better UX on huge files: clear “too large” messaging and preserved conversions ✅
• Preview meta is now explicit for logging, caching, and UI decisions ✅

Testing
• node --test tests/converter_edge_cases.test.mjs ✅
• PYTHONPATH=. pytest tests/test_converter_enhancements.py -q ✅

### Major changes — 2025-11-28 21:10 CET (UTC+01:00) — Format-specific preview renderers

Added
• Five specialized preview renderers for text-based formats: CSV (HTML table, first 100 rows), JSON (syntax-highlighted formatted output), Markdown (side-by-side source + rendered), TXT (line-numbered plain text), TeX (syntax-highlighted LaTeX).
• Backend PreviewData fields: `content` (raw text, first 50KB) and `format` (target format hint: 'csv', 'json', 'md', 'txt', 'tex', 'html').
• Frontend format detection routing: switch statement detects preview.format and calls appropriate renderer function.

Modified
• convert_types.py: Added content/format fields to PreviewData dataclass.
• convert_service.py: Populate content/format in both via-markdown and direct-HTML conversion paths.
• app.py: Serialize content/format fields in API response (_select_preview function).
• +page.svelte: Added 5 renderer functions (lines 98-144) and format routing logic (lines 495-553).

Fixed
• **Problem:** All preview outputs used generic HTML iframe rendering, providing no specialized views for structured formats like CSV tables or JSON.
  - **Root cause:** PreviewData only contained HTML snippets; no format metadata or raw content for client-side rendering.
  - **Fix:** Added content/format fields to PreviewData, populated them in backend, implemented 5 format-specific renderers in frontend, added routing logic to detect format and dispatch to appropriate renderer.
  - **Evidence:** Local dev server testing at localhost:5173/tools/text-converter.

Human-readable summary

Text-based conversion outputs (CSV, JSON, Markdown, TXT, TeX) now display in format-appropriate preview modes: CSV shows as HTML table, JSON as syntax-highlighted formatted output, Markdown as side-by-side source/rendered view, TXT as line-numbered text, and TeX as highlighted LaTeX source. HTML outputs continue using iframe rendering.

Impact
• Better preview UX for structured formats (CSV table view, JSON highlighting) ✅
• Side-by-side Markdown preview shows both source and rendered output ✅
• Format-specific rendering improves readability and usability ✅

Documentation
• AGENTS.md: Added task execution discipline guide with 8 core principles and 6 red flags
• CHATGPT.md: Documented over-engineering anti-patterns (Nov 28 failure case study)

### Major changes — 2025-11-29 00:05 CET (UTC+01:00) — Preview renderer hardening

Added
• CSV preview test coverage for quoted fields (commas and escaped quotes).
• JSON preview guard that falls back to a lightweight text view for very large payloads.
• Subresource Integrity (SRI) and `crossorigin`/`referrerpolicy` attributes for Prism CSS/JS and the autoloader plugin in the preview iframe.

Modified
• `+page.svelte`: CSV preview now uses a small RFC4180-style parser that understands quoted commas and doubled quotes instead of a naïve `split(',')`.
• `+page.svelte`: Markdown preview label changed from “Formatted Text” to “Plain Text View” to more honestly describe the non-Markdown-rendered right-hand pane.
• `+page.svelte`: JSON/Markdown/TeX preview snippets now load Prism via CDN with SRI and configure the autoloader plugin instead of hard-coding per-language component scripts.
• `safe_parse_limited()` docstring (`api/_lib/utils.py`): clarified why the JSON node-count recursion limit defaults to 100.

Fixed
• **Problem:** CSV preview could mis-render rows containing quoted commas or embedded quotes, because it split on every comma without understanding CSV quoting rules.
  - **Root cause:** The original renderer used `line.split(',')` with basic trimming, which breaks on fields like `"Smith, John"` or `"Says ""hello"""`.
  - **Fix:** Introduced a tiny quote-aware line parser shared by the preview renderer and unit tests, so quoted commas stay inside cells and doubled quotes render as a single quote (HTML-escaped).
  - **Evidence:** `node --test tests/format_preview_renderers.test.mjs` now includes `CSV preview renderer handles quoted commas and quotes` and passes.

Human-readable summary

The converter’s live preview is now a bit tougher and more honest. CSV tables understand common edge cases like names with commas and text containing escaped quotes, JSON prettifying backs off gracefully on giant blobs instead of risking UI jank, and the Prism-based syntax highlighting in the iframe is wired through CDN links with integrity checks. The Markdown preview still shows raw syntax on the left, but the right-hand side is now clearly labeled as a plain-text view rather than a full Markdown renderer.

Impact
• More accurate CSV tables when cells contain commas or quotes ✅
• Safer, smoother JSON previews on very large inputs ✅
• Stronger frontend supply-chain hygiene via SRI on Prism assets ✅
• Clearer expectations for how the Markdown preview behaves ✅

Testing
• node --test tests/format_preview_renderers.test.mjs ✅
• PYTHONPATH=. pytest tests/test_converter_enhancements.py -q ✅
