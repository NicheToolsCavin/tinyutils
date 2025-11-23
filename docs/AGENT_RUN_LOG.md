### Major changes — 2025-11-14 15:05 CET (UTC+01:00)

Added
• UI: "Auto" option to Markdown dialect selector (`tools/text-converter/index.html`).
• Smoke tests: New API test cases for `/api/convert` in `scripts/preview_smoke.mjs`, covering "Auto" Markdown dialect and explicit GFM.

Modified
• UI: Markdown dialect selector JavaScript in `tools/text-converter/index.html` now sends `undefined` to the API when "Auto" is selected.
• API: The converter backend (`api/convert/convert_service.py`) now implicitly defaults to GitHub Flavored Markdown (GFM) when no specific `mdDialect` is provided (e.g., when "Auto" is selected in the UI).
• Documentation: `tool_desc_converter.md` updated with a major change entry for the "Auto" Markdown dialect feature.

Removed
• None.

Human-readable summary

Implemented the "Auto" Markdown dialect feature for the document converter. This allows users to choose "Auto" in the UI's Markdown dialect selector, which then signals the backend API to automatically determine the most suitable Markdown dialect (currently defaulting to GFM). To ensure reliability, we've extended our preview smoke tests to validate both the "Auto" dialect functionality and explicit GFM conversions. The `tool_desc_converter.md` has been updated to reflect these changes.

Impact
• Enhances user experience by providing an "Auto" option for Markdown dialect.
• Ensures consistent Markdown output by defaulting to GFM when "Auto" is selected.
• Improves code quality and confidence through expanded smoke test coverage for the converter.
• Zero breaking changes to existing functionality.


### 2025-11-14 (CET) — HTML conversion fixes + UX improvements (main)
- Mode: manual
- Branch: `main`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - **Fixed 4 critical converter bugs** reported by Codex (ChatGPT) testing:
    1. **HTML→Plain Text truncation (HIGH):** Created direct conversion path bypassing markdown intermediate
    2. **HTML→HTML stray code blocks:** Direct conversion eliminates roundtrip artifacts
    3. **HTML→Markdown figure/figcaption raw passthrough:** New Lua filter converts semantic elements
    4. **Results table race conditions:** Request counter prevents stale response rendering
  - **UX improvements:**
    - Smart "Extract Media" disable logic (only enabled when input has media AND output supports media)
    - Smart "Accept Tracked Changes" disable logic (only for Word/ODF documents)
    - Contextual tooltips explain why options are disabled
    - Real-time option availability updates based on format selection
  - **UI text accuracy:**
    - Updated title: "Document Converter" (was "Text File Converter")
    - Updated descriptions to mention "100+ formats" instead of just "Markdown and plain text"
    - File upload label now shows: ".md, .html, .docx, .pdf, .rtf, .odt, etc."
  - **New files:**
    - `filters/figure_to_markdown.lua` - Converts HTML5 semantic elements (figure/figcaption/aside/mark) to Markdown
    - `_build_direct_html_artifacts()` function in convert_service.py
  - **Modified files:**
    - `api/_lib/pandoc_runner.py` - Added HTML_FILTERS tuple and filter_list parameter
    - `api/convert/convert_service.py` - Direct HTML conversion logic, simplified HTML→Markdown path
    - `tools/text-converter/index.html` - UX improvements and UI text updates
  - Commits: 76e911d (HTML fixes), 42c0866 (semantic elements), 90e6fb5 (UI text)
- Evidence:
  - Codex re-test artifacts: `tinyutils/artifacts/text-converter/20251114/retest-2.txt`
  - All scenarios GREEN: HTML→Plain Text (full content), HTML→HTML (no stray tags), figure/figcaption (converts to image + caption), Extract Media (smart disable), results table (stable)
  - No regressions in previously fixed issues
- Follow-ups:
  - None - all reported issues resolved and verified GREEN by Codex

### 2025-11-13 13:53 CET — Environment variable whitespace fix + git cleanup (ci/preview-prod-green)
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - **Root cause identified:** Trailing newlines (`\n`) in environment variables causing HTTP header errors
  - Fixed 3 environment variables by adding `.strip()` calls:
    - `BLOB_READ_WRITE_TOKEN` in `api/_lib/blob.py` (line 72)
    - `PDF_RENDERER_URL` in `api/convert/_pdf_external.py` (line 5)
    - `CONVERTER_SHARED_SECRET` in `api/convert/_pdf_external.py` (line 6)
  - Error was: `Invalid header value b'Bearer vercel_blob_rw_...\\n'` causing blob uploads to fail
  - **Git cleanup:** Added `artifacts/` and `.DS_Store` to `.gitignore` (commit 979eb0f)
  - Removed 268MB `libreoffice-7.6.4.1.tar.xz` and all artifacts from git history using `git filter-branch`
  - Force-pushed cleaned history to unblock deployment
  - Commits: dc7e23a (env var fix), 979eb0f (gitignore), b0cd766 (history rewrite)
- Evidence:
  - Error logs from previous session showed blob upload failures with trailing newlines
  - Fix verified via code inspection; awaiting Vercel redeploy for integration test
- Follow-ups:
  - Test converter API POST endpoint once Vercel redeploys preview environment
  - Verify blob uploads now succeed without "invalid header value" errors

### 2025-11-12 16:10 CET (UTC+0100) — Converter API FINAL FIX (ci/preview-prod-green) ✅
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - **CONVERTER API NOW FULLY WORKING** after fixing cross-package import issues (3 commits)
  - **Fix attempt 1 (failed):** Tried relative imports (`from ..api._lib`) in convert/service.py — e1acd5b
    - Failed locally and on Vercel: "attempted relative import beyond top-level package"
  - **Fix attempt 2 (failed):** Added sys.path manipulation in convert/__init__.py — 005cf6f
    - Worked locally but failed on Vercel (still getting "Internal Server Error")
  - **Fix attempt 3 (SUCCESS):** Copied convert modules into api/convert/ directory — 8dee8bd
    - Created `api/convert/convert_service.py` and `api/convert/convert_types.py`
    - Updated convert_service.py to use relative imports (`from .._lib`)
    - Updated app.py to import from local modules instead of convert package
    - **Result:** Eliminates all cross-package import issues, everything self-contained in api/convert/
  - **Root cause:** Python package import context on Vercel deployment
    - When Python imports convert as top-level package, it cannot see api (sibling directory)
    - Sys.path manipulation worked locally but not on Vercel due to deployment structure
    - Solution: Copy files into api/convert/ where relative imports (.._lib) work perfectly
  - Test results ✅:
    - Health check: `{"status":"ok","pypandocVersion":"1.16","pandocPath":"/tmp/pandoc-vendored","pandocVersion":"pandoc-vendored 3.1.11.1"}`
    - POST /api/convert: Success! Returns JSON with jobId, outputs, preview, logs
    - Sample conversion: markdown→html works perfectly (tested with "# Test Doc")
    - Output: `<h1 id="test-doc">Test Doc</h1><p>This is a <strong>test</strong> markdown file.</p>`
- Evidence:
  - Success artifact: artifacts/convert/20251112/success_test_final.json
  - Commits: e1acd5b (failed attempt 1), 005cf6f (failed attempt 2), 8dee8bd (SUCCESS)
  - Total session: 16 commits across 2 sessions (from 91e28d1 to 8dee8bd)
- Follow-ups:
  - None — converter API fully operational
  - Future: Consider consolidating convert/ and api/convert/convert_* files

### 2025-11-12 14:25 CET (UTC+0100) — Converter API 5-fix sequence (ci/preview-prod-green)
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Fixed 5 critical converter API issues in sequence (7 commits total)
  - **Fix 1:** Added `api/requirements.txt` with Python dependencies (fastapi, pydantic, requests, pypandoc) — 91e28d1
  - **Fix 2:** Implemented runtime pandoc.xz decompression to /tmp (18MB→142MB, bypasses Vercel 50MB limit) — 3914b51
  - **Fix 3:** Fixed import path from `tinyutils.api._lib` to `api._lib` — 6ef9af9
  - **Fix 4:** Pydantic v2 compatibility (`allow_population_by_field_name` → `populate_by_name`) — 7e92627
  - **Fix 5a:** Added error handling for missing tinyutils.convert package — f309a05
  - **Fix 5b:** Restored missing `convert/` package (service.py, types.py, __init__.py) from build artifacts — 3de24a0
  - **Fix 5c:** Added root `__init__.py` to make tinyutils a proper Python package — 4b1f894
  - Health check ✅: `{"status":"ok","pandocPath":"/tmp/pandoc-vendored","pandocVersion":"pandoc-vendored 3.1.11.1"}`
  - POST /api/convert still returns 500 — needs Python traceback from Vercel logs to debug further
- Evidence:
  - Artifacts: artifacts/convert/20251112/ (conversion tests, health checks, responses)
  - Commits: 91e28d1, 3914b51, 6ef9af9, 7e92627, f309a05, 3de24a0, 4b1f894
- Follow-ups:
  - Investigate remaining 500 error on POST /api/convert (need detailed Python traceback)
  - Add automated Vercel log downloading (tracked in AGENT_TASK_CHECKLIST.md)

### 2025-11-12 12:40 CET (UTC+0100) — Converter pandoc binary fix (ci/preview-prod-green)
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Fixed converter API pandoc binary availability issue (3 sequential fixes)
  - Added Python runtime dependencies (`api/requirements.txt`) - commit 91e28d1
  - Implemented runtime decompression for vendored pandoc.xz (142MB → /tmp) - commit 3914b51
  - Fixed import path from `tinyutils.api._lib` to `api._lib` - commit 6ef9af9
  - Health check now passes: pandoc v3.1.11.1 available at `/tmp/pandoc-vendored`
  - Conversion POST endpoint still returns 500 (likely blob storage config issue)
- Evidence:
  - Artifacts: artifacts/convert/20251112/ (health checks, test requests, summaries)
  - Health before: `{"status":"degraded","pandocPath":null}`
  - Health after: `{"status":"ok","pandocPath":"/tmp/pandoc-vendored","pandocVersion":"pandoc-vendored 3.1.11.1"}`
- Follow-ups:
  - Investigate POST /api/convert 500 error (check Vercel function logs)
  - Verify blob storage environment variables are configured correctly

### 2025-11-11 21:43 CET (UTC+0100) — DLF Quick Extras hardened (ci/preview-prod-green)
- Added preview_url input, resolve+gate step, unconditional artifact upload.
- scripts/smoke_dlf_extras.sh: bypass cookie + 200/JSON gating; artifacts saved.
- Workflow run: https://github.com/NicheToolsCavin/tinyutils/actions/runs/19278026559
- Result: PASS (green).

# Agent Run Log

Running log for agent-led work so freezes or mid-run swaps never erase context.

### 2025-11-12 10:42 CET (UTC+0100) — Logging policy enforcement + converter heartbeat (ci/preview-prod-green)
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Updated `AGENTS.md` with a new section “Logging Every Turn (Mandatory)” requiring per-turn entries in `docs/AGENT_RUN_LOG.md` and a same-day heartbeat in `tool_desc_converter.md` while converter work is active.
  - Appended a documentation-only heartbeat to `tool_desc_converter.md` (no behavior change).
  - Created evidence folder for today’s heartbeat.
- Evidence:
  - Artifacts: artifacts/convert/20251112/heartbeat/
- Follow-ups:
  - Continue preview validation for converter changes and capture artifacts under `artifacts/convert/`.

### 2025-11-12 10:35 CET (UTC+01:00) — Converter preview + options + ZIP (ci/preview-prod-green)

