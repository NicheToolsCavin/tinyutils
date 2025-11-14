# TinyUtils — Comprehensive Test Plan (v2025-11-14)

Purpose
- Provide an end-to-end test plan for all TinyUtils pages and Edge APIs, including the Converter. Phased execution; not all steps run in one session.

How to use
- Before each PR: run relevant “Smoke” subset then expand to the “Deep” subset.
- Capture evidence in `artifacts/<task>/<YYYYMMDD>/` and log via scripts.

## 0) Global Preconditions
- PREVIEW URL available (Vercel comment on PR).
- Protection bypass values ready (Automation Bypass header/cookie).
- Browser targets: Chrome (latest), Safari (latest), Firefox (latest), Edge (latest).
- Network conditions: default; repeat select flows with 3G Fast throttling.

## Agent‑Assisted Checkpoints (ChatGPT Agent Mode, Deep Research, Pro Reasoning)
- Visual QA (Agent Mode): after any UI-affecting PR, run ChatGPT Agent Mode to capture annotated screenshots for:
  - /, /tools/, /tools/dead-link-finder/, /tools/sitemap-delta/, /tools/wayback-fixer/, /tools/text-converter/
  - A11y cues (focus outlines, contrast ≥ AA, sticky thead behavior), spacing, overflow, and component consistency.
  - Save to artifacts/agent-mode/<DATE> and reference in AGENT_RUN_LOG.md.
- Deep Research: for nuanced behaviors (robots, HSTS/TLD guards, Wayback APIs, sitemap .xml.gz support, Pandoc dialects), run a research pass to validate assumptions against primary sources; record citations in docs/research/<DATE> and link from AGENT_RUN_LOG.md.
- Pro Reasoning: before merging high‑impact PRs (converter engine/UI, network guards, consent/ads), run a Pro Reasoning pass to surface edge cases, performance pitfalls, and migration risks; produce a “Risks & Mitigations” note under docs/research/<DATE>/risks.md.

Milestone mapping
- After PR A (PDF→MD engine), run Deep Research (pdfminer trade‑offs) + Pro Reasoning (heuristics risks), then Visual QA for converter preview.
- After PR B (UI), run Visual QA (Agent Mode) across all tools + homepage.
- For DLF/Sitemap/Wayback changes, run Deep Research on protocol/TLD/HSTS rules and Pro Reasoning on concurrency/timeout/jitter.

## 1) Pages (Render + A11y + Ads/CMP)
Smoke
- / — Renders, nav links clickable, no console errors.
- /tools/ — Lists tools; cards link to DLF, Sitemap Delta, Wayback Fixer, Converter.
- Tool pages — header/footer consistent; sticky table headers present where applicable.
- Consent banner — visible first visit; choosing any option updates CMP + Consent Mode; no analytics before consent.
- Ads — Auto Ads top/bottom only; no Anchors/Vignettes.

Deep
- Keyboard: Tab order logical; visible focus; shortcuts (Cmd/Ctrl+Enter for converter; F/E/J on DLF) do not hijack typing in inputs.
- Cross-browser spot checks (Safari, Firefox, Edge): sticky `thead`, overflow containment, share-state restore.
- CSV hardening: open exported CSVs in Excel/Sheets; formulas do not execute (leading `= + - @` prefixed with `'`).

## 2) Edge APIs (Contracts + Guards)
Endpoints
- /api/check — POST payload with `pageUrl`; verify JSON envelope, `meta.scheduler`, `meta.stage`.
- /api/sitemap-delta — POST with small sitemap A/B; verify `added`/`removed` arrays and counts.
- /api/wayback-fixer — POST with 2 URLs; verify `results[]`, iso timestamps, window prefs in meta.
- /api/metafetch — POST with URL; title/description may be null or strings; JSON envelope present.

Guards & Safety
- Network: reject localhost/loopback/RFC1918/.local; only http/https.
- Timeouts: Abort after configured budget; on 429/5xx retry once with jitter and annotate `retry_1` note.
- Politeness: global concurrency ≤ 10; per-origin ≤ 2; small jitter between same-origin requests.
- DLF-specific: HSTS guard blocks https→http fallback; TLD guard for .gov/.mil/.bank/.edu.
- Responses: always `content-type: application/json`.

## 3) Converter (Inputs × Outputs)
Matrix (phased)
- Inputs: Markdown, HTML, Plain Text, DOCX, RTF, ODT, LaTeX, PDF, ZIP (mix of supported files).
- Outputs: MD, TXT, HTML, DOCX, RTF, PDF.

Smoke
- Paste “Hello” (Markdown) → MD/TXT/HTML/DOCX/RTF/PDF returns 6 outputs, non-empty.
- Upload DOCX simple → MD/HTML; `extractMedia` ON yields `-media.zip` when images present.
- Upload PDF text → MD/TXT; preview shows headings/snippets; no hard-wrap garbage.
- UI shows PDF checkbox; selecting RTF no longer 400s.

