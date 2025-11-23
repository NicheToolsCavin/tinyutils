# TinyUtils Architecture & Guardrails (WS1 Summary)

## High-level architecture

- Root static pages: `index.html`, `about.html`, `contact.html`, `support.html`, `privacy.html`, `terms.html`, `feedback.html`, `cookies.html`, blog under `blog/`, FAQ under `faq/`.
- Tools UI: `tools/` contains per-tool UIs such as:
  - `tools/dead-link-finder/` — Dead Link Finder
  - `tools/sitemap-delta/` — Sitemap Delta
  - `tools/wayback-fixer/` — Wayback Fixer
  - `tools/text-converter/` — Text/Document Converter
  - `tools/multi-file-search-replace/` — Multi-file Search & Replace
  - `tools/encoding-doctor/` — Encoding Doctor
  - `tools/formats/`, `tools/keyword-density.html`, `tools/meta-preview.html`, etc.
- Edge API layer: `api/` implements JSON-only Edge handlers backing the tools:
  - `api/check.js` — Dead Link Finder backend
  - `api/sitemap-delta.js` — Sitemap Delta backend
  - `api/wayback-fixer.js` — Wayback Fixer backend
  - `api/metafetch.js` — Metadata fetch for previews
  - `api/encoding-doctor.js` — Encoding Doctor backend
  - `api/multi-file-search-replace.js` — Multi-file Search & Replace backend
  - `api/convert/*` — Converter backend (Python via bridges in `api/_lib`)
  - `api/health.js`, `api/fence.js` — health/preview protection helpers
- Shared backend utilities:
  - `api/_lib/` — Python helpers (`utils.py`, `pandoc_runner.py`, `text_clean.py`, etc.) used by Converter and related APIs.
- Converter engines & filters:
  - `convert/`, `docx-to-markdown/`, `rtf-to-markdown/`, `html-to-markdown/`, `filters/` — Python + Pandoc-based conversion logic.
- Global styles & assets:
  - `styles/` — shared CSS.
  - `public/` — static assets (`favicon.ico`, `og.png`, etc.).
  - `sitemap.xml`, `robots.txt`, `ads.txt` — SEO and ads config.
- Project configuration:
  - `package.json` — Node 20 Edge runtime, ESM via `"type": "module"`, smoke/test scripts.
  - `vercel.json` — headers-only; no functions/runtime blocks (static output + Edge APIs).

## Core guardrails (from AGENTS.md, SECURITY.md, TEST_PLAN_SITE, smoke docs)

### 1. Configuration & deployment
- Vercel config:
  - `vercel.json` must contain only `headers` rules. No `functions`, `routes`, or `runtime` blocks.
  - Static site (Framework = Other), output directory = repo root.
- Package/bundling:
  - `package.json` must keep `"type": "module"` so all Node/Edge code is ESM.
- Branching/deploy:
  - Work happens on feature branches + PRs; previews are validated before any production deploy.
  - Secrets for previews (bypass tokens, preview secret) live only in env vars, never in git.

### 2. Edge API rules (all handlers under `api/`)
- Runtime & module format:
  - Every Edge handler exports `config = { runtime: 'edge' }` and a default async `handler(req)`.
  - ESM-only: no `require()`, no CommonJS.
  - No top-level `await` or `return`, and never reference `req` outside the handler function.