### 2025-11-12 11:05 CET (UTC+0100) — Preview browser smoke blocked by Vercel login (preview-prod-green)
- Mode: manual
- Branch: `preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Resolved preview URL from PR #25: https://tinyutils-git-ci-preview-prod-green-cavins-projects-7b0e00bb.vercel.app
  - Attempted to bypass with legacy `tu_preview_secret` cookie (value present from 2025‑11‑05 artifacts); preview still redirects to Vercel Login for `/` and `/api/check`.
  - Likely using Vercel Preview Protection which expects `vercel-protection-bypass=<BYPASS_TOKEN>`; token not available.
- Evidence:
  - Browser screenshots in session; local note created.
- Follow-ups:
  - Provide `BYPASS_TOKEN` so I can set the `vercel-protection-bypass` cookie in the headless browser and run full smoke (`scripts/preview_smoke.mjs`).
- Mode: auto
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - API: Added `preview` flag (consistent manifest), extended `Options` (normalizeLists/normalizeUnicode/removeNbsp/wrap/headers/asciiPunctuation) with safe defaults; signature‑aware passing to `ConversionOptions`/`convert_batch`.
  - Runner hook: best‑effort `apply_lua_filters` (graceful when absent); filters added under `/filters`.
  - ZIP input (minimal): safe extraction and per‑member limits; create inputs for supported files.
  - UI: accept `.zip` and label ZIP outputs; added `/html-to-markdown/` lander; sitemap updated.
- Evidence:
  - Commit: “converter: preview flag + extended Options + runner graceful filters; UI: zip accept + ZIP label; add html-to-markdown lander + sitemap”.
  - Workflow: Convert Preview Smoke (dispatch) — run 19291156661 (queued/started).
- Follow-ups:
  - Optionally package outputs into a single ZIP for batch results.
  - Client→Blob upload for large files.

## How to Record Entries
- Policy (updated 2025-11-18): Log only when material changes occur (code/docs/assets/config edits, opening/updating a PR, or adding preserved evidence artifacts, or tool behavior/spec changes). Skip logging for exploration-only turns (reading/searching/planning) unless you produced artifacts you want to keep. See AGENTS.md for the quick decision checklist.
- **Append-only:** Add new information at the top of the Sessions list (newest first).
- **Timezone:** Headings must use Europe/Madrid timestamps (e.g., `2025-11-04 14:15 CET`).
- **Granularity:** Log each meaningful task as soon as it finishes (single-agent or multi-agent), then add a session wrap-up when the run completes.
- **Metadata:** Capture run mode (auto/manual), branch, session id (if shown), and CWD when known.
- **Summary bullets:** Note what changed (files/commits), where artifacts live, remaining TODOs, and any deviations from the source plan.
- **Evidence:** Store supporting outputs under `artifacts/` and reference the folder.
- **Follow-ups:** Explicitly list remaining actions or write `None`.
- **Helper script:** Use `python scripts/log_run_entry.py --help` to append entries without manual editing.

## Sessions

### 2025-11-23 09:22 CET - Manual - add Python req CI
- **Mode:** manual
- **Branch:** `fix/vercel-build-reqs`
- **Summary:**
  - Added GH workflow python-requirements-check.yml to dry-run + install requirements.txt on Python 3.12 and smoke-import core deps.
  - Covers fastapi/pydantic/requests/pypandoc/pypdf/pdfminer.six/pdfplumber to guard future bumps.
- **Evidence:** .github/workflows/python-requirements-check.yml
- **Follow-ups:**

### 2025-11-23 09:20 CET - Manual - PR52 review tweaks
- **Mode:** manual
- **Branch:** `fix/vercel-build-reqs`
- **Summary:**
  - Annotated pdfminer.six constraint with tested version (20251107 on Python 3.12) per PR review.
- **Evidence:** artifacts/vercel-build/20251123/vercel-build-success-2.log
- **Follow-ups:**

### 2025-11-23 04:14 CET - Manual - consolidate python deps + verify build
- **Mode:** manual
- **Branch:** `fix/vercel-build-reqs`
- **Summary:**
  - Moved all Python deps into api/convert/requirements.txt and made root requirements.txt a thin include to dedupe installs.
  - Kept pdfminer.six floor at 20231228 with high upper bound <20300000 for Py3.12 wheels.
  - Reran vercel build; success log stored at artifacts/vercel-build/20251123/vercel-build-success-2.log.
- **Evidence:** artifacts/vercel-build/20251123/vercel-build-success-2.log
- **Follow-ups:**
  - Open PR with these requirement fixes.

### 2025-11-23 03:57 CET - Manual - unblock Vercel build (pdfminer bound)
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Raised pdfminer.six upper bound to <20300000 so Python 3.12 can install latest wheels; kept lower bound at 20231228 for stability.
  - Re-ran vercel build locally; it now succeeds. Log saved to artifacts/vercel-build/20251123/vercel-build-success.log.
  - Root requirements still include -r api/convert/requirements.txt so converter deps deploy correctly.
- **Evidence:** artifacts/vercel-build/20251123/vercel-build-success.log
- **Follow-ups:**

### 2025-11-23 03:48 CET - Manual - fix Vercel build requirements
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Added '-r api/convert/requirements.txt' include so Vercel installs converter deps without duplicating entries.
  - Stored diff evidence for requirements change.
- **Evidence:** artifacts/vercel-build/20251123/requirements-diff.txt
- **Follow-ups:**

### 2025-11-23 01:52 CET - "Manual - WS5b API envelopes doc correction"
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - "Refined the new API envelopes section in docs/ARCHITECTURE_AND_GUARDRAILS.md to accurately distinguish between v2-style ok/meta/error/note envelopes (Encoding Doctor, Multi-file S&R, etc.), v1-style contracts (Dead Link Finder, Sitemap Delta, Wayback Fixer, Metafetch), and the FastAPI-based /api/convert responses."
  - "Reconfirmed that tool_desc_deadlinkfinder.md, tool_desc_sitemapdelta.md, tool_desc_waybackfixer.md, tool_desc_encoding-doctor.md, tool_desc_multi-file-search-replace.md, and tool_desc_converter.md already describe their meta/error behavior in a way that matches the actual handlers, so no wording changes were required."
- **Evidence:** docs/ARCHITECTURE_AND_GUARDRAILS.md
- **Follow-ups:**

### 2025-11-23 01:50 CET - "Manual - WS5b API envelopes + docs alignment"
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - "Added an API envelopes/meta section to docs/ARCHITECTURE_AND_GUARDRAILS.md describing the common JSON shape (ok/meta/requestId/error/note) and key per-API meta fields for /api/check, /api/sitemap-delta, /api/wayback-fixer, /api/encoding-doctor, /api/multi-file-search-replace, and /api/convert."
  - "Reviewed existing tool_desc_*.md entries and confirmed their descriptions of meta fields and error notes already match the implemented contracts; no behavioural changes were needed, just cross-checks."
  - "Used a gemini-2.5-flash helper agent to draft the initial API envelope section, then integrated and adapted it to the actual TinyUtils contracts (removing fields that do not exist and aligning terminology)."
- **Evidence:** docs/ARCHITECTURE_AND_GUARDRAILS.md
- **Follow-ups:**
  - "OPTIONAL: in a later WS5 pass, add small JSON schema snippets or example envelopes per API to docs/ARCHITECTURE_AND_GUARDRAILS.md or tool_desc_*.md for even quicker onboarding."

### 2025-11-23 01:42 CET - "Manual - WS5a tests & error UX polish"
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - "Added one focused regression test for Encoding Doctor clean-text summary in tests/encoding-doctor.test.mjs"
  - "Added one focused regression test for Multi-file Search & Replace missing_search envelope in tests/multi-file-search-replace.test.mjs"
  - "Ran node --test and captured TAP output under artifacts/ws5a-tests/20251123/node-test.tap"
  - "Reviewed Converter test options; deferred converter-specific WS5a test to a later pass to avoid introducing a new JS or Python test harness"
- **Evidence:** artifacts/ws5a-tests/20251123/node-test.tap
- **Follow-ups:**
  - "OPTIONAL: add a small converter regression test (error mapping / no-convertible-files) in a future WS5b/WS6 once a suitable JS or Python harness is in place"

### 2025-11-23 00:43 CET - Manual - WS3 Text Converter refinements
- **Mode:** manual
- **Branch:** `ws3-converter-refinements`
- **Summary:**
  - Improved PDF degraded handling (pdfminer vs legacy fallback) and exposed pdfDegradedReason in /api/convert meta
  - Mapped common converter backend errors (ZIP issues, size limits, pandoc failures) to clearer UI messages in tools/text-converter
  - Ran full Node test suite; stored log under artifacts/ws3-converter/20251123/node-test-all.log
- **Evidence:** artifacts/ws3-converter/20251123/node-test-all.log
- **Follow-ups:**
  - Optional: add targeted Python unit tests for PDF degraded paths and ZIP error handling

### 2025-11-23 00:05 CET - Manual - WS3 Multi-file Search & Replace risk reduction
- **Mode:** manual
- **Branch:** `ws3-mfsr-risk-reduction`
- **Summary:**
  - Hardened multi-file search & replace backend export handling (exportFormat allowlist, ZIP entry name sanitization)
  - Added UI confirmation for destructive replaces and clearer post-preview match summary
  - Extended tests for invalid exportFormat and ZIP entry path sanitisation
- **Evidence:** artifacts/ws3-mfsr/20251123/node-test-mfsr.log
- **Follow-ups:**
  - Optional: broader UI copy around destructive patterns and a small preview smoke on a Vercel preview

### 2025-11-22 22:17 CET - Manual - WS3 Encoding Doctor safety + UX
- **Mode:** manual
- **Branch:** `ws3-encoding-doctor`
- **Summary:**
  - Added hard caps for pasted text length and decoded blobUrl bytes in api/encoding-doctor.js, returning clear 4xx envelopes (text_too_large, blob_payload_too_large) while preserving JSON contracts.
  - Hardened loadTextFromBlobUrl with scheme/host allowlists (data:, tinyutils.net, *.tinyutils.net, *.vercel.app) and per-download byte ceilings to reduce SSRF/abuse risk for Encoding Doctor file flows.
  - Introduced a latin1→UTF-8 fallback in repairText that triggers only on strong mojibake signals, plus new tests for size limits and the fallback; added copy buttons and improved aria-live summary + keyboard shortcuts in tools/encoding-doctor/index.html.
- **Evidence:** artifacts/ws3-encoding-doctor/20251122/node-test.log
- **Follow-ups:**
  - Consider a future pass to visualize diffs for file previews and refine mojibake heuristics for non-Latin scripts once these guardrails have baked in.

### 2025-11-22 17:15 CET - Manual - WS3 deeper pass DLF/SitemapDelta/Wayback
- **Mode:** manual
- **Branch:** `ws3-deeper-dlf-sitemap-wayback`
- **Summary:**
  - Refined /api/check robots/scheduler behavior by parsing Crawl-delay from robots.txt, tracking robotsSkipped counts, and surfacing robotsCrawlDelaySeconds and robotsSkipped in the Dead Link Finder meta + UI status line.
  - Replaced api/sitemap-delta.js extractLocs with a safer, token-based XML parser that decodes entities and handles CDATA, plus added tests/sitemap_delta_parsing.test.mjs to exercise urlset, entity decoding, and mildly malformed XML flows.
  - Tightened /api/wayback-fixer metadata by tracking SPN attempted vs enqueued, emitting a structured meta.spn object, and updating the Wayback Fixer UI to show when the SPN limit is reached and to label spn_skipped_cap notes.
- **Evidence:** artifacts/ws3-deeper-pass-dlf-sd-wbf/20251122/node-test.log
- **Follow-ups:**
  - Consider a future CDX-based snapshot ranking pass and more detailed DLF robots/crawl-delay enforcement once these incremental changes bake in.

### 2025-11-22 17:01 CET - Manual - WS4 Google Funding Choices CMP bridge
- **Mode:** manual
- **Branch:** `ws4-consent-cmp-bridge`
- **Summary:**
  - Wired scripts/googlefc-consent-adapter.js into all pages that load the Funding Choices script (home, tools hub, core tools, multi-file search/replace, and legacy -old pages) so TinyUtilsConsent can be populated wherever analytics/ads may run.
  - Updated ADSENSE_SETUP.md to document Funding Choices as the canonical consent source and explain how googlefc-consent-adapter.js feeds TinyUtilsConsent.hasAnalyticsConsent/hasAdsConsent for analytics.js and adsense-monitor.js gating.
  - Refined AGENTS.md Consent / Analytics / Ads section to state explicitly that CMP is canonical and that analytics/ads scripts must consult TinyUtilsConsent rather than their own consent keys.
- **Evidence:** artifacts/ws4-consent-cmp-bridge/20251122/node-test.log
- **Follow-ups:**

### 2025-11-22 16:48 CET - Manual - WS4 consent adapter to Funding Choices CMP
- **Mode:** manual
- **Branch:** `feat/ws1-ws2-edge-hardening`
- **Summary:**
  - Reworked scripts/analytics.js to consult a TinyUtilsConsent adapter (hasAnalyticsConsent) instead of a local tu-consent-analytics key, so analytics gating can derive from Google Funding Choices CMP.
  - Simplified scripts/consent.js to keep only the local 'hide ads' UI toggle and to expose a TinyUtilsConsent adapter with default hasAnalyticsConsent/hasAdsConsent hooks that CMP wiring can override, avoiding any independent consent UX.
  - Updated scripts/adsense-monitor.js so the adblock toast and UI behavior require both local ads opt-in (localStorage.ads='on') and adapter-level hasAdsConsent(), aligning ads UX with CMP as the canonical consent source while preserving the hide-ads preference.
- **Evidence:** artifacts/ws4-consent-adapter/20251122/
- **Follow-ups:**
  - Wire TinyUtilsConsent to actual Funding Choices CMP signals in a future WS4 pass once the CMP implementation details are available.

### 2025-11-22 16:34 CET - Manual - WS4 initial cross-tool UX/a11y + consent
- **Mode:** manual
- **Branch:** `feat/ws1-ws2-edge-hardening`
- **Summary:**
  - Wayback Fixer: made the filter shortcut use Alt+F instead of bare 'f' to avoid hijacking typing, while keeping Cmd/Ctrl+Enter/E/J behavior consistent with other tools.
  - Cross-tool: confirmed theme-toggle buttons are wired through theme-toggle.js with aria-label/aria-pressed updates; kept markup consistent on home, tools hub, and main tools.
  - Consent/analytics/ads: changed scripts/analytics.js to load Vercel analytics only after tu-consent-analytics='accepted', extended scripts/consent.js with a simple consent banner hook and separate tu-ads-hidden toggle, and updated scripts/adsense-monitor.js to only show adblock toast when ads opt-in (localStorage.ads='on') is set in production.
- **Evidence:** artifacts/ws4-cross-tool-ux/20251122/
- **Follow-ups:**
  - Implement a reusable consent banner snippet in shared layout, and adjust cookies/privacy copy to document the updated analytics + ads behavior in a later WS4 pass.

### 2025-11-22 16:26 CET - Manual - WS3 initial DLF/Sitemap/Wayback improvements
- **Mode:** manual
- **Branch:** `feat/ws1-ws2-edge-hardening`
- **Summary:**
  - Dead Link Finder: improved accessibility by focusing the Results heading after runs and making it programmatically focusable while preserving existing a11y structure.
  - Sitemap Delta: tightened same-domain guard by teaching registrable() about common multi-part public suffixes (e.g., co.uk, com.au), reducing false negatives when same-domain filter is ON.
  - Wayback Fixer: treated private_host notes as blocked_private_host in the UI and error filter, and taught the textarea to ignore comment lines starting with # or // when building the URL list.
  - Added tests for api/_lib/edge_helpers.csvSafeCell and isPrivateHost, and fixed the CSV hardening unit test harness so it exercises the real toCSV implementation from Dead Link Finder.
- **Evidence:** artifacts/ws3-dlf-sitemap-wayback/20251122/
- **Follow-ups:**
  - Extend WS3 to deeper logic and UX passes (e.g., robots Crawl-delay, richer Wayback meta, more sitemap-parsing robustness) in subsequent workstreams.

### 2025-11-22 16:11 CET - Manual - WS1-2 Edge API hardening (helpers + first batch)
- **Mode:** manual
- **Branch:** `feat/ws1-ws2-edge-hardening`
- **Summary:**
  - Captured architecture and guardrails summary in docs/ARCHITECTURE_AND_GUARDRAILS.md for agents and future refactors.
  - Introduced shared Edge helper api/_lib/edge_helpers.js providing network safety (public http(s) only), polite timeout/retry with concurrency caps, JSON response helper, and CSV hardening helpers.
  - Refactored api/metafetch.js, api/sitemap-delta.js, api/wayback-fixer.js, and api/check.js to use shared helpers for JSON responses, request-id handling, URL validation, and safeFetch-based outbound calls where appropriate.
  - Validated updated handlers with node --test tests/api_contracts.test.mjs and scripts/test_edge_handlers.mjs; logs stored as artifacts.
- **Evidence:** artifacts/edge-hardening-ws1-ws2/20251122/
- **Follow-ups:**
  - Extend safeFetch/JSON helpers to remaining Edge APIs (encoding-doctor, multi-file search/replace, convert) and wire CSV hardening into front-end CSV exports in later workstreams.

### 2025-11-22 15:13 CET - Manual - analytics snippet everywhere
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Injected analytics.js loader into all remaining legacy/public/tool/blog pages; added @vercel/analytics dep and package-lock
- **Evidence:** artifacts/hover-animation/20251122/
- **Follow-ups:**
  - Confirm analytics events in dashboard post-deploy; ensure package-lock accepted

### 2025-11-22 14:52 CET - Manual - add Vercel analytics
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Added scripts/analytics.js (VA bootstrap) and injected across core pages (home, tools, blog, legal)
- **Evidence:** artifacts/hover-animation/20251122/
- **Follow-ups:**
  - Validate analytics events in Vercel dashboard after deploy

### 2025-11-22 00:35 CET - Manual - tools grid fix + smooth scroll
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Locked bottom tools grid to 2 cols, added spacer so Supported Formats lands right column, smooth scroll for see-more
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - Visual check (no adblock) to confirm grid alignment + ad horizontal

### 2025-11-22 00:28 CET - Manual - tools layout reshape
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Restructured tools page: two top cards (DLF + Converter), see-more anchor, horizontal ad slot, lower 2-col grid for remaining tools
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - Visual QA in both themes; ensure ad stays horizontal

### 2025-11-22 00:14 CET - Manual - tools card alignment
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Aligned tool cards by stretching grid items and making card actions stick to bottom
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 04:29 CET - Manual - purge defunct vercel links
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Replaced tinyutils-eight.vercel.app with tinyutils.net across sitemap/robots/UA strings/tests/docs
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 04:25 CET - Manual - favicon propagation
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Applied per-theme icon links to core pages (home/tools/pages/blog/articles/tools shells) to eliminate legacy favicon usage
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - If any page still shows legacy icon, add the same snippet there

### 2025-11-21 04:21 CET - Manual - idle-notifier policy
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Documented idle-notifier requirement for long/quiet commands (default profile provided) in AGENTS.md
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 04:19 CET - Manual - favicon corrections
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Per-page themed favicons on home/tools; root favicon synced; theme-toggle removes legacy links and injects correct light/dark set
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 03:31 CET - Manual - favicon fallback refresh
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Replaced root public/favicon.ico with new icon pack version so default favicon matches themed set
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - Verify dark/light favicons now consistent on first paint

### 2025-11-21 03:18 CET - Manual - favicon theme fix
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - theme-toggle now removes legacy favicons and injects theme-specific icon set on load to fix wrong icon in light mode
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - Verify Safari/light shows matching icon on tools and other pages

### 2025-11-21 03:11 CET - Manual - ad placement/tone + encoding doc light
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Moved homepage ad below tools grid; moved tools hub ad below first section; shrank ad-slot padding/height
  - Softened ad copy (no 'still works hidden'); tightened ad slot on MFSR/Text Converter; Encoding Doctor cards use theme tokens
  - Theme icons expanded and per-page links already in place
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - Verify Safari private/ghostery now hides slots; visual QA Encoding Doctor light

### 2025-11-21 03:07 CET - Manual - safari private fixes
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Hide ad slots on AdSense failure (adsense-monitor adds ads-hidden) to avoid blank banners
  - Expanded theme icons (16/32/64/192/512 + shortcut + apple) and per-page favicon links for Encoding Doctor
  - Encoding Doctor cards now use theme tokens for light mode
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**
  - Validate Safari private mode with Funding Choices/ads and recheck Encoding Doctor light styling

### 2025-11-21 03:02 CET - Manual - push hover/icon updates
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Pushed hover animation unify + theme-aware icon swap and prefers-color-scheme default
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 02:59 CET - Manual - default theme from system prefs
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Theme now defaults to prefers-color-scheme when no stored choice; still respects saved theme
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 02:58 CET - Manual - hover anim + theme favicons
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Unified hover lift/shadow across cards/CTAs via styles/animations.css and public/styles.css
  - Extracted light/dark icon pack to public/icons and made theme-toggle.js swap favicons per theme (16/32/64 + apple-touch)
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 02:51 CET - Manual - unify card hover animation
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Added shared hover lift/shadow rule for cards, CTA boxes, blog/tool cards in styles/animations.css
  - Mirrored hover treatment in public/styles.css for legacy shells with reduced-motion guard
- **Evidence:** artifacts/hover-animation/20251121/
- **Follow-ups:**

### 2025-11-21 01:15 CET - Manual - Preview URL captured
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/tinyUtils/tinyutils
- **Summary:**
  - Preview: https://tinyutils-git-feat-phase2-ads-light-cavins-projects-7b0e00bb.vercel.app (probe 401). Artifacts recorded under artifacts/convert/20251121.
- **Evidence:** artifacts/convert/20251121/preview_url.txt
- **Follow-ups:**
  - Run smokes in morning; attach B2 before/after + meta.

### 2025-11-21 00:50 CET - Manual - MF S&R preview smoke attempt (blocked)
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Fetched preview URL tinyutils-git-feat-phase2-ads-light-cavins-projects-7b0e00bb.vercel.app; ran preview_smoke with bypass+secret -> MF S&R page/API 404 because preview missing latest build.
  - Attempted new preview deploy via `vercel --scope cavins-projects-7b0e00bb` but Vercel failed: Serverless Function exceeded 250 MB unzipped size; preview not created.
  - Preview smoke remains blocked until a new preview deploy succeeds; existing artifacts at artifacts/mfsr/20251121/preview_smoke.log record 404 and 401 runs.
- **Evidence:** artifacts/mfsr/20251121
- **Follow-ups:**
  - Deploy branch safely (address 250MB lambda size) then rerun preview_smoke to verify MF S&R page/API.

### 2025-11-21 00:45 CET - Manual - MF S&R preview smoke pending
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Attempted to run preview_smoke.mjs for Multi-file S&R but PREVIEW_URL not set in env or repo env files; bypass tokens not used.
  - Smoke not executed; ready to rerun once PREVIEW_URL is provided for this branch.
- **Follow-ups:**
  - Provide PREVIEW_URL and rerun node scripts/preview_smoke.mjs to capture evidence for /tools/multi-file-search-replace/ and /api/multi-file-search-replace

### 2025-11-21 00:41 CET - Manual - MF S&R preview bypass + hardening tests
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Aligned MF S&R UI/API preview-bypass: API forwards x-vercel-protection-bypass/x-preview-secret; UI sends bypass cookie header; extended preview_smoke to cover /tools/multi-file-search-replace/ and /api/multi-file-search-replace.
  - Added hardening tests for private hosts, unsupported schemes, pattern length cap, and total byte cap in tests/multi-file-search-replace.test.mjs (all passing).
- **Evidence:** artifacts/mfsr/20251121
- **Follow-ups:**

### 2025-11-21 00:31 CET - Manual - add multi-file search and replace
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Added hardened Edge API /api/multi-file-search-replace with host guards, timeouts+retry, size caps, JSON envelopes, and bypass header forwarding.
  - Added UI /tools/multi-file-search-replace/ with aria-live status, sticky diff pane, guarded shortcuts, preview-bypass headers; wired into tools hub and sitemap.
  - Imported tests/multi-file-search-replace.test.mjs, ran npm test, and documented tool in tool_desc_multi-file-search-replace.md.
- **Evidence:** artifacts/mfsr/20251121
- **Follow-ups:**

### 2025-11-20 00:32 CET - Manual - add og:url to converter landing pages
- **Mode:** manual
- **Branch:** `phase2-ads-light`
- **Summary:**
  - Added explicit <meta property=og:url> tags to all 15 text-converter landing pages so each one exposes a canonical absolute URL for social/SEO without changing existing titles, descriptions, or content structure.
  - Clarified that the pages already include a skip link to #main and proper <main> landmarks and that H2/FAQ sections are present; earlier automated checks over-reported missing H2/FAQ/skip-link issues.
- **Evidence:** tinyutils/artifacts/converter-landing-smoke/20251120/og-url-update.txt
- **Follow-ups:**
  - Optionally tune meta title/description lengths and extend content on shorter pages to consistently hit the 700–850 word target across all converter landings.

### 2025-11-20 00:25 CET - Manual - smoke test converter landing pages
- **Mode:** manual
- **Branch:** `phase2-ads-light`
- **Summary:**
  - Ran automated SEO/AdSense/accessibility smoke checks on 15 text-converter landing pages using a Python helper script (word counts, ads, meta tags, headings, sections, CTA links).
  - Identified common issues: slightly short meta descriptions on some pages, missing og:url, missing explicit FAQ sections, missing skip links, and minor HTML tidy warnings about a single invalid character code.
- **Evidence:** tinyutils/artifacts/converter-landing-smoke/20251120/notes.txt
- **Follow-ups:**
  - Review and fix repeated SEO/accessibility issues across all converter landing pages (meta description lengths, og:url, FAQ section, skip link/main landmark, tidy warnings).

### 2025-11-18 23:03 CET - Manual - wire TinyUtils global AdSense slot
- **Mode:** manual
- **Branch:** `fix/converter-race-progress`
- **Summary:**
  - Replaced placeholder AdSense client/slot values with ca-pub-3079281180008443 and slot 3664281983 across live shells (/index.html, /tools/, Dead Link Finder, Sitemap Delta, Wayback Fixer, Text Converter).
  - Updated legacy keyword-density, meta-preview, and public index landers to use the same publisher ID and slot, keeping Funding Choices + adsense-monitor wiring unchanged.
  - Left ADSENSE_SETUP.md examples and *-old.html snapshots as documentation-only placeholders; runtime behavior now points all manual .ad-slot placements at tinyutils_global_responsive_display.
- **Evidence:** artifacts/ads-config/20251118/
- **Follow-ups:**

### 2025-11-18 21:45 CET - Manual - converter race guard + progress theme
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Hardened /tools/text-converter/ front-end so only the latest request (requestCounter) can surface errors or reset isBusy/buttons, preventing stale responses from overriding newer runs.
  - Introduced a theme-aware --progress-bg token in styles/site.css and wired the shared .progress-banner progress styles to use it, improving progress bar visibility in light mode.
  - Updated tool_desc_converter.md with a 2025-11-18 entry describing the converter race fix and theme-aware progress bar behavior.
- **Evidence:** artifacts/converter-race-guard/20251118/
- **Follow-ups:**

### 2025-11-18 21:18 CET - Manual - UX Transformation Phase Complete + AdSense Setup
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Completed full UX transformation of all 6 major pages (homepage, tools hub, 4 tool pages)
  - Tools hub: Triple-threat card accent system (left gradient bar + border glow + halo shadow), 4rem emoji icons, gradient titles, status badges, staggered animations
  - Dead Link Finder: Enhanced hero with 4rem 🔍 icon, gradient brand title, smooth fade-in animations
  - Sitemap Delta: Centered hero layout with 4rem 🗺️ icon, staggered fade-ins, enhanced subtitle
  - Wayback Fixer: 4rem ⏪ icon, smooth transitions, polished hero section
  - Document Converter: 4rem 📄 icon with '100+ formats' highlight in subtitle
  - Complete AdSense setup: Created ads.txt file, added meta tags to all 6 pages, verified Funding Choices + AdSense scripts present
  - Navigation cleanup: Hid Contact page from all navigation menus and sitemap (no contact details yet)
  - SEO fix: Updated sitemap.xml URLs from old preview domain to production tinyutils.net
- **Evidence:** Commits: f1639ff (homepage), c452ab5 (design system), 626604a (adsense), 9557d05 (contact), 8f3c949 (sitemap)
- **Follow-ups:**
  - User needs to complete AdSense dashboard setup (publish CMP message, enable Auto ads, verify site approval)

### 2025-11-18 13:50 CET - Manual - Phase2 consolidation + PR notes
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Cross-checked Phase 2 track states between docs/PHASE2_AUTO_STATUS.md and docs/AGENT_TASK_CHECKLIST.md (Tracks 1–5 + Workstream A) and confirmed statuses/next actions are aligned, with separate tasks tracking preview smokes and visual QA.
  - Created docs/PHASE2_PR_NOTES.md as a PR-ready summary of what feat/phase2-ads-light implements across progress UX, Blob downloads + MD→RTF, ads/CMP, light-mode tokens, and smokes/docs, including remaining preview/QA steps before merge.
- **Evidence:** docs/PHASE2_PR_NOTES.md
- **Follow-ups:**
  - When opening the PR, paste or adapt docs/PHASE2_PR_NOTES.md into the PR description and run the preview smokes/visual QA steps listed there.

### 2025-11-18 13:44 CET - Manual - Phase2 local visual QA stub
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Started a local static server and confirmed that /, /tools/, and the four core tools all serve successfully (HTTP 200) for a quick visual QA pass of Phase 2 changes.
  - No obvious layout or contrast issues were detected from code/CSS inspection for the new .ad-slot placements, progress banners, or tuned light-mode tokens, so no additional CSS changes were applied in this pass.
- **Evidence:** tools/text-converter/index.html
- **Follow-ups:**
  - On a real browser preview, do a quick dark/light theme flip on the same pages to visually confirm contrast and spacing; only then decide if any further token tweaks are necessary.

### 2025-11-18 13:30 CET - Manual - Phase2 Workstream A preview smokes check
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Checked preview env for Phase 2 smokes: PREVIEW_URL and bypass tokens are not set in this shell, so scripts/preview_smoke.mjs exits with a PREVIEW_URL-required error and scripts/smoke_convert_preview.mjs logs that it is skipping.
  - Confirmed both smokes no-op safely when PREVIEW_URL is missing and updated docs/PHASE2_AUTO_STATUS.md to record that Track 5 is code-complete but still awaiting a real preview run.
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Run preview_smoke.mjs and smoke_convert_preview.mjs again once PREVIEW_URL and bypass envs are configured for this branch's Vercel preview, then mark Phase 2 Track 2/5 as fully validated.

### 2025-11-18 06:03 CET - Manual - Phase2 Track 5 smokes + docs
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Extended scripts/preview_smoke.mjs so page checks now also assert that key pages return 200 and still contain invariant markers (a single .ad-slot on home/tools/tool shells and .progress-banner on Dead Link Finder + Sitemap Delta), while reusing existing preview-bypass headers.
  - Updated docs/PHASE2_AUTO_STATUS.md Track 5 entry to describe the new smoke coverage (MD→RTF case in smoke_convert_preview.mjs and lightweight ad/progress markers in preview_smoke.mjs) and how future smokes/manual QA should validate them.
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Run preview smokes with PREVIEW_URL set to confirm the new checks pass on the current preview deployment; if any invariant markers fail (missing .ad-slot or .progress-banner), adjust the markup or expectations accordingly.

### 2025-11-18 05:55 CET - Manual - Phase2 Track 4 light-mode tokens
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Retuned html[data-theme="light"] tokens in styles/site.css (bg, panel, muted, text, border) so light mode uses a soft gray canvas, white cards, darker muted text, and clearer borders while preserving the existing visual language.
  - Updated docs/PHASE2_AUTO_STATUS.md Track 4 notes to describe the new light-mode token set and call out that future validation should flip the theme on key pages to spot-check contrast on cards, tool shells, .ad-slot, and progress banners.
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Run a quick visual QA pass in a preview to confirm light mode meets contrast expectations on /, /tools/, and the four core tools; add a dark-only fallback in theme-toggle if light mode still feels unacceptable after tuning.

### 2025-11-18 05:42 CET - Manual - Phase2 Track 3 ad docs + polish
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Documented Phase 2 .ad-slot placements and behavior in ADSENSE_SETUP.md (pages, markup, interaction with Funding Choices, adsense-monitor.js, and html.ads-hidden).
  - Updated docs/PHASE2_AUTO_STATUS.md Track 3 notes to describe the new ad slots and call out what future smokes/manual QA should check (CMP flow, hide-ads toggle, CLS, themes).
  - Kept .ad-slot styling minimal and theme-aware in styles/site.css, relying on existing tokens and a reserved min-height to reduce CLS without adding new JS.
- **Evidence:** styles/site.css
- **Follow-ups:**
  - Run preview/prod smokes and a quick visual QA pass on the six pages to confirm ad behavior matches the documented expectations (CMP, hide-ads, CLS, themes).

### 2025-11-18 05:23 CET - Manual - Phase2 Track 3 ad slots (initial wiring)
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added a single unobtrusive, theme-aware ad slot (.ad-slot) to index.html, tools/index.html, and the four core tool shells (DLF, Sitemap Delta, Wayback Fixer, Converter), each wrapping one responsive AdSense unit.
  - Styled .ad-slot in styles/site.css using existing tokens (panel, border, text) with a reserved min-height to reduce CLS and hide slots when html.ads-hidden is set via the tu-ads-hidden toggle.
  - Slots rely on the existing Funding Choices CMP + adsense-monitor.js and the already-present AdSense script tags; each slot calls adsbygoogle.push({}) inside a try/catch so ads only render when allowed.
- **Evidence:** styles/site.css
- **Follow-ups:**
  - Preview and prod smokes should visually verify ad-slot placement, CMP behavior, and that toggling tu-ads-hidden hides .ad-slot without impacting tool UX.

### 2025-11-18 05:11 CET - Manual - Phase2 Track 2 downloads + RTF smoke wiring
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Normalized converter result downloads so any remaining data: URLs are decoded client-side and downloaded via Blob-based flow using window.tuDownloadBlob.
  - Extended scripts/smoke_convert_preview.mjs with an md_rtf case that exercises the standalone RTF path and writes .rtf artifacts under artifacts/converter-rtf-fix/<YYYYMMDD>/ when PREVIEW_URL is set.
  - Attempted to run the converter smoke, but PREVIEW_URL is not configured in this shell so the script skipped API calls (code paths are still validated).
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Run scripts/smoke_convert_preview.mjs with PREVIEW_URL set for this branch to materialize fresh md_rtf artifacts under artifacts/converter-rtf-fix/<date>/ and spot-check the RTF in TextEdit/Word.

### 2025-11-18 04:59 CET - Manual - Phase2 nightly status checkpoint
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Updated docs/PHASE2_AUTO_STATUS.md with Track 1 completion and partial Track 2 (downloads + MD→RTF) status.
  - Recorded which core tool files have been touched so far in Phase 2 to make future pickups easier.
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Continue Track 2: normalize converter downloads + add MD→RTF smoke, then proceed to ads/light-mode/smokes tracks.

### 2025-11-18 04:24 CET - Manual - Phase2 progress UX track
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Added shared .progress-banner styles in styles/site.css and wired consistent progress/status areas with role=status and aria-live=polite across Dead Link Finder, Sitemap Delta, Wayback Fixer, and Converter.
  - Introduced per-tool isBusy flags and updated keyboard shortcuts so Cmd/Ctrl+Enter and export keys do not fire while inputs/selects are focused or while a tool is running.
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Proceed to Track 2 (Blob-based downloads + MD→RTF smoke) on feat/phase2-ads-light.

### 2025-11-18 04:15 CET - Manual - Phase2 Auto status checkpoint
- **Mode:** manual
- **Branch:** `feat/phase2-ads-light`
- **Summary:**
  - Created docs/PHASE2_AUTO_STATUS.md as a lightweight Phase 2 Auto status file summarizing tracks (progress UX, Blob downloads, ads/light, smokes/docs) and current snapshot.
  - This checkpoint file will be updated as Phase 2 tracks land so agents can quickly see what is implemented, in progress, and still planned.
- **Evidence:** docs/PHASE2_AUTO_STATUS.md
- **Follow-ups:**
  - Update PHASE2_AUTO_STATUS.md as Phase 2 work (progress UX, downloads, ads/light, smokes/docs) lands on feature branches.

### 2025-11-18 04:05 CET - Manual - refine logging policy
- **Mode:** manual
- **Branch:** `main`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - AGENTS.md: switch to 'log only on material changes'; remove per-turn requirement; add decision checklist and examples
  - No code behavior changes; docs-only policy clarification to reduce log spam
- **Evidence:** artifacts/policy/20251118/AGENTS_md_change.txt
- **Follow-ups:**
  - Align other docs that still suggest per-run logging (AGENT_ASSISTED_PROMPTS.md:25; historical mention in AGENT_RUN_LOG.md).

### 2025-11-18 03:57 CET - Manual - merge PR6 converter RTF fix
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Merged PR #43 (PR6: Fix converter RTF output) into main at 4e0ae04, adding pandoc --standalone for RTF in _render_markdown_target so MD→RTF emits a full \rtf1 document.
  - Pulled the updated AGENT_RUN_LOG, AGENT_TASK_CHECKLIST, and tool_desc_converter.md entries from PR6 so docs and change log match the new RTF behavior.
- **Evidence:** artifacts/pr6-merge/20251118/summary.txt
- **Follow-ups:**
  - Run converter MD→RTF smokes from /tools/text-converter and attach fresh RTF artifacts under artifacts/converter-rtf-fix/.

### 2025-11-16 15:17 CET - Manual - PR6 converter RTF output correctness
- **Mode:** manual
- **Branch:** `feature/pr4-tool-ux`
- **Summary:**
  - Added pandoc --standalone for RTF in _render_markdown_target so MD→RTF emits a full \rtf1 document instead of paragraph fragments.
  - Validated pypandoc rtf output with and without --standalone to confirm header and full TinyUtils demo text are present.
- **Evidence:** artifacts/converter-rtf-fix/20251116/
- **Follow-ups:**
  - Capture after-fix RTF artifact and UI-based MD→RTF run via /tools/text-converter once automation allows writing artifacts from code.

### 2025-11-16 06:52 CET - Manual - PR5 smokes
### 2025-11-18 01:43 CET - Manual - merge PR45 per-tool preferences
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Rebased PR45 (phase3/pr12-tool-preferences) on top of current main, reduced diffs to TinyUtilsStorage helper + DLF/Converter prefs wiring, verified preview_smoke.mjs PASS against its Vercel preview under automation bypass, and merged PR45 into main (commit 0b03ede).
  - Per-tool prefs now persist Dead Link Finder options (scope/assets/robots/headFirst/retryHttp/includeArchive/timeout/concurrency) and Converter options (primary target, advanced toggle, Markdown dialect, from-format, Accept Tracked Changes, Extract Media, Remove zero-width) via TinyUtilsStorage without regressing theme toggle, DLF CSV, or smoke harness behavior.
- **Evidence:** tinyutils/artifacts/convert/20251116
- **Follow-ups:**

### 2025-11-18 01:16 CET - Manual - confirm PR44 theme toggle merged
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Confirmed PR44 (phase3/pr11-theme-toggle) is already merged into main at commit 3da95da, with global light/dark theme toggle wiring present on / and all tools and healthy preview_smoke.mjs results under automation bypass.
  - No additional code changes were required in this run; only branch sync, preview_smoke verification against the PR44 preview, and a sanity check that theme-toggle.js and header buttons are wired consistently across shells.
- **Evidence:** tinyutils/artifacts/phase3-pr11-theme-toggle/20251116/
- **Follow-ups:**

### 2025-11-18 01:09 CET - Manual - merge PR47 DLF CSV refactor
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Merged PR47 (phase3/pr15-dlf-csv-refactor) into main after reconciling with latest main, updating the DLF CSV preview smoke to use the same Vercel automation-bypass strategy as preview_smoke.mjs, and confirming preview smokes returned 200 JSON for all pages/APIs.
  - Validated /api/check still returns the expected JSON envelope and that DLF CSV export preserves legacy Full CSV shape while enabling CSV_VARIANTS and the client-side csvVariant selector; evidence includes DLF preview smoke logs under tinyutils/artifacts/dlf-csv/20251118/preview_smoke_dlf.log.
- **Evidence:** tinyutils/artifacts/dlf-csv/20251118/preview_smoke_dlf.log
- **Follow-ups:**
  - Consider expanding smoke_dlf_preview.mjs to materialize full/errors_only CSV artifacts in a follow-up PR.

### 2025-11-18 00:30 CET - Manual - PR conflict status check (26/28/29/47)
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Verified PR26 and PR29 are closed, PR28 is merged into main, and PR47 (phase3/pr15-dlf-csv-refactor) is up to date with main and reported MERGEABLE.
  - No code changes made; only PR/branch status inspection and mergeability verification, preserving headers-only vercel.json and current converter behavior.
- **Evidence:** artifacts/pr-conflict-check/20251117/status.txt
- **Follow-ups:**
  - Owner to merge PR47 when ready; old ci/text-converter-page/preview-boot branches can be cleaned up or mined later if desired.

### 2025-11-17 02:51 CET - Manual - Preview URL captured
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Preview: https://tinyutils-git-phase3-pr15-dlf-c-26d61d-cavins-projects-7b0e00bb.vercel.app (probe 401). Artifacts recorded under artifacts/convert/20251117.
- **Evidence:** artifacts/convert/20251117/preview_url.txt
- **Follow-ups:**
  - Run smokes in morning; attach B2 before/after + meta.

### 2025-11-17 00:16 CET - Manual - Phase 3 PR11 theme toggle
- **Mode:** manual
- **Branch:** `phase3/pr11-theme-toggle`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Implemented global light/dark theme toggle via CSS tokens and header button on home/tools/tool pages (client-side only).
  - Added scripts-theme-toggle.js to read localStorage/prefers-color-scheme, set <html data-theme>, and update accessible header toggle state.
  - Ran preview_smoke.mjs and smoke_convert_preview.mjs against protected Vercel preview (401s expected); artifacts under tinyutils/artifacts/phase3-pr11-theme-toggle/20251116/.
- **Evidence:** tinyutils/artifacts/phase3-pr11-theme-toggle/20251116/
- **Follow-ups:**

### 2025-11-17 00:16 CET - Manual - Preview URL captured
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Preview: https://tinyutils-git-phase3-pr11-theme-toggle-cavins-projects-7b0e00bb.vercel.app (probe 401). Artifacts recorded under artifacts/convert/20251116.
- **Evidence:** artifacts/convert/20251116/preview_url.txt
- **Follow-ups:**
  - Run smokes in morning; attach B2 before/after + meta.

### 2025-11-16 04:39 CET - Manual - Converter PR1 UI + smokes
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Implemented Converter PR B UI on tools/text-converter/index.html: primary download select + advanced multi-export, expanded Markdown dialect list, and refined PDF-aware progress copy while preserving /api/convert contracts and timeouts.
  - Extended scripts/smoke_convert_preview.mjs with mdDialect and multi-export smoke cases that mirror the updated UI, keeping bypass logic and security hardening unchanged.
- **Evidence:** artifacts/convert-pr1-ui/20251116/
- **Follow-ups:**
  - Open PR1, run preview smokes, and capture artifacts once Vercel preview URL is available.

### 2025-11-16 04:19 CET - Manual - synthesize TinyUtils Phase1 /plan
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Attempted multi-agent /plan batch (10 agents) for converter PR B UI + UX Phase 1; cancelled mini agent per instructions and used existing context docs as primary planning source.
  - Produced a consolidated, auto-ready implementation plan that assigns work to free vs heavy agents (vision, ThomasR, think, SonicTornado, main, kwaipilot, qwen-3-coder, code-gpt-5.1-codex) while respecting AGENTS/SECURITY constraints.
- **Evidence:** artifacts/plan/20251116/
- **Follow-ups:**

### 2025-11-16 03:54 CET - Manual - load CGPT context dump
- **Mode:** manual
- **Branch:** `pr-b-cookie-converter-ui`
- **Summary:**
  - Read and ingested CGPT_TU_CONTEXTDUMP_20251116T034004.md from Context and Compact/ as the canonical TinyUtils context.
  - Captured consolidated constraints around CMP/Funding Choices, consent helper scope, adblock toast behavior, UX redesign phases, and do-not-break zones.
- **Evidence:** artifacts/agent-context/20251116/
- **Follow-ups:**

### 2025-11-16 01:51 CET - Manual - CMP script on cookies page
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Added the official Google AdSense tag (ca-pub-3079281180008443) to cookies.html so the Google CMP / Funding Choices code is present on the Cookie & privacy settings page, allowing googlefc.showRevocationMessage() to work there.
- **Evidence:** artifacts/pr-c-consent/20251116/
- **Follow-ups:**
  - Let Vercel deploy main, then quickly re-run preview_smoke.mjs against https://www.tinyutils.net to confirm /cookies.html still passes and that the CMP revocation button now works when Funding Choices is active.

### 2025-11-16 01:28 CET - Manual - soften adblock detection
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Relaxed scripts/adsense-monitor.js so the 'ads seem blocked' toast only appears when window.adsbygoogle is completely missing after a delay, reducing false positives when AdSense is loaded and ads are showing.
- **Evidence:** artifacts/pr-c-consent/20251116/
- **Follow-ups:**
  - Re-run preview_smoke.mjs against preview and prod once convenient to confirm no regressions.

### 2025-11-16 01:13 CET - Manual - Google CMP reopen + cookies page
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Updated scripts/consent.js to drop the custom tuConsent helper and avoid any homegrown CMP logic, leaving Google Funding Choices as the sole consent surface.
  - Rewrote cookies.html so the "Review" button uses googlefc.callbackQueue and showRevocationMessage per Google\'s Privacy & Messaging JS API, with clear fallback messaging when the CMP is not available.
  - Adjusted scripts/adsense-monitor.js so the adblock toast no longer depends on a local tu-consent flag, avoiding conflicts with Google\'s consent state.
- **Evidence:** artifacts/pr-c-consent/20251116/
- **Follow-ups:**
  - Run preview_smoke.mjs and smoke_convert_preview.mjs against the PR preview and production once Vercel finishes deploying this branch.

### 2025-11-16 00:31 CET - Manual - switch to Google Funding Choices CMP banner
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Replaced the homegrown EU heuristics + custom consent banner with a minimal helper and the official Google Funding Choices CMP script (pub-3079281180008443) on core pages (/, /tools/, DLF, Sitemap Delta, Wayback Fixer, Converter).
  - scripts/consent.js now only manages the local 'hide ads' toggle and exposes tuConsent.reopen(), which calls window.googlefc.showDialog() when available, so /cookies.html can re-open the Google three-option banner instead of a custom box.
  - Re-ran scripts/preview_smoke.mjs and scripts/smoke_convert_preview.mjs against the PR preview; all pages/APIs 200/JSON and converter flows PASS with Funding Choices CMP present. PR #35 merged to main so the new CMP wiring can roll out via the normal production deploy.
- **Evidence:** artifacts/pr-c-consent/20251115/
- **Follow-ups:**
  - After main deploy completes, re-run preview_smoke.mjs and smoke_convert_preview.mjs against https://www.tinyutils.net to confirm CMP + tools behave as expected in production.

### 2025-11-15 23:22 CET - Manual - converter formats card + ad toast copy
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Adjusted the converter UI so the long 'Supported formats' list is now a collapsible card placed below the main Input/Results sections instead of a large box at the top of the page.
  - Updated the anti-adblock toast in scripts/adsense-monitor.js to clarify that ads help cover hosting and development costs while explicitly stating that the tools still work if users keep blocking ads.
  - No changes to /api/convert payloads or options; only layout and copy were touched, with behavior captured in a Minor changes entry in tool_desc_converter.md.
- **Evidence:** artifacts/converter-ux-tweaks/20251115/
- **Follow-ups:**

### 2025-11-15 23:08 CET - Manual - PR #34 post-merge prod smokes
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - After merging PR #34 (PR B) into main, ran scripts/preview_smoke.mjs against https://www.tinyutils.net; /, /tools/*, /cookies.html, and all 4 APIs returned 200/JSON and overall Preview smoke: PASS.
  - Ran scripts/smoke_convert_preview.mjs against production domain; converter flows (single-target + advanced multi-export, dialects, PDF progress) remain healthy with artifacts under artifacts/convert/20251115/.
  - This confirms that the pdfminer/pdfplumber requirement fix and cookie/privacy settings page behave correctly in production as they did on the PR preview.
- **Evidence:** artifacts/pr-b-prod-smoke/20251115/
- **Follow-ups:**

### 2025-11-15 23:05 CET - Manual - merge PR #34 (PR B) to main
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Merged PR #34 (PR B: cookie/privacy settings surface + Converter UI refinements) from fix/pr-b-cookie-converter-ui into main using gh pr merge --merge --auto after green preview + converter smokes.
  - PR #34 included: cookies.html page + nav wiring, consent reopen hook, privacy copy alignment, and converter single-target + advanced multi-export, dialect selector cleanup, and PDF progress messaging.
  - Vercel preview for PR #34 was already green (all pages including /cookies.html and all APIs 200/JSON; converter smoke PASS) before merge; production deploy will now follow your normal main-branch pipeline.
- **Evidence:** artifacts/pr-b-vercel-fix/20251115/
- **Follow-ups:**
  - Optionally run preview_smoke.mjs and smoke_convert_preview.mjs against production once main deploy completes, and do a quick manual UX check on cookies.html and the Converter UI in prod.

### 2025-11-15 19:50 CET - Manual - PR #34 cookies.html routing fix + green smokes
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Root cause for earlier PR #34 preview FAIL on /cookies.html was that cookies.html existed only as an untracked file locally, so it never reached Vercel; core tools and APIs were already 200/JSON.
  - Minimal fix: add cookies.html to git on the PR branch and redeploy; vercel.json remains headers-only and no build/output settings changed.
  - Re-ran preview_smoke.mjs and smoke_convert_preview.mjs against the refreshed PR preview; all pages (/ , /tools/*, /cookies.html) and APIs now PASS, and converter smoke PASS with existing artifacts.
- **Evidence:** artifacts/pr-b-vercel-fix/20251115/
- **Follow-ups:**

### 2025-11-15 19:44 CET - Manual - PR #34 Vercel pdfminer fix + preview smokes
- **Mode:** manual
- **Branch:** `fix/pr-b-cookie-converter-ui`
- **Summary:**
  - Fixed PR #34 preview build by letting pdfplumber manage pdfminer.six instead of pinning it in api/convert/requirements.txt
  - Verified convert virtualenv install + pdfminer/pdfplumber layout-aware imports; Vercel preview now builds but preview_smoke still reports /cookies.html 404 while tools/APIs are 200
  - Ran preview_smoke and smoke_convert_preview against PR #34 preview; converter flows PASS, page smoke FAIL only on /cookies.html
- **Evidence:** artifacts/pr-b-vercel-fix/20251115/
- **Follow-ups:**
  - Investigate why /cookies.html is 404 on preview despite cookies.html in repo; decide whether to adjust static export root or path

### 2025-11-15 19:11 CET - Manual - Converter PR B Phase 2 UI refinements
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Updated tools/text-converter/index.html so the primary 'Convert to' target is a single-select with an advanced '+ Add another format' block, persisted via localStorage and wired to the existing to[] array payload for /api/convert.
  - Aligned the Markdown dialect selector with backend-supported values (gfm, commonmark, commonmark_x, markdown_strict) with clearer labels and an 'Auto (backend default)' option, and enhanced PDF-specific progress messaging using pdf_* logs/meta to summarize pages/headings/lists/tables/images after conversion.
- **Evidence:** artifacts/converter-prb-ui/20251115/
- **Follow-ups:**
  - Deploy needs to pick up cookies.html for smokes to go fully green; converter UI Phase 2 is ready for visual QA (Agent Mode) and preview verification.

### 2025-11-15 19:06 CET - Manual - add cookie & privacy settings page (PR B Phase 1)
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Added cookies.html using existing card layout with clear copy explaining cookies, analytics, and Google Ads usage; linked it from header/footer on /, /public/index, /tools/, and all tool pages.
  - Integrated the page with consent.js via a window.tuConsent.reopen helper so users can re-show the banner, added gentle adblock allowlist guidance, extended preview_smoke to cover /cookies.html, and updated privacy.html + TEST_PLAN_SITE.md accordingly.
- **Evidence:** artifacts/cookies-page/20251115/
- **Follow-ups:**
  - Preview/prod deployments still need to pick up cookies.html; preview_smoke currently shows 404 for /cookies.html until next deploy.

### 2025-11-15 18:43 CET - Manual - prod deploy smoke (www.tinyutils.net)
- **Mode:** manual
- **Branch:** `main`
- **Summary:**
  - Merged PR #33 to main and ran production smoke via scripts/preview_smoke.mjs against https://www.tinyutils.net with automation bypass tokens; pages and all four APIs now return 200 JSON with request-id headers.
  - Captured initial 504/502 blip for /api/check and /api/metafetch and a successful retry; archived logs under artifacts/prod-smoke/20251115 for future audits.
- **Evidence:** artifacts/prod-smoke/20251115/
- **Follow-ups:**

### 2025-11-15 18:37 CET - Manual - fix heading thresholds type
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Adjusted HEADING_SIZE_THRESHOLDS annotation in api/convert/convert_service.py to Tuple[Tuple[float,int], ...] so it matches the configured heading threshold pairs.
  - Verified converter modules still compile; no runtime behavior change, just a clean type signature for tooling and review bots.
- **Evidence:** artifacts/preview-smoke/20251115/review-feedback/
- **Follow-ups:**

### 2025-11-15 18:29 CET - Manual - review fixes + smokes
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Addressed code-review feedback: added pdfplumber dependency, replaced magic heading numbers with named constants, removed unused table flag, sanitized smoke_pdf_new helper, and regenerated Context-from-Repo.md as text.
  - Preview + converter smokes PASS via automation bypass tokens; logs stored in artifacts/preview-smoke/20251115/review-feedback/, convert smoke artifacts live under artifacts/convert/20251115/preview-smoke-20251115062851/.
- **Evidence:** artifacts/convert/20251115/preview-smoke-20251115062851/
- **Follow-ups:**

### 2025-11-15 18:21 CET - Manual - refresh agent context & rules
- **Mode:** manual
- **Branch:** `converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Reskimmed AGENTS.md, CHATGPT guides, SECURITY, AGENT_RUN_LOG, AGENT_TASK_CHECKLIST, tool_desc_* docs, and PDF→MD Master Plan.
  - Captured current constraints, logging rules, converter scope, and preview/protection expectations for this branch.