Deep
- HTML with `<figure><img><figcaption>` → Markdown renders image + italic caption.
- HTML → TXT and HTML → HTML use direct path, no truncation or stray code blocks.
- LaTeX detection: pasted .tex or LaTeX snippets infer `from=latex` automatically.
- ZIP: mixed DOCX/RTF/MD inside ZIP produce multiple outputs (reject unsupported members, skip __MACOSX, hidden files).
- Preview: headings/snippets/images populated; results table stable under rapid clicks.
- PDF rendering: when `PDF_RENDERER_URL` set, ensure x-pdf-engine header/meta present and engine logged; otherwise ReportLab fallback with `pdf_engine=reportlab` log.

Failure Modes
- Large files rejected with friendly message (limit enforced by `ensure_within_limits`).
- Bad ZIP returns 400 with message “Invalid ZIP file”.
- Network blob download errors surface as 400 with reason.

## 4) Tools — Dead Link Finder
Smoke
- Minimal crawl of 1 page; skips `javascript:`/`data:`/`mailto:` links.
- Robots fetch failure shows “robots unknown (proceeded)” chip.
- CSV/JSON exports include meta: runTimestamp, mode, source, concurrency, timeoutMs, robots, scope, assets, httpFallback, totals, truncated.
- Sticky header within `.tableWrap` works.

Deep
- HSTS guard: https origin refuses http fallback; TLD guard blocks sensitive TLDs.
- Keyboard shortcuts do not trigger while typing in inputs.

## 5) Tools — Sitemap Delta
Smoke
- Two sitemaps (≤ 2k URLs) produce sensible Added/Removed/Mapping; same-domain guard ON removes cross-host.
- `.xml.gz` via index processed or labeled “.gz not supported here”.
- Exports: nginx/Apache rewrite and 410 CSV look sane.

Deep
- Share-state restore via URL hash; malformed hash resets with a toast.

## 6) Tools — Wayback Fixer
Smoke
- Demo list shows Archived/No snapshot/SPN queued; ISO timestamps present.
- Window prefs Any/5y/1y persist into CSV/JSON meta.
- Verify HEAD ON shows 200/OK for good snapshots; low timeout shows “Timed out”.
- SPN ON enqueues ≤ 10/run; notes show `no_snapshot|spn_queued`.
- CSV headers match exactly (Replacements, 410 CSV).
- Guards block localhost/RFC1918/file:/javascript:.

## 7) Performance & Stability
- API responses ≤ 5s typical for small payloads; converter ≤ 10s for docx/pdf small tests.
- No uncaught exceptions in console; no mixed-content warnings; CSP headers present.

## 8) Preview/Prod Smoke Automation
- Use `node scripts/preview_smoke.mjs` with PREVIEW_URL and bypass token; capture outputs under artifacts/preview-smoke/<DATE>/.
- For converter, run `tinyutils/scripts/smoke_convert_preview.mjs` (if configured) or curl JSON payloads.

## 9) Documentation & Evidence
- For each run: update `docs/AGENT_RUN_LOG.md` and `docs/AGENT_TASK_CHECKLIST.md` via helper scripts.
- Save screenshots/JSONs under `artifacts/<task>/<YYYYMMDD>/`.

## Pro Reasoning Window — Next ~20 days (through 2025-12-04)
Owner-run checkpoints (you trigger; I prep inputs and verify results)
- 2025-11-15 to 2025-11-17 — Converter PR A (engine)
  - Deep Research: pdfminer.six vs pypdf trade-offs; layout heuristics references.
  - Pro Reasoning: risks in paragraph merge, heading inference, list/table detection, perf in Vercel budgets.
  - Artifacts: artifacts/agent-mode/20251117/ and artifacts/research/20251117/
- 2025-11-18 — Converter preview visual
  - Agent Mode Visual QA for /tools/text-converter/ (states: paste, file upload, preview, single-target vs multi-export hidden).
  - A11y/contrast/spacing checks; annotate screenshots.
- 2025-11-19 to 2025-11-22 — PR B (UI)
  - Pro Reasoning: single-target default + "+ add another format" edge cases; restore-state; keyboard traps.
  - Agent Mode sweep: /, /tools/, DLF, Sitemap Delta, Wayback Fixer, Converter.
- 2025-11-23 — Edge API guards
  - Deep Research: HSTS/TLD policies, robots semantics, retry/backoff norms.
  - Pro Reasoning: concurrency caps, jitter, timeouts, private/loopback denylist coverage.
- 2025-11-24 to 2025-11-27 — DLF/Sitemap/Wayback exports
  - Deep Research: 410 CSV correctness; rewrite rules; .xml.gz handling.
  - Pro Reasoning: CSV hardening vectors; state restore robustness.
- 2025-11-28 — Cost safety + observability
  - Pro Reasoning: log fields, request-id tracing, error classes; budget alerts.
  - Run `scripts/gcp_cost_guard.sh` (read-only) and capture outputs.
- 2025-11-29 to 2025-12-02 — Buffer & polish
  - Close remaining issues; targeted Agent Mode re-checks; update docs.
- 2025-12-03 to 2025-12-04 — Final sign-off
  - Run full Agent Mode pass; reconcile open issues; freeze for redesign phase.

How we coordinate
- I prepare payloads, URLs, acceptance criteria, and capture diffs; file follow-ups.
- You run Agent Mode / Deep Research / Pro Reasoning using docs/AGENT_ASSISTED_PROMPTS.md; drop outputs under artifacts/.