- Network safety:
  - Outbound requests must:
    - Only use `http:` or `https:` schemes.
    - Block localhost/loopback and private networks: `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local (`169.254.*`), IPv6 loopback (`::1`), ULA (`fc00::/7`), and link-local prefixes (`fe80::/10`).
    - Block `.local` hostnames.
- Timeouts, retries, politeness:
  - Use AbortSignal-based timeouts for all outbound `fetch` calls.
  - On `429` or `>= 500` responses, retry once with small randomized jitter and annotate a note (e.g., `retry_1`) when useful.
  - Respect global concurrency ≤ 10 and per-origin concurrency ≤ 2 for outbound requests, with small jitter between same-origin calls.
#### 2.1 Response format and envelopes
- APIs must always return `content-type: application/json; charset=utf-8` and `cache-control: no-store`.
- All Edge handlers return a JSON body that includes:
  - A `meta` object containing telemetry and tool-specific settings; for all APIs this includes:
    - `requestId` — stable identifier mirrored in the `x-request-id` response header.
    - Optional `note` or `error` fields describing error conditions (shape varies slightly by handler; see below).
  - Tool-specific data fields (e.g. `rows`, `results`, `files`, `outputs`, `added/removed/pairs`, `text`, etc.).
- Two envelope “families” exist today:
  - **v2-style envelope** (Encoding Doctor, Multi-file S&R, some newer helpers):
    - Success responses include `ok: true` plus `meta` and tool data.
    - Validation/limit errors use `ok: false` with `meta.error` (human-readable message) and `meta.note` (stable short code such as `missing_input`, `text_too_large`, `invalid_export_format`).
  - **v1-style envelope** (Dead Link Finder, Sitemap Delta, Wayback Fixer, Metafetch):
    - Success responses omit root-level `ok` and instead return `{ meta, data... }`.
    - Errors use top-level fields like `code`/`message` (DLF) or `error`/`details` (Sitemap Delta), with `meta.requestId` and optional `meta.note`/`meta.error` for observability.
- Converter FastAPI endpoints (`/api/convert/*`) follow their own but consistent pattern:
  - Success responses return `{ ok: true, meta: { requestId, pdfEngine, ... }, jobId, outputs, preview, logs, errors }`.
  - Validation/HTTP errors are raised as FastAPI `HTTPException` instances and surfaced as `{ detail: "..." }` with appropriate 4xx/5xx codes; they do **not** currently include a full v2-style `ok/meta` block.
- Error semantics (for the v2-style Edge handlers and where applicable elsewhere):
  - 4xx status codes are used for client/validation problems (bad input, unsupported URLs, size/limit envelopes, invalid export formats).
  - 5xx (or 502 in some tools) are used when upstream systems or internal errors cause a failure.
  - Error details never include stack traces or secrets; they are limited to short messages, stable `note` codes, and high-level context.

##### Per-API meta highlights
- **Dead Link Finder (`/api/check`)**
  - `meta.scheduler` — scheduler state and concurrency info.
  - `meta.stage` — coarse stage indicator (e.g. `fetch_page`, `check_links`).
  - `meta.robotsSkipped` — count of URLs skipped due to robots.
  - `meta.robotsCrawlDelaySeconds` — most conservative crawl-delay observed, if any.
- **Sitemap Delta (`/api/sitemap-delta`)**
  - `meta.removedCount` / `meta.addedCount` — numbers of URLs removed/added.
  - `meta.suggestedMappings` — number of mapping suggestions returned.
  - `meta.sameRegDomainOnly` — whether the same-domain guard was applied.
  - `meta.maxCompare` / `meta.truncated` — comparison ceiling and whether the result set was truncated.
  - `meta.fetchCaps` — global/per-origin fetch caps.
- **Wayback Fixer (`/api/wayback-fixer`)**
  - `meta.totalChecked` — total URLs processed.
  - `meta.spnLimit` — Save Page Now cap (≤10).
  - `meta.spn` — structured object `{ limit, attempted, enqueued, capped }` describing SPN behaviour.
  - `meta.network` or retry fields (e.g. `network.retries`, `concurrency.*`) — reflect polite retry/concurrency behaviour.
- **Encoding Doctor (`/api/encoding-doctor`)**
  - `meta.textIncluded` — whether pasted text was processed.
  - `meta.fileCount` — number of file entries returned.
  - `meta.options` — echo of the effective repair options (autoRepair, normalizeForm, smartPunctuation).
  - Error notes such as `text_too_large`, `blob_payload_too_large`, `invalid_blob_url`, `unsupported_blob_scheme`, `disallowed_blob_host`, and `missing_input` are carried in `meta.note`.
- **Multi-file Search & Replace (`/api/multi-file-search-replace`)**
  - `meta.totalFiles` / `meta.changedFiles` — total files processed and the subset that changed.
  - `meta.exportFormat` — normalised export format (`md` or `txt`).
  - `meta.previewOnly` — whether this run was preview-only vs apply.
  - `meta.zip` — zip export descriptor when apply-mode is used (name, size, blobUrl).
  - Error notes in `meta.note` cover cases like `no_files`, `too_many_files`, `missing_search`, `pattern_too_large`, `invalid_export_format`, `too_large`, `invalid_regex`, and URL host/scheme guards.
- **Converter APIs (`/api/convert/*`)**
  - `meta.pdfEngine` / `meta.pdfEngineVersion` — which PDF engine handled the request.
  - `meta.pdfExternalAvailable` — whether an external PDF renderer is configured.
  - `meta.pdfDegradedReason` — when present, explains why the PDF extraction was considered degraded (e.g. `timeout`, `too_short_or_single_line`).
  - `jobId` — conversion job identifier.
  - `logs` / `errors` — structured arrays giving insight into the conversion path without exposing stack traces.
- CSV hardening:
  - Any CSV intended for Excel/Sheets must prefix values starting with `=`, `+`, `-`, or `@` with a single quote (`'`) to avoid formula execution.
- Tool-specific guards:
  - Dead Link Finder:
    - HSTS guard: do not downgrade HTTPS to HTTP when checking links.
    - TLD guard: apply stricter checks for `.gov`, `.mil`, `.bank`, `.edu`.
  - Wayback Fixer:
    - Enforce window preferences (Any/5y/1y) and propagate into CSV/JSON `meta`.
    - When SPN (Save Page Now) is on, enqueue at most 10 snapshots per run and annotate notes (`no_snapshot`, `spn_queued`).
  - Sitemap Delta:
    - Same-domain guard: when ON, filter cross-host URLs; when OFF, show them.
    - `.xml.gz` via index must either be processed (when supported) or clearly labeled as unsupported.

### 3. Frontend UX, accessibility, and behavior
- Tools pages must:
  - Use shared header/footer/nav patterns.
  - Provide clear instructions that match actual behavior (no contradictory text between tools or docs).
- Keyboard & A11y:
  - Visible focus outlines on interactive elements.
  - `aria-live="polite"` for progress/status announcements in long-running tools.
  - Shortcuts (e.g., Cmd/Ctrl+Enter to run, `F`/`E`/`J` on DLF) must not fire while the user is typing into form fields.
- Tables & scrolling:
  - Results tables must use a `.tableWrap` container with sticky `<thead>` headers and well-behaved scroll/overflow.
- Consent, analytics, and ads:
  - CMP/consent banner must appear on first visit; no analytics before consent.
  - Plausible analytics only load after consent.
  - Ads render only when explicitly enabled with `localStorage.setItem('ads','on')` and in the correct (production) environment.

### 4. Security & secrets
- Secrets discipline:
  - No real secrets in git (API keys, tokens, private keys, etc.).
  - Environment variables configured only on deployment platforms or local `.env*.local` files (ignored by git).
- Logging & artifacts:
  - Do not include raw tokens in logs, screenshots, or committed docs; redact all but the last 4 characters if needed.
  - Use `tinyutils/artifacts/<task>/<YYYYMMDD>/` for evidence (git-ignored), and reference paths in `docs/AGENT_RUN_LOG.md`.
  - When exporting headers as evidence, redact `Authorization` and `x-*-bypass` headers.
- Pre-PR checks:
  - Run the regex-based secret scan and env-file check from `SECURITY.md` before opening a PR.

### 5. Documentation & change logging
- Whenever behavior changes for a tool (Dead Link Finder, Sitemap Delta, Wayback Fixer, Converter, Multi-file Search Replace, etc.):
  - Append a dated entry to the corresponding `tool_desc_*.md` file using the required "Added/Modified/Fixed" format, human summary, impact, testing, and commit IDs.
- For each meaningful task or batch of changes:
  - Use `python scripts/log_run_entry.py` to append to `docs/AGENT_RUN_LOG.md`.
  - Use `python scripts/add_task_checklist_entry.py` to update `docs/AGENT_TASK_CHECKLIST.md` with status and evidence notes.
- Store evidence under `artifacts/<task>/<YYYYMMDD>/` and reference those paths in run logs and checklist entries.

---

This file is the concise, working summary for agents performing architecture-aware refactors and Edge API hardening. For full details, always refer back to `AGENTS.md`, `SECURITY.md`, `docs/TEST_PLAN_SITE.md`, and the `tool_desc_*.md` specs.