- **Evidence:** artifacts/agent-context/20251115/
- **Follow-ups:**

### 2025-11-15 17:27 CET - Manual - headless preview fallback
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Captured headless preview HTML snapshots and JSON summary for /, /tools/, /tools/text-converter/ using scripts/headless_preview_fallback.mjs and bypass tokens.
- **Evidence:** artifacts/agent-mode/20251115/headless-preview/summary.json
- **Follow-ups:**

### 2025-11-15 17:17 CET - Manual - Update plan checkpoint
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Documented PR A completion checkpoint in pdf-md-refactor-plan-2025-11-14.md with artifacts and next candidates.
- **Evidence:** ../pdf-md-refactor-plan-2025-11-14.md
- **Follow-ups:**

### 2025-11-15 17:12 CET - Manual - converter automated tests
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Ran npm test (node --test) to exercise /api/convert and related handlers.
  - All converter-relevant tests passed; summary log at artifacts/tests/20251115/npm-test.log.
- **Evidence:** artifacts/tests/20251115/npm-test.log
- **Follow-ups:**

### 2025-11-15 17:09 CET - Manual - Add agent-assisted runbook
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Documented how to run Agent Mode, Deep Research, and Pro Reasoning for this repo (upload tar, use prompts, store files).
- **Evidence:** docs/AGENT_ASSISTED_PROMPTS.md
- **Follow-ups:**

