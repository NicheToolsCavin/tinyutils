# Agent Run Log

Activity log for AI agents working on TinyUtils. Newest first.

---

<!-- RECENT ACTIVITY (Last 2 weeks - Full Context) -->

### 2025-12-16 03:40 CET - Manual - fix about canonical + OG
- **Branch:** `fix/about-route`
- **Summary:** Aligned both /about and /about.html canonical tags to /about and added OG/twitter meta for consistent SEO/preview metadata.

### 2025-12-16 03:23 CET - Manual - restore /about route
- **Branch:** `fix/about-route`
- **Summary:** Added a dedicated /about page to prevent 404s (new src/routes/about/+page.svelte mirrors the existing content with /about canonical).

### 2025-12-16 02:40 CET - Manual - blog quality + human voice pass (AdSense)
- **Branch:** `feat/blog-humanize-adsense`
- **Summary:** Expanded and rewrote blog posts to reduce thin-content risk and better match AdSense quality expectations. Removed template-y wording; validated all 73 blog posts are >=700 words.

### 2025-12-15 17:45 CET - Claude Code - Bug fixes + 9 new SEO blogs
- **Summary:** Fixed redirect loop off-by-one in check.js, worker slot acquisition tracking, nested sitemap silent drop warning. Added 9 new SEO blog posts. Total blogs now: 30.

### 2025-12-15 08:30 CET - Claude Code - 43 new SEO blog posts (overnight batch)
- **Summary:** Completed the 73-topic SEO blog matrix by writing all remaining 43 blog content files (document converters, image converters, SEO/link tools). Total blogs now: 73.

### 2025-12-14 17:20 CET - Manual - fix Vercel preview build + validate preview smoke
- **Branch:** `nav-blog-uniform`
- **Summary:** Fixed Vercel preview build failure caused by incorrect SvelteKit import. Tweaked nav highlighting for Tools. PR #62 checks green.

### 2025-12-14 16:56 CET - Manual - open PR for nav/blog uniformity
- **Branch:** `nav-blog-uniform`
- **Summary:** Opened PR #62 for nav/blog uniformity changes. Nav now includes Blog link across site with active highlighting.

### 2025-12-14 14:21 CET - Manual - unify nav + blog link + active highlighting
- **Branch:** `fix/nav-blog-uniform`
- **Summary:** Made header navigation consistent across static pages, tool pages, and blog pages; added Blog + Support links everywhere with active highlighting.

### 2025-12-14 00:48 CET - Manual - casual persona pass for blog outlines
- **Summary:** Expanded human-writing skill with persona mode for casual, varied blog voice. Rewrote all blog outline placeholders with varied casual personas.

### 2025-12-13 12:14 CET - Manual - image compressor deep review
- **Branch:** `feat/image-compressor`
- **Summary:** Added new /tools/image-compressor/ tool (client-side compress/convert, HEIC decode, ZIP batch, worker pipeline). Fixed UX edge cases.

### 2025-12-12 23:09 CET - Manual - repo review follow-ups (pytest + multipart hardening)
- **Branch:** `fix/unicode-ipa-fonts`
- **Summary:** Added pytest.ini, hardened Python multipart parsing, simplified ReportLab DejaVu font registration.

### 2025-12-12 18:29 CET - Manual - repo review bug sweep
- **Branch:** `fix/unicode-ipa-fonts`
- **Summary:** Replaced deprecated Python cgi multipart parsing with stdlib email-based parser. Fixed svelte-check warnings. Fixed smoke_dlf_extras.sh redirect handling.

### 2025-12-04 09:39 CET - Manual - preview_smoke + tiny-reactive preview harnesses
- **Branch:** `feat/converter-test-coverage-100pct`
- **Summary:** Ran preview_smoke.mjs and converter tiny-reactive harnesses. All converter flows PASS. Bulk Replace API env-blocked by Vercel 307 redirect loop.

### 2025-12-04 03:52 CET - Manual - Phase 6 bulk-replace harness fixes + preview rerun
- **Branch:** `feat/converter-test-coverage-100pct`
- **Summary:** Fixed bulk-replace tiny-reactive harness. UI harness passes; API smoke env-blocked by Vercel redirect loop.