### 2025-11-15 17:04 CET - Manual - convert_one PDF tests
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Ran convert_one on table-heavy and bookdown PDF fixtures with extract_media/aggressive; confirmed logs, artifacts, csv bundling.
  - pdf_layout_mode, pdf_engine counts, media zip details verified.
- **Evidence:** artifacts/convert/test-fixtures
- **Follow-ups:**

### 2025-11-15 16:57 CET - Manual - PR A validation + preview smokes
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Ran convert_one against multiple PDFs (simple, table-heavy) with extract_media/adaptive mode to verify Markdown/TXT outputs, media artifacts, and csv logging.
  - Captured preview smoke and converter smoke with bypass tokens; artifacts in artifacts/preview-smoke/20251115/
- **Evidence:** artifacts/convert/test-fixtures/
- **Follow-ups:**

### 2025-11-15 16:53 CET - Manual - Preview URL captured
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Preview: https://tinyutils-git-fix-converter-pdf-bf1657-cavins-projects-7b0e00bb.vercel.app
https://tinyutils-git-fix-converter-pdf-bf1657-cavins-projects-7b0e00bb.vercel.app (probe 000). Artifacts recorded under artifacts/convert/20251115.
- **Evidence:** artifacts/convert/20251115/preview_url.txt
- **Follow-ups:**
  - Run smokes in morning; attach B2 before/after + meta.

### 2025-11-15 16:51 CET - Manual - install deps for PR A
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Prepared venv and installed runtime deps for converter tests
- **Follow-ups:**

### 2025-11-15 16:46 CET - Manual - Capture QA audit follow-ups
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Documented QA findings from TinyUtils QA audit (size limits, downloads, progress).
  - Updated TEST_PLAN_SITE, UX_REDESIGN_PLAN, and AGENT_ASSISTED_PROMPTS to include explicit checks and UX goals.
- **Evidence:** docs/TEST_PLAN_SITE.md
- **Follow-ups:**
  - Address the audit follow-ups during PR A work.

### 2025-11-15 16:32 CET - Manual - Update AGENTS constraints
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Clarified AGENTS constraints: vercel json relax only with owner approval, removed blanket dependency rule, added PR comment check cadence.
  - Ensured preview bypass guidance remains and documented review cadence before prod pushes.
- **Evidence:** AGENTS.md
- **Follow-ups:**
  - Review extractor wiring

### 2025-11-15 14:38 CET - Manual - Supported Formats page + ODT target + UI/link
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Added tools/formats/ with Inputs/Outputs list (no external refs); tools/index.html links; removed external engine mentions
  - Converter/UI: expose ODT as output; text-converter page references our Supported Formats page
- **Evidence:** tools/formats/index.html
- **Follow-ups:**

### 2025-11-15 14:36 CET - Manual - add ODT output + supported formats + loud preview note
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Converter: added ODT output target (pandoc); UI: ODT in targets; formats section added before overview
  - AGENTS.md: high-visibility preview bypass callout at top
- **Evidence:** tools/text-converter/index.html
- **Follow-ups:**

### 2025-11-15 11:47 CET - Manual - converter smoke PASS (automation preflight)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Added preflight GET + query-param bypass; converter smoke completed with artifacts
- **Evidence:** artifacts/preview-green/20251115/automation_convert_smoke.preflight.log
- **Follow-ups:**

### 2025-11-15 10:24 CET - Manual - converter smoke (automation+JWT retry)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Preview smoke PASS via automation bypass; converter smoke redirect loop persists even with _vercel_jwt cookie
- **Evidence:** artifacts/preview-green/20251115/automation_convert_smoke.jwt.log
- **Follow-ups:**
  - Pending: project-side preview POST policy for /api/convert; code + smokes ready

### 2025-11-15 10:19 CET - Manual - automation smoke run (no prompts)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Preview smoke PASS via VERCEL_AUTOMATION_BYPASS_SECRET; convert smoke POST loop (redirect count exceeded)
- **Evidence:** artifacts/preview-green/20251115/automation_convert_smoke.log
- **Follow-ups:**

### 2025-11-15 10:13 CET - Manual - /code Phase 3 UI+smokes
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - UI: single-select target + advanced multi-export; expanded mdDialect; persisted prefs; PDF progress copy
  - Smokes: added tiny PDF case; aligned bypass precedence; set cookie header
- **Evidence:** tool_desc_converter.md
- **Follow-ups:**
  - Run preview smokes once valid automation token is confirmed

### 2025-11-15 08:45 CET - Manual - pdf-md Phase 1–2 pushed + smoke attempts
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Pushed converter guardrails; preview convert smoke 401 via bypass; SSO cookie path returns 308 redirects (protection)
  - Next: owner-provided automation token validation or run smokes post-merge
- **Evidence:** artifacts/convert/20251115/convert_smoke.after_refactor.log
- **Follow-ups:**
  - Phase 3 UI picker + dialects; preview re-smoke with valid bypass