### 2025-12-03 17:15 CET - Claude Code - MD→PDF: Control character cleanup and italic asterisk handling
- **Branch:** `feat/tools-redesign-vintage`
- **Summary:** Fixed 0x7F control character artifacts and literal asterisks in italic patterns for ReportLab PDF fallback path.

### 2025-12-03 12:40 CET - Manual - fix ui run-all harness paths
- **Branch:** `feat/tools-redesign-vintage`
- **Summary:** Adjusted tests/e2e/run-all.mjs to build absolute harness script paths via import.meta.url.

### 2025-12-03 12:24 CET - Manual - export validator + Sitemap/Wayback tiny-reactive exports
- **Branch:** `feat/tools-redesign-vintage`
- **Summary:** Added export-validator.mjs for blob export validation in tiny-reactive harnesses.

### 2025-12-03 11:55 CET - Manual - DLF tiny-reactive Tier0/Tier1 harness
- **Branch:** `feat/tools-redesign-vintage`
- **Summary:** Extended DLF harness with bypass support, list-mode crawls, and CSV/JSON export assertions.

### 2025-12-03 03:27 CET - Manual - preview_smoke.mjs against SvelteKit tools preview
- **Branch:** `feat/tools-redesign-vintage`
- **Summary:** All pages and APIs PASS on latest Vercel preview with bypass tokens.

### 2025-12-02 20:28 CET - Manual - rename Multi-file Search & Replace to Bulk Find & Replace
- **Summary:** Updated docs to treat Bulk Find & Replace as the canonical name.

### 2025-12-01 21:55 CET - Manual - fix ODT→DOCX blank output via direct docx path
- **Branch:** `fix/tool-card-height`
- **Summary:** Added direct docx conversion for odt/docx sources to avoid markdown loss.

---

<!-- COMPRESSED HISTORY (Older than 2 weeks - One-liners) -->

#### 2025-11-30
* **Manual - Vercel Speed Insights**: Installed @vercel/speed-insights via pnpm and wired in SvelteKit layout
* **Manual - converter preview fail-soft + sanitization**: Hardened previews with HTML sanitisation, meta flags, and CSV formula neutralization
* **Auto - tiny-reactive Tier0 flows**: Added UI harnesses for CSV Joiner, JSON↔CSV, PDF extractor, Sitemap Generator

#### 2025-11-29
* **Manual - converter preview review fixes**: Addressed PR #54 review feedback, hardened CSV table renderer, added JSON size guard
* **Manual - unify tool card heights**: Set shared min-height on ToolCard to equalize card sizes

#### 2025-11-28
* **Manual - format-specific preview renderers**: Implemented 5 specialized frontend renderers (CSV→table, JSON→highlighted, MD→side-by-side)
* **Manual - converter preview HTML + PDF margins**: Fixed ReportLab fallback and tightened margins for better PDF output

#### 2025-11-27
* **Manual - AGENT_RUN_LOG auto-dedupe + compression**: Fixed exponential growth of log file
* **Manual - tiny-reactive UI smokes run vs prod**: Ran ui_smoke scripts against https://www.tinyutils.net
* **Manual - add CSV Joiner, JSON↔CSV converter, PDF text extractor**: Added three new Python APIs and Svelte tool pages

#### 2025-11-26
* **Manual - SvelteKit tooling upgrade**: Bumped devDeps to adapter-vercel^6, vite^7, svelte^5.44
* **Manual - static pages UX polish**: Wrapped pages in card-page variants with gradient headings
* **Manual - tools page UX polish**: Simplified CSS, refined ToolCard hover state

#### 2025-11-25
* **Manual - SvelteKit home/tools UX parity**: Aligned home page and tools hub with static HTML versions
* **Manual - add UX screenshot capture script**: Added puppeteer + capture_ux_screens.mjs

#### 2025-11-24
* **Manual - final preview smokes + prod deploy**: All smokes PASS
* **Manual - revert glowup styling**: Reverted to simpler neutral styling

#### 2025-11-23
* **Manual - converter preview smokes green**: ReportLab-only PDF path; preview JSON artifacts
* **Manual - SvelteKit Phase2 tools slice**: Added DLF, sitemap-delta, wayback-fixer pages