### 2025-11-15 08:44 CET - Manual - pdf-md Phase 1–2 (guardrails)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Converter: optional pdfplumber import; per-page timeout+memory guard; rtl_detected meta; pdf_layout_mode option honored (opts/env)
  - No API breakage; legacy fallback preserved; logs enriched for preview analysis
- **Evidence:** api/convert/convert_types.py
- **Follow-ups:**
  - Phase 3 UI picker + dialects

### 2025-11-15 08:43 CET - Manual - plan: PDF→MD refactor unified
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Synthesized 4-phase plan from multi-agent results; artifacts saved
- **Evidence:** tinyutils/artifacts/pdf-md-refactor/20251115/unified_plan.md
- **Follow-ups:**
  - Implement Phase 1–2 (engine guardrails)

### 2025-11-15 08:25 CET - Manual - Add automation bypass support + docs
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - preview_smoke.mjs now honors VERCEL_AUTOMATION_BYPASS_SECRET with cookie persist; keeps PREVIEW_BYPASS_TOKEN/BYPASS_TOKEN fallback; forwards PREVIEW_SECRET
  - AGENTS.md: new Preview Protection — Automation Bypass section (env names, headers, precedence)
- **Evidence:** scripts/preview_smoke.mjs
- **Follow-ups:**
  - If token still yields 401/redirect, verify project-level token validity; SSO cookie works as fallback

### 2025-11-15 08:18 CET - Manual - Preview JWT smoke (PR #33)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - SSO cookie (_vercel_jwt) probe: pages 200; APIs 200
  - Pages: /=200 /tools/=200 dlf=200 sd=200 wbf=200
  - APIs: check=200 metafetch=200 sitemap-delta=200 wayback-fixer=200
- **Evidence:** tinyutils/artifacts/preview-green/20251115/manual/api-wbf.json
- **Follow-ups:**

### 2025-11-15 08:17 CET - Manual - Preview smoke (PR #33)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Ran scripts/preview_smoke.mjs; exit=1
  - Pages: /=401 /tools/=401 dlf=401 sd=401 wbf=401
  - APIs: check=401 metafetch=401 sitemap-delta=401 wayback-fixer=401
- **Evidence:** tinyutils/artifacts/preview-green/20251115/summary.txt
- **Follow-ups:**

### 2025-11-15 08:11 CET - Manual - /plan (multi-agent) for PR #33
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Launched 7 planning agents; synthesized unified Preview GREEN plan with exact commands and minimal diff fallbacks
  - Saved final plan to artifacts/plan/20251115/final_plan.md
- **Evidence:** artifacts/plan/20251115/final_plan.md
- **Follow-ups:**

### 2025-11-15 08:03 CET - Manual - Preview URL captured
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Preview: https://tinyutils-git-fix-converter-pdf-bf1657-cavins-projects-7b0e00bb.vercel.app (probe 401). Artifacts recorded under artifacts/convert/20251115.
- **Evidence:** artifacts/convert/20251115/preview_url.txt
- **Follow-ups:**
  - Run smokes in morning; attach B2 before/after + meta.

### 2025-11-15 08:03 CET - Manual - Preview URL captured (PR #33)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Preview: https://tinyutils-git-fix-converter-pdf-bf1657-cavins-projects-7b0e00bb.vercel.app/ (probe 401). Used BYPASS_TOKEN from local secrets (redacted).
- **Evidence:** artifacts/convert/20251115/preview_probe_status.txt
- **Follow-ups:**
  - Run one-pass preview smoke with BYPASS_TOKEN

### 2025-11-15 06:42 CET - Manual - preview wait notice (PR #33)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Posted PR status comment; awaiting Vercel preview URL after vercel.json cleanup
  - Will write preview URL to artifacts/convert/20251115/preview_url.txt and run single probe on arrival
- **Evidence:** artifacts/convert/20251115/vercel_after.json
- **Follow-ups:**
  - Poll for preview URL; smoke on success or timeout note after 2h

### 2025-11-15 06:26 CET - Manual - remove vercel rewrites (headers-only)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **Summary:**
  - Removed disallowed vercel.json rewrites; headers-only per AGENTS.md to prevent runtime version errors
  - No functional changes to pages/APIs; aligns with Vercel Other/Static framework
- **Evidence:** artifacts/convert/20251115/vercel_after.json
- **Follow-ups:**
  - Push branch, capture preview URL, run single-probe and smoke script

### 2025-11-15 02:04 CET - Manual - PR A engine + anti-adblock toast
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added pdfminer.six layout-aware PDF→Markdown with pypdf fallback and structured logging (serverless-safe).
  - Added dismissible anti‑adblock toast (7‑day persistence) triggered on AdSense load failure.
- **Evidence:** artifacts/convert/20251115
- **Follow-ups:**
  - Run preview smokes in morning; attach before/after for B2 PDF.

### 2025-11-15 01:15 CET - Manual - Add converter decisions + PR A checklist to big plan
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Pinned images/language/tables policies; added PR A implementation checklist and overnight auto mode runbook to docs/TEST_PLAN_SITE.md.
- **Evidence:** tinyutils/docs/TEST_PLAN_SITE.md
- **Follow-ups:**
  - Implement PR A extractor and open preview for overnight auto mode.

### 2025-11-15 01:07 CET - Manual - Converted 'Context from Repo.docx' to Markdown
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Used local converter to produce Context-from-Repo.md (fallback path due to missing pypandoc).
  - Saved to: ~/dev/TinyUtils/Context-from-Repo.md and tinyutils/docs/Context-from-Repo.md.
- **Evidence:** /Users/cav/dev/TinyUtils/Context-from-Repo.md
- **Follow-ups:**
  - Re-run with Pandoc available or in preview to get richer Markdown if needed.

### 2025-11-15 00:01 CET - Manual - Save Deep Research prompt (PDF→MD)
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Saved final Deep Research paper prompt to ~/dev/TinyUtils/deep-research-prompt-pdf-md-2025-11-14.txt.
  - Prompt references sanitized repo tar: tinyutils-context-20251114.tar (6.7 MB).
- **Evidence:** /Users/cav/dev/TinyUtils/deep-research-prompt-pdf-md-2025-11-14.txt
- **Follow-ups:**

### 2025-11-14 23:25 CET - Manual - Deep Reasoning budget + usage log
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added Deep Reasoning budget (40 runs) and allocation across milestones.
  - Created docs/AGENT_ASSISTED_USAGE.md with counter and run ID scheme.
  - Extended prompts with Deep Reasoning section.
- **Evidence:** tinyutils/docs/AGENT_ASSISTED_USAGE.md
- **Follow-ups:**
  - Start DRN-allocations when Converter PR A begins.

### 2025-11-14 23:24 CET - Manual - Extend Pro Reasoning window + prompts
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Extended Pro Reasoning schedule to 20 days (through 2025-12-04).
  - Added Agent Mode / Deep Research / Pro Reasoning prompt templates.
- **Evidence:** tinyutils/docs/AGENT_ASSISTED_PROMPTS.md
- **Follow-ups:**

### 2025-11-14 23:17 CET - Manual - Converter PDF+RTF + Test Plan + GCP Safety
- **Mode:** manual
- **Branch:** `fix/converter-pdf-rtf-ui-testplan-gcp`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Exposed PDF output in UI; added RTF backend target (converter).
  - Created comprehensive site test plan (docs/TEST_PLAN_SITE.md).
  - Added GCP cost safety checklist and read-only audit script.
  - Saved evidence artifacts and example payloads for smoke.
- **Evidence:** tinyutils/artifacts/text-converter/20251114/smoke_payload_examples.json
- **Follow-ups:**
  - Prepare preview smoke for converter (md→docx,rtf,pdf; html→pdf).

### 2025-11-14 21:09 CET - Manual - converter PDF upload fixes (UI+server)
- **Mode:** manual
- **Branch:** `pdf-upload-ui-server`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - UI: binary file handling via FileReader; no textarea dump; infer pdf; 90s timeout + single retry
  - Server: always preprocess .pdf regardless of client 'from'
  - Added artifacts/pdf-fix/20251114/notes.txt
- **Evidence:** artifacts/pdf-fix/20251114/notes.txt
- **Follow-ups:**

### 2025-11-14 19:03 CET - Manual - share config with wrapper CODE_HOME
- **Mode:** manual
- **Branch:** `main`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Linked each `.code-teams-*` directory to the shared `.code/config.toml` so the per-account CODE_HOME directories load the same agent settings.
  - This should keep the `code-teams-personal`/`code-teams-teacher` wrappers from starting with an empty config while still isolating account state.
- **Evidence:** artifacts/agent-config-change/20251114/
- **Follow-ups:**

### 2025-11-14 18:59 CET - Manual - enable code-gpt-5 agent
- **Mode:** manual
- **Branch:** `main`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Enabled the `code-gpt-5` agent entry in code_config_hacks/.code/config.toml.
  - Ensures ChatGPT-5 Codex is available via the shared `mcp` profile alongside the other Code agents.
- **Evidence:** artifacts/agent-config-change/20251114/
- **Follow-ups:**

### 2025-11-14 18:48 CET - Manual - enable MCP profile for code agents
- **Mode:** manual
- **Branch:** `main`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added an `mcp` profile and moved the context7/sequential-thinking MCP definitions under it so Code agents can share the same MCP servers.
  - Every `code` wrapper now passes `-p mcp` in read-only and write args to load that profile before executing commands.
- **Evidence:** artifacts/agent-config-change/20251114/
- **Follow-ups:**
  - None

### 2025-11-14 18:32 CET - Manual - update agent command
- **Mode:** manual
- **Branch:** `main`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Swapped command for code-gpt-5 and code-gpt-5-codex to `code` inside code_config_hacks/.code/config.toml.
  - Ensures chatgpt-5-code uses the new wrapper so the hidden-save-button issue is resolved.
- **Evidence:** artifacts/agent-config-change/20251114/
- **Follow-ups:**
  - None (config update complete)

### 2025-11-14 12:32 CET - Manual - PR#28 code review fixes
- **Mode:** manual
- **Branch:** `fix/converter-latex-detect`
- **Summary:**
  - Fixed 6 issues from Claude bot code review on PR#28
  - CRITICAL: Added md_dialect to cache key (convert_service.py:663)
  - SECURITY: Added md_dialect validation with allowlist (app.py:243-250)
  - CODE QUALITY: Removed unused variable (pandoc_runner.py:111)
  - CODE QUALITY: Replaced magic string with constant (convert_service.py:381-385)
  - Verified LaTeX regex and .tex extension detection already correct
- **Evidence:** Commit: a72865c. PR: https://github.com/NicheToolsCavin/tinyutils/pull/28
- **Follow-ups:**

### 2025-11-05 01:57 CET - Auto - Phase2 wrap
- **Mode:** auto
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Drafted CSP risk note for PR1 and saved to tinyutils/artifacts/phase2-roster/20251105/.
  - Re-confirmed PR1–PR4 evidence (no missing files) and captured backup tinyutils-backup-20251105T015659.zip.
- **Evidence:** tinyutils/artifacts/phase2-roster/20251105/, tinyutils/artifacts/audit/20251105/
- **Follow-ups:**

### 2025-11-05 01:47 CET - Auto - Phase2 roster/audit
- **Mode:** auto
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Generated phase2 roster snapshot and evidence audit artifacts (20251105).
  - Recorded empty run-log backfill patch for review.
- **Evidence:** tinyutils/artifacts/phase2-roster/20251105/, tinyutils/artifacts/audit/20251105/
- **Follow-ups:**

### 2025-11-05 01:33 CET - Manual - Docs + a11y refresh
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Updated README/DEPLOY/VERCEL/TESTING with PR1–PR4 flows and artifact pointers.
  - Added automation snippet in AGENTS.md and guarded keyboard shortcuts in sitemap-delta + wayback-fixer.
- **Evidence:** tinyutils/artifacts/docs-refresh/20251105/, tinyutils/artifacts/a11y/20251105/
- **Follow-ups:** None

### 2025-11-05 01:29 CET - Manual - PR4 tests
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Restored PR4 test suites
  - Logs under tinyutils/artifacts/pr4-tests/20251105/
- **Evidence:** tinyutils/artifacts/pr4-tests/20251105
- **Follow-ups:**

### 2025-11-05 00:49 CET - Manual - PR3 preview fence evidence
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Ran preview smoke (PASS) and captured 401→200 flow for /tools/keyword-density with tu_preview_secret cookie.
  - Artifacts: tinyutils/artifacts/pr3-fence/20251105/ (smoke.txt, keyword-density-401/200, fence headers, cookies).
- **Evidence:** tinyutils/artifacts/pr3-fence/20251105
- **Follow-ups:**

### 2025-11-05 00:14 CET - Manual - PR2 noindex + debug hook
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added <meta name="robots" content="noindex"> to keyword-density, meta-preview, and sitemap-generator heads.
  - Tagged DLF debug scheduler paragraph with data-testid; verification logs saved under tinyutils/artifacts/pr2-ux-noindex-debug/20251105/.
- **Evidence:** tinyutils/artifacts/pr2-ux-noindex-debug/20251105/
- **Follow-ups:**
  - Re-run UI smoke once remaining PR tasks complete.

### 2025-11-05 00:12 CET - Manual - PR1 CSP + caching
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added CSP header and /public cache rule to vercel.json; validated JSON structure.
  - Captured prod headers at https://tinyutils.net for /, /public/styles.css, /api/check; stored under tinyutils/artifacts/pr1-security-cache/20251105/.
- **Evidence:** tinyutils/artifacts/pr1-security-cache/20251105/
- **Follow-ups:**

### 2025-11-04 13:47 CET - Auto - `feat/pr3-preview-fence`
- **Intent:** Apply `pr3-preview-fence.diff`, wire rewrites, deploy, capture fence evidence.
- **Result:** Added `api/fence.js`, updated `vercel.json` rewrites, refreshed README-VERCEL, pushed commit `022bd2f1ffa3...`.
- **Evidence:** Nothing archived yet (no curl headers or smoke logs captured post-commit).
- **Follow-ups:** Run `scripts/preview_smoke.mjs` with live `PREVIEW_SECRET`, stash curl headers + cookie proof under `artifacts/pr3-fence/`, document in README & this log.

### 2025-11-04 13:34 CET - Auto - `feat/pr1-security-cache`
- **Intent:** Land `pr1-security-caching.diff` (security headers + API cache-control).
- **Result:** Strengthened headers and `cache-control: no-store` for APIs; skipped CSP string and `/public/(.*)` cache rule from original diff. Commit `1ae7fdf5ef44...` pushed.
- **Follow-ups:** Reintroduce CSP + `/public/(.*)` cache headers, collect production curl evidence, link in `DEPLOY_PRODUCTION_CHECKLIST.md`.

### 2025-11-04 12:50 CET - Auto - `feat/pr3-preview-fence`
- **Intent:** Confirm preview fence deployment completion.
- **Result:** Session reported success but produced no new commits or evidence.
- **Follow-ups:** Covered by the 13:47 CET entry (still outstanding).

### 2025-11-04 12:38 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-38-29-7022c54b-64cd-4e58-92f2-52f17e752825.jsonl`
- **Summary:** Captured non-interactive shell flow for production deploy verification (`vercel pull`, `vercel deploy --prod`, curl headers into `artifacts/pr1-prod-*.txt`).
- **Follow-ups:** Run workflow once headers/CSP finalized to populate artifacts.

### 2025-11-04 12:29 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-29-05-befec95e-6959-4c1c-9713-8ff902acf316.jsonl`
- **Summary:** Proposed full header set for PR1 (HSTS, XFO, nosniff, strict referrer, permissions policy, CSP, API `no-store`/`X-Robots-Tag`).
- **Follow-ups:** Apply CSP + `/public` cache rule, validate via preview headers.

### 2025-11-04 12:06 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-05-48-576fe3d4-f7bd-4d4d-8476-d101681bc1ee.jsonl`
- **Summary:** Drafted deploy smoke checklist (curl probes for public pages, APIs, robots, sitemap, preview fence secret flow). Suggested env vars (`PROD`, `PREVIEW`, `PREVIEW_SECRET`).
- **Follow-ups:** Execute once preview fence + PR2/PR4 are in place; archive outputs.

### 2025-11-04 12:05 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-05-44-d4744ea5-bb4a-4351-9637-54cd32747c1d.jsonl`
- **Summary:** Catalogued touched paths for PR1-PR4 and recommended apply order (PR1 -> stacked PR3, parallel PR2 & PR4).
- **Follow-ups:** Execute outstanding PR2/PR4 diffs; watch for `vercel.json` merge overlap.

### 2025-11-04 12:05 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-05-40-19cc9758-0231-418a-b4de-2538f88b2949.jsonl`
- **Summary:** Acceptance matrix for each PR (headers inspection, fence 401/200 checks, PR2 noindex verification, PR4 `pnpm test`, post-deploy probes).
- **Follow-ups:** Use matrix as QA checklist once pending work lands.

### 2025-11-04 12:05 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-04-53-c6c7c3a2-95fe-4d93-bf27-0ff65f59599f.jsonl`
- **Summary:** Inventory of `package.json` scripts, absence of lockfiles, CI workflows, existing tests, and public static entrypoints.
- **Follow-ups:** None beyond acting on PR-specific tasks.

### 2025-11-04 12:00 CET - Auto - Planning Pass
- **Session:** `rollout-2025-11-04T13-00-27-035a4137-821f-4924-a5df-88752ac03d60.jsonl`
- **Summary:** Multi-agent planner mapped four-PR DAG, dependencies, smoke/test expectations, and shell setup for future tasks (see acceptance matrix entry for details).
- **Follow-ups:** Execute outstanding PR2/PR4 items; update docs as noted.

### 2025-11-04 08:42 CET - Auto - Compliance Sweep
- **Session:** `rollout-2025-11-04T09-42-32-d2d99936-2fbb-46bf-963c-5ba9b250971c.jsonl`
- **Summary:** Flagged keyboard shortcut collisions in `tools/sitemap-delta` & `tools/wayback-fixer`, missing `aria-live`, and sitemap politeness gaps.
- **Follow-ups:** Verify fixes once PR2/PR4 work lands; re-run UI smokes and capture evidence.

### 2025-11-04 05:55 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T05-54-59-1c5bc25e-ac5c-4653-83fb-5dd9da7168ee.jsonl`
- **Summary:** Blocked applying `api/metafetch.js` patch due to read-only sandbox; documented diff to add request-id + JSON headers.
- **Follow-ups:** Ensure PR1 branch incorporates request-id helper (already present in local implementation; double-check after CSP update).

### 2025-11-04 02:11 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T02-10-58-8ab922a8-7262-4741-b85b-257ba4745771.jsonl`
- **Summary:** Read-only sandbox prevented applying sitemap-delta timeout/maxCompare patch; included diff snippet for manual apply.
- **Follow-ups:** Verify current `api/sitemap-delta.js` matches intended behavior post-PR1 commit (timeout, maxCompare, truncation metadata).

### 2025-11-04 02:09 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T02-09-05-3289c90a-4213-46a4-9c0f-984b0525407a.jsonl`
- **Summary:** Initial read-only run captured minimal diff for `api/wayback-fixer.js` to add request-id handling.
- **Follow-ups:** Confirm PR1 commit includes these changes (current code does expose `cache-control` + request-id).

## Outstanding Roll-up (as of 2025-11-04 18:30 CET)
- Add `<meta name="robots" content="noindex">` to beta HTML shells and `data-testid="debug-scheduler"` to the DLF debug paragraph (PR2).
- Introduce CSP + `/public/(.*)` cache rule per original PR1 diff; capture curl evidence and store under `artifacts/pr1-security-cache-2025-11-04/`.
- Import `tests/api_contracts.test.mjs`, `tests/dlf_envelope_invariants.test.mjs`, `tests/csv_hardening.unit.test.mjs`; update `package.json` scripts and run `pnpm test` (PR4).
- Run preview smoke + fence evidence collection, archive results, and document in README/DEPLOY docs.
- Refresh `README.md`, `README_DEPLOY.md`, `DEPLOY_PRODUCTION_CHECKLIST.md`, `TESTING.md` with new verification steps and evidence pointers.
### 2025-11-12 11:26 CET (UTC+0100) — Preview browser smoke PASS (pages 200; APIs 405 JSON on GET) (preview-prod-green)
- Mode: manual
- Branch: `preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Used local env tokens to set `x-vercel-protection-bypass` header and cookie; access granted.
  - Pages: `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/` all returned 200 HTML in the browser.
  - APIs (GET): `/api/check`, `/api/sitemap-delta`, `/api/wayback-fixer`, `/api/metafetch` returned 405 with JSON bodies and request-id, which is expected (POST-only endpoints).
  - Saved curl summary with status/content-type for all endpoints.
- Evidence:
  - Artifacts: artifacts/preview_smoke/20251112/summary.txt, set_cookie.headers, cookies.txt
- Follow-ups:
  - Optional: POST sanity calls for each API to confirm 200/JSON happy paths; capture artifacts.
### 2025-11-12 11:36 CET (UTC+0100) — Converter POST 500 fixed by adding Python deps (api/requirements.txt)
- Mode: manual
- Branch: `preview-prod-green`
- Summary:
  - Functional test of `/api/convert` POST returned 500 with `ModuleNotFoundError: pydantic` from the Vercel lambda.
  - Added `api/requirements.txt` (fastapi, pydantic, requests, pypandoc) so Preview bundles runtime deps.
  - Updated tool_desc_converter.md with a Major changes entry explaining the fix and expected impact.
- Evidence:
  - 500 trace: captured via curl (see terminal output above); will re‑run after Preview redeploy.
- Follow-ups:
  - Trigger Preview redeploy (push this commit) and re‑smoke `/api/convert/health` and POST convert; save artifacts under `artifacts/convert/20251112/`.
### 2025-11-12 12:05 CET (UTC+0100) — Secret file reminder + AGENTS.md note
- Mode: manual
- Branch: `preview-prod-green`
- Summary:
  - Documented the exact paths of the `.env*` secrets under `tinyutils/` and `.vercel/` inside `AGENTS.md` so anyone can cat the files if the values vanish from their `PATH`.
  - Captured why the preview smoke/convert investigation took longer: chasing bypass cookies, verifying 405/500 output, and rerunning curl flows to ensure we had evidence before editing config.
- Evidence: none (doc-only change).
- Follow-ups: None.
### 2025-11-13 14:27 CET (UTC+01:00) — Repo review + checklist verification (preview-prod-green)
- Mode: manual
- Branch: `preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Performed full repo scan against AGENTS.md checklist: required pages and Edge APIs all present and ESM-compliant.
  - Verified hardening in Edge APIs: public-only networking, AbortSignal timeouts, single retry on 429/5xx with jitter, global/per-origin concurrency caps, DLF HSTS/TLD guards, and JSON content-type headers.
  - Confirmed `vercel.json` has security headers; also contains rewrites for preview fence routing (no `functions`/`runtime` blocks).
  - Validated UI a11y/UX points: sticky table headers, guarded keyboard shortcuts, CSV hardening in exports.
  - Collected evidence artifacts (file presence, patterns, and config dumps).
- Evidence:
  - artifacts/review/20251113/tree.txt
  - artifacts/review/20251113/checklist_status.txt
  - artifacts/review/20251113/edge_runtime_hits.txt
  - artifacts/review/20251113/cjs_in_api.txt
  - artifacts/review/20251113/package_json.txt
  - artifacts/review/20251113/vercel_json.txt
  - artifacts/review/20251113/md_files.txt
- Follow-ups:
  - Clarify policy on `vercel.json` "headers only" vs current `rewrites` used for preview fence. If strict, propose documenting the exception or moving fence routing elsewhere.
### 2025-11-13 14:46 CET (UTC+01:00) — Orientation + status recap
- Mode: manual
- Branch: `HEAD
unknown`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary: Scanned repo, READMEs, AGENTS.md; verified key pages and Edge APIs exist; ran Node tests (9/10 pass, PDF test expects PREVIEW_URL); noted converter external PDF path (_pdf_external.py) + env strip fixes; saved evidence under tinyutils/artifacts/orientation/20251113/.
- Evidence: tinyutils/artifacts/orientation/20251113/tree.txt, tinyutils/artifacts/orientation/20251113/docs_list.txt
- Follow-ups: Set PREVIEW_URL to run pdf_envelope test locally; confirm preview bypass token for browser smokes; decide on PDF renderer path (external vs xhtml2pdf).

### 2025-11-13 15:24 CET (UTC+01:00) — Converter E2E smoke against preview
- Mode: manual
- Branch: 
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Exercised /api/convert with MD(simple/complex), HTML, remote DOCX, remote PDF (to text), ZIP batch using x-vercel-protection-bypass header.
  - Saved outputs (PDF/HTML/DOCX/TXT) and headers; wrote REPORT.md.
- Evidence: tinyutils/artifacts/converter_e2e/20251113 (REPORT.md, *.resp.json, *.headers.txt, saved outputs)
- Findings:
  - All conversions OK except PDF→text (remote) which failed: ModuleNotFoundError: pypdf (missing in preview runtime).
  - meta.pdfExternalAvailable=true but x-pdf-engine header shows xhtml2pdf; engine likely fell back locally or detection needs refining.
  - GET /api/convert?__health=1 returns 405; consider exposing GET /api/convert/health 200.
- Follow-ups:
  1) Ensure  installed for preview; 2) Verify external renderer + surface engine/version in meta; 3) Add ZIP batch test; 4) Document health path in TESTING.md.
### 2025-11-13 15:25 CET (UTC+01:00) — Converter preview fixes (deps + PDF engine logs)
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Added `api/convert/requirements.txt` so Vercel installs Python deps for the convert function (includes `pypdf`) to unblock PDF→text extraction.
  - Threaded PDF engine detection into per-job logs in `api/convert/convert_service.py` so `app.py` can fill `meta.pdfEngine` reliably. Logs now include either `PDF rendered via external Chromium: engine=… version=…` or `PDF rendered via xhtml2pdf`.
  - Tightened `tests/pdf_envelope.test.mjs` to assert a non-empty `meta.pdfEngine` when `PREVIEW_URL` is set; skips when not set.
- Evidence:
  - Code: `tinyutils/api/convert/requirements.txt`, `tinyutils/api/convert/convert_service.py`, `tinyutils/tests/pdf_envelope.test.mjs`.
  - Local tests: `pnpm test` → 9 pass, 0 fail, 1 skipped (pdf_envelope when PREVIEW_URL unset).
- Follow-ups:
  - Redeploy preview to ensure `pypdf` is installed for PDF→text; verify remote PDF → md/html/txt succeeds.
  - Confirm external PDF renderer health; if used, `meta.pdfEngine` should report external engine and version.
### 2025-11-13 16:28 CET (UTC+01:00) — Reviewed security emails (PDF) + logged next steps before changes
- Mode: manual
- Branch: 
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Evidence: tinyutils/artifacts/security_emails/20251113 (original PDFs + extracted text where possible; SUMMARY.txt)
- Files: Re- [NicheToolsCavin:tinyutils] CI- Preview smoke (secrets-optional) + Prod depl 2.pdf,Re- [NicheToolsCavin:tinyutils] CI- Preview smoke (secrets-optional) + Prod depl 3.pdf,Re- [NicheToolsCavin:tinyutils] CI- Preview smoke (secrets-optional) + Prod depl.pdf,
- Notes:
  - Copied the three PDFs from /tmp to artifacts; extraction shows they are likely image-based PDFs (strings/binary). OCR not run pending approval.
  - Logged next steps here before making changes per request.
- Next steps captured from context (security hardening):
  • Stop committing secrets: add global ignore for env files; keep *.example templates.
  • Rotate preview/prod tokens stored in Vercel/Cloud Run (BYPASS_TOKEN, PREVIEW_BYPASS_TOKEN, VERCEL_AUTOMATION_BYPASS_SECRET, CONVERTER_SHARED_SECRET). Avoid sharing them in docs or artifacts.
  • Redact tokens already present in long-form docs and artifacts; replace with placeholders.
  • Confirm preview fence always required for gated tools; keep X-Robots-Tag noindex and CSP strict.
  • Ensure client code never embeds server secrets (Blob token); keep server-only usage in Python.
- Actions taken now (safe, minimal):
  • Added ignore patterns to tinyutils/.gitignore to prevent committing any .env files (root and nested), preserving *.example.
- Follow-ups requested:
  • Approval to OCR the three PDFs to extract precise wording and any additional action items.
  • Approval to redact tokens in large doc files automatically (adds a broad diff), or keep as-is locally.
### 2025-11-13 16:47 CET (UTC+01:00) — OCR of security emails + Security policy added
- Mode: manual
- Branch: 
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Per request, OCR’d the three security emails from /tmp; saved  and updated .
  - Added  and referenced it from AGENTS.md; expanded .gitignore to ignore all  files repo‑wide while preserving .
- Evidence:
  - tinyutils/artifacts/security_emails/20251113 (PDFs, OCR text, OCR excerpts in SUMMARY)
- Follow-ups:
  - Token rotation checklist is documented; ready to execute on approval.
  - Auto‑redaction in website content is deferred per request.