#### 2025-11-22
* **Manual - WS3 Encoding Doctor safety + UX**: Hard caps for text/blob, clear 4xx envelopes
* **Manual - WS4 Google Funding Choices CMP bridge**: Wired consent adapter across all pages

#### 2025-11-21
* **Manual - purge defunct vercel links**: Replaced tinyutils-eight.vercel.app with tinyutils.net
* **Manual - favicon propagation**: Applied per-theme icon links to core pages

#### 2025-11-20
* **Manual - add og:url to converter landing pages**: Added explicit meta tags for SEO

#### 2025-11-19
* **Manual - converter fidelity Phase 2**: Added Lua filters for lists/code/media preservation

#### 2025-11-18
* **Manual - wire TinyUtils global AdSense slot**: Replaced placeholder AdSense values
* **Manual - UX Transformation Phase Complete**: All 6 major pages transformed

#### 2025-11-17
* **Manual - Phase 3 PR11 theme toggle**: Implemented global light/dark theme toggle

#### 2025-11-16
* **Manual - PR6 converter RTF output correctness**: Added pandoc --standalone for RTF
* **Manual - Google CMP**: Switched to Google Funding Choices CMP banner

#### 2025-11-15
* **Manual - PR #34 post-merge prod smokes**: All smokes PASS on www.tinyutils.net
* **Manual - converter automated tests**: All converter tests passing

#### 2025-11-14
* **Auto Markdown dialect feature**: Implemented for document converter
* **HTML conversion fixes + UX improvements**: Fixed 4 critical converter bugs

#### 2025-11-13
* **Environment variable whitespace fix**: Fixed trailing newlines in env vars causing HTTP errors

#### 2025-11-12
* **Converter API FINAL FIX**: Fixed cross-package import issues

#### 2025-11-05
* **Phase2 wrap**: PR1–PR4 evidence confirmed, CSP risk note drafted
* **Manual - Docs + a11y refresh**: Updated README/DEPLOY/VERCEL/TESTING

#### 2025-11-04
* **Auto - Planning Pass**: Multi-agent planner mapped four-PR DAG
* **Auto - Compliance Sweep**: Flagged keyboard shortcut collisions, missing aria-live

---

*Log trimmed 2025-12-16. Historical entries compressed to one-liners.*

<!-- RECENT ACTIVITY (Full Context) -->

### 2025-12-23 01:52 CET - Manual - fix Vercel config build failure
- **Mode:** manual
- **Branch:** `fix/vercel-config-functions`
- **Summary:**
  - Removed functions block from vercel.json to comply with headers-only guardrails
  - Addresses Vercel build error: unmatched Serverless Function pattern for api/convert/index.py
- **Evidence:** artifacts/vercel-build-fail/20251223/inspect-error.log
- **Follow-ups:**
  - Open PR and redeploy to confirm build succeeds

<!-- RECENT ACTIVITY (Full Context) -->

### 2025-12-23 02:18 CET - Manual - address PR #77 review feedback
- **Mode:** manual
- **Branch:** `fix/vercel-config-functions`
- **Summary:**
  - Updated copy_python_functions.mjs to emit Build Output API .vc-config.json and copy shared modules
  - Fixed DLF gate workflow to run npm ci so jsdom-dependent tests pass
  - Captured preview ads.txt headers/body for AdSense routing verification
- **Evidence:** artifacts/vercel-build-fail/20251223/inspect-error-excerpt.txt
- **Follow-ups:**
  - Push updates, re-run CI, respond to Claude review, then merge

<!-- RECENT ACTIVITY (Full Context) -->

### 2025-12-23 02:20 CET - Manual - fix DLF gate install method
- **Mode:** manual
- **Branch:** `fix/vercel-config-functions`
- **Summary:**
  - Switched DLF gate workflow to pnpm via corepack to avoid npm ERESOLVE on Svelte peer deps
  - Runs pnpm install --frozen-lockfile and pnpm test in CI
- **Evidence:** artifacts/vercel-build-fail/20251223/ci-npm-eresolve.txt
- **Follow-ups:**
  - Push update and recheck PR checks