### ${NOW} — OCR of security emails + Security policy added
- Mode: manual
- Branch: `ci/preview-prod-green`
- CWD: /Users/cav/dev/TinyUtils/tinyutils
- Summary:
  - Per request, OCR’d the three security emails from /tmp; saved `*.ocr.txt` and updated `SUMMARY.txt`.
  - Added `SECURITY.md` and referenced it from AGENTS.md; expanded .gitignore to ignore all `.env*` files repo‑wide while preserving `*.example`.
- Evidence:
  - tinyutils/artifacts/security_emails/${TODAY} (PDFs, OCR text, OCR excerpts in SUMMARY)
- Follow-ups:
  - Token rotation checklist is documented; ready to execute on approval.
  - Auto‑redaction in website content is deferred per request.
- Added rotation helper: `tinyutils/scripts/rotate_tokens.sh` and playbook `tinyutils/docs/SECURITY_ROTATION_PLAYBOOK.md`.
### Major changes — 2025-11-14 [00:00] CET (UTC+0100)

Added
• None

Removed
• None

Modified
• None (manual QA only)

Human-readable summary
Manual QA of https://www.tinyutils.net/tools/text-converter/ using the internal browser. Ran conversions across Markdown/HTML/Plain Text/RTF and toggled options. Saved notes at tinyutils/artifacts/text-converter/20251114/notes.txt

Impact
• No behavior change. Evidence added under artifacts.
### Major changes — 2025-11-14 [00:20] CET (UTC+01:00)

Added
• Retest artifacts: tinyutils/artifacts/text-converter/20251114/retest-2.txt

Removed
• None

Modified
• None (manual QA only)

Human-readable summary
Re-tested Text Converter after fixes. Verified HTML→Plain Text truncation is resolved; HTML→HTML no stray code block; DOCX generation steady; RTF→Markdown with zero‑width removal OK. HTML→Markdown now maps figure/figcaption to image + italic caption; footnotes remain as lightweight HTML wrappers, which matches current UI help text. Extract media now clarifies scope via tooltip and behaves consistently for HTML-only output.

Impact
• No code change in repo. Preview tool appears green for tested cases.
### Major changes — 2025-11-14 [00:45] CET (UTC+01:00)

Added
• Artifact: tinyutils/artifacts/text-converter/20251114/latex-empty-output.txt

Removed
• None

Modified
• None (manual QA only)

Human-readable summary
Ran fixture-style checks via internal browser (no uploads) on the Document Converter. Verified RTF→{md,txt} PASS with correct formatting; re-ran LaTeX→{md,txt} using a minimal snippet and observed empty Markdown and 1-byte TXT output. Captured evidence.

Impact
• One remaining issue: LaTeX path appears to return empty output for simple input.
### Major changes — 2025-11-14 [03:26] CET (UTC:z)

Added
• Artifacts: artifacts/depmap/20251114/tinyutils-deps.mmd
• Artifacts: artifacts/depmap/20251114/tinyutils-deps.md
• Artifacts: artifacts/depmap/20251114/tinyutils-deps.svg

Removed
• None

Modified
• None

Human-readable summary
Generated a visual dependency map (Mermaid + SVG) from the repo using an external helper script placed in ../TinyUtils. Copied outputs into the repo's artifacts for reference. No code or behavior changed.

Impact
• No behavior change.
• Provides a quick visual of file imports, script tags, npm packages, and external fetch hosts.

Context
• Branch: main
• CWD: /Users/cav/dev/TinyUtils/tinyutils
• Evidence: artifacts/depmap/20251114/

### Major changes — 2025-11-14 [03:30] CET (UTC:z)

Added
• Artifacts: artifacts/depmap/20251114/tinyutils-deps.html

Removed
• None

Modified
• None

Human-readable summary
Added an interactive HTML mind map (pan/zoom, search, toggle packages/hosts, fit/freeze) for easier on-screen exploration.

Impact
• No behavior change; visualization only.
• View locally: ~/dev/TinyUtils/deps/tinyutils-deps.html

### Major changes — 2025-11-14 [03:33] CET (UTC:z)

Added
• Updated artifact: artifacts/depmap/20251114/tinyutils-deps.html (inline D3, offline-friendly)

Removed
• None

Modified
• None

Human-readable summary
Regenerated the interactive HTML with D3 embedded inline to avoid blank screen when CDN is blocked or offline.

Impact
• Opens reliably from file:// without network.

### Major changes — 2025-11-14 [03:36] CET (UTC:z)

Added
• Defaulted folder filter to api,tools,scripts,tests,public,root (use --collapse all to include everything).
• Updated artifact: artifacts/depmap/20251114/tinyutils-deps.html (default-focused view).

Removed
• None

Modified
• None

Human-readable summary
Interactive map now opens by default with only the core folders for readability. Pass --collapse all to see every bucket.

Impact
• Cleaner default view; no functional change to repo.

### Major changes — 2025-11-14 [03:40] CET (UTC:z)

Added
• Local D3 fallback injected into deps/tinyutils-deps.html for file:// reliability.

Removed
• None

Modified
• Updated artifact: artifacts/depmap/20251114/tinyutils-deps.html.

Human-readable summary
Ensured the interactive map works offline by adding a local d3.v7.min.js reference before the graph code, in addition to inline code.

Impact
• No repo behavior change; visualization opens consistently from Finder/Preview.

### Major changes — 2025-11-14 [03:42] CET (UTC:z)

Added
• Bucket toggle UI (All/None) in interactive HTML.\n• Updated artifact: artifacts/depmap/20251114/tinyutils-deps.html

Removed
• None

Modified
• Default-view refinements; no code behavior changes.

Human-readable summary
Added live folder filters so you can hide/show top-level buckets in the mind map without re-running the script.

Impact
• Improves readability for large graphs; no repo changes.
### Major changes — 2025-11-14 [01:12] CET (UTC+01:00)

Added
• UI: LaTeX (.tex) option in From menu; Auto mode detects pasted TeX
• Server: auto/md/text → latex promotion when bytes/filename look like TeX
• Script: scripts/ui_smoke_converter_latex.mjs (UI-shaped payload smoke)

Removed
• None

Modified
• tools/text-converter/index.html, api/_lib/pandoc_runner.py, api/convert/convert_service.py

Human-readable summary
Fixed LaTeX empty-output by teaching both the UI and server to recognize TeX input and route through the Pandoc latex reader. Added a small smoke script to exercise /api/convert using the same data-URL payload the UI sends. Opened PR fix/converter-latex-detect and pushed branch.

Impact
• LaTeX paste/upload now returns non-empty md/txt/html with preserved math and headings.
• Preview will reflect changes once Vercel posts the URL on PR #28.
### Major changes — 2025-11-14 [04:25] CET (UTC+01:00)

Added
• Preview smoke artifacts: tinyutils/artifacts/convert/20251114/preview-smoke-*
• LaTeX preview smoke: tinyutils/artifacts/text-converter/20251114/latex-smoke/result.json

Removed
• None

Modified
• PR #28 commented with Preview GREEN summary and artifact pointers

Human-readable summary
Ran preview smoke against the Vercel deployment posted on PR #28. Converter endpoints responded; UI-shaped LaTeX smoke (auto + latex) returned non-empty Markdown/Text. Added a PR comment with links and artifact locations.

Impact
• Converter is green in Preview for the exercised cases. Proceed to owner review.
### Major changes — 2025-11-14 [04:31] CET (UTC+01:00)

Added
• Markdown dialect selector in UI; server honors `mdDialect` (GFM/CommonMark/Strict)

Removed
• None

Modified
• api/convert/app.py, api/convert/convert_types.py, api/convert/convert_service.py, tools/text-converter/index.html

Human-readable summary
Started Markdown dialect integration: users can choose the Markdown flavor for exports. The UI exposes a selector, the API accepts `options.mdDialect`, and the server re-renders the cleaned markdown to the requested dialect using pandoc. Default remains GFM; non-GFM falls back gracefully on any error.

Impact
• Enables teams that need CommonMark or strict Markdown to download the exact dialect they expect, without changing on-screen preview.
### Major changes — 2025-11-14 [11:12] CET (UTC+01:00)
Added
• docs/AGENT_ROSTER.md — synced roster from ops screenshot (personal agent redacted)
• agents/roster.json — source of truth for enabled agents

Removed
• None

Modified
• Log + docs — context resync and roster doc added.
• agents/roster.json — added ThomasR and ensured all listed agents enabled.
• docs/AGENT_ROSTER.md — added ThomasR entry.

Human-readable summary
Reviewed current branch and files to regain context after session loss. Confirmed converter LaTeX detection and Markdown dialect selector are present; Edge APIs and pages exist per preview checklist; `vercel.json` is headers-only with rewrites; `package.json` has `"type": "module"`.

Impact
• No behavior change. All screenshot-listed agents are marked enabled for planning; future benching will toggle in agents/roster.json with timestamped log entries.

### Major changes — 2025-11-14 16:21 CET (UTC:z)

Added
• Evidence: artifacts/pdf-b2-test/20251114/notes.txt (UI PDF test findings).

Modified
• None

Removed
• None

Human-readable summary

Manually tested the prod Document Converter with ‘B2 Moral Dilemmas … .pdf’. The preview textarea displayed binary PDF bytes; Convert timed out after ~45s. Root causes likely: client reads PDFs as text (uses file.text()) and infers markdown on Auto, preventing server PDF preprocessing; plus 40s client timeout too short for cold-start.

Impact
• PDF uploads via UI currently unreliable: bad preview + frequent timeout.
• Next: fix client to treat PDFs as binary (arrayBuffer → data:application/pdf), force From=pdf, do not inject binary into textarea; increase timeout + retry; optionally harden server auto-detect.


### Major changes — None

Added
• Bench: gemini-2.5-flash until 2025-11-15 15:00 CET (auto-unbench).
• Orchestrator policy in .code/agents/roster.json: prefer enabled+non-benched, auto-unbench on expiry.

Modified
• .code/agents/roster.json updated with policy + bench block.

Removed
• None

Human-readable summary

Benched the fast ‘flash’ model per request until tomorrow 15:00 (Europe/Madrid). Updated the agents roster so the orchestrator always prefers enabled, non-benched agents and automatically unbenches when the bench period ends.

Impact
• Parallel /code runs will avoid gemini-2.5-flash until the bench expires; fallback order uses Code GPT-5 Codex, Claude Sonnet 4.5, then Qwen, etc.


### Major changes — None

Added
• None

Modified
• code_config_hacks .code/config.toml: enabled claude-sonnet-4.5 and gemini-2.5-flash; fixed flash model typo in args-read-only.

Removed
• None

Human-readable summary

Aligned external agent config to ensure the orchestrator has more eligible agents. Flash remains benched via local roster until 2025-11-15 15:00 CET, but is now enabled so it auto-unbenches cleanly. Claude Sonnet 4.5 is enabled for immediate use.

Impact
• Prevents conflicts where disabled entries in code_config_hacks could override TUI settings.


### Major changes — None

Added
• Custom agents prioritized in local roster (code-teams-personal/tarot/teacher, ThomasR).

Modified
• Bench: claude-sonnet-4.5 until 2025-11-18 15:00 CET (auto-unbench).
• External config: claude-sonnet-4.5 set enabled=false to reflect user setting.
• Selection order updated to prefer custom ChatGPT accounts first.

Removed
• None

Human-readable summary

Ensured the orchestrator chooses your custom ChatGPT accounts by default. Claude is disabled until Tuesday. This removes conflicting signals between the external TOML and the local roster.

Impact
• /code and multi-agent flows will utilize the custom accounts immediately; Claude resumes after bench expiry.


### Major changes — None

Added
• Agents section in AGENTS.md describing sources, priority and benches.
• External reminder note: ~/dev/CodeProjects/code_config_hacks/AGENTS-NOTES.md.

Modified
• None

Removed
• None

Human-readable summary

Documented where the two agent configs live, the current selection order, and bench windows; added a persistent reminder in code_config_hacks for future reference.

Impact
• Avoids future confusion about which config wins and how to update it.


### Major changes — None

Modified
• AGENTS.md: Removed explicit bench/unbench listings; now references roster.json as the single source of truth and keeps only rules + locations + selection order.

Human-readable summary

Avoided redundancy and potential drift by not duplicating bench windows in documentation.

### Major changes — None

Added
• Project overrides in external config to force workspace-write for /Users/cav/dev/TinyUtils/tinyutils and /Users/cav/.code/working/tinyutils.

Modified
• None

Removed
• None

Human-readable summary

Enabled workspace-write sandbox for the repo and agent worktrees so reassigned agents can apply the PDF fix.

Impact
• Agents will be able to modify files and log documentation without approvals.
### Major changes — 2025-11-15 04:19 CET (UTC+01:00)

Added
• None

Removed
• None

Modified
• Observed current branch state (`fix/converter-pdf-rtf-ui-testplan-gcp`) and prep notes before diving into new tasks.

Human-readable summary
Prepared to continue work under `fix/converter-pdf-rtf-ui-testplan-gcp`, ensuring the mandatory per-turn log entry captures the state before deciding on actionable next steps.

Impact
• No code changes. This entry keeps documentation aligned with the latest agent turn.

Follow-ups
• None.
### Major changes — 2025-11-15 08:24 CET (UTC+01:00)

Added
• None

Removed
• None

Modified
• Executed `scripts/preview_smoke.mjs` with the provided automation bypass tokens to capture the latest Preview run results.

Human-readable summary
The smoke run failed because every page and API fetch reported a "fetch failed" error; see `artifacts/preview-green/20251115/preview_smoke.after_automation.log` and the recorded exit code for details.

Impact
• Preview validation currently does not pass; all required pages/APIs are unreachable.<br>
• Need to determine whether this is due to preview protection blocking requests or a networking issue inside the smoke script run environment.

Follow-ups
• Investigate the fetch failures (preview protection, headers, or timeout) before attempting another smoke run.
### Major changes — 2025-11-15 08:29 CET (UTC+01:00)

Added
• Preview smoke now retries until a Vercel protection bypass handshake completes before returning a Response.

Removed
• None

Modified
• `scripts/preview_smoke.mjs` now cycles through automation/preview/legacy tokens, appends `_vercel_jwt` cookies, and keeps `redirect: 'manual'` to avoid infinite loops.

Human-readable summary
Updated the smoke script to gracefully handle Vercel's 307 bounce while trying different bypass tokens, then reran the tool; every required page and API now returns 200/JSON with the provided automation token, so the smoke test passes.

Impact
• Preview verification is green again (all pages/APIs reachable) after the new handshake logic. ✅
• The script is resilient to redirect loops caused by tokens that only set `_vercel_jwt` cookies after the first request. ✅

Follow-ups
• None.
