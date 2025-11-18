# Phase 2 Auto – Status Checkpoint

Phase 2 – Current status & next actions
- Track 1 – Progress UX: **Code complete & validated.**
  - Next: none; keep an eye on progress copy only if API shapes change.
- Track 2 – Downloads + MD→RTF: **Code complete; smoke run pending.**
  - Next: run `scripts/smoke_convert_preview.mjs` with `PREVIEW_URL` set and spot-check the MD→RTF `.rtf` artifact in TextEdit/Word.
- Track 3 – Ads + CMP: **Code complete; preview CLS/consent QA pending.**
  - Next: load `/`, `/tools/`, and the four core tools in a preview, verify CMP flow, that exactly one `.ad-slot` appears per page, and that toggling the hide-ads preference hides slots without harming UX.
- Track 4 – Light mode: **Tokens retuned; visual QA pending.**
  - Next: flip the theme on key pages and confirm contrast on cards, `.ad-slot`, and progress banners feels acceptable; if not, consider a temporary dark-only fallback in `scripts/theme-toggle.js`.
- Track 5 – Smokes + docs: **Smokes updated; needs preview run.**
  - Next: run `scripts/preview_smoke.mjs` (and the converter smoke) against a preview with bypass tokens to confirm ad/progress markers and MD→RTF coverage are green.

Branch
- Current feature branch: `feat/phase2-ads-light` (Phase 2 UX/ads/progress work in progress).

Tracks (high level)
- Track 1 – Progress UX: unify and improve "working" / progress states with `aria-live="polite"` across Dead Link Finder, Sitemap Delta, Wayback Fixer, and Converter.
- Track 2 – Downloads: harden CSV/JSON/RTF (and other) exports to use Blob-based HTTP downloads (no `data:` URLs), including MD→RTF, while preserving CSV injection guards.
- Track 3 – Ads + CMP: add a small, theme-aware ad slot to `/`, `/tools/`, and the 4 core tool pages, wired to Funding Choices/AdSense via `consent.js` and `adsense-monitor.js` so ads only show after consent.
- Track 4 – Light mode: retune `html[data-theme="light"]` tokens in `styles/site.css` for acceptable contrast; if tuning fails, fall back to forcing dark mode + hiding the toggle in a reversible way.
- Track 5 – Smokes + docs: extend `preview_smoke` / `smoke_convert_preview` (and any tool smokes) to cover MD→RTF, Blob downloads, and progress UX, and log all Phase 2 behavior changes via `AGENT_RUN_LOG.md`, `AGENT_TASK_CHECKLIST.md`, and `tool_desc_*`.

Current snapshot (2025-11-18)
- Track 1 – Progress UX: **Completed on `feat/phase2-ads-light`**.
  - Shared `.progress-banner` / `.progress-text` styles live in `styles/site.css`.
  - Dead Link Finder, Sitemap Delta, Wayback Fixer, and Converter all have consistent `role="status"` + `aria-live="polite"` progress areas.
  - Each tool uses a simple `isBusy` flag so global shortcuts (e.g., Cmd/Ctrl+Enter) do not fire while inputs are focused or work is in flight.
- Track 2 – Downloads + MD→RTF: **Code complete on `feat/phase2-ads-light`; smoke run pending PREVIEW_URL**.
  - Shared helper `scripts/download-utils.js` provides `window.tuDownloadBlob(...)` for Blob-based downloads.
  - Dead Link Finder, Sitemap Delta, and Wayback Fixer CSV/JSON/410 exports go through `tuDownloadBlob` (or a Blob+URL fallback) while preserving existing CSV injection guards.
  - Converter renders result-table downloads via `output.blobUrl || output.url` but now intercepts any remaining `data:` URLs with a `handleDataUrlDownload` helper that decodes them and delegates to `tuDownloadBlob`, so user-facing downloads are Blob-based even when the API returns data URLs.
  - `scripts/smoke_convert_preview.mjs` includes a dedicated `md_rtf` case that exercises the standalone RTF path and, when `PREVIEW_URL` is configured, writes a real `.rtf` artifact under `artifacts/converter-rtf-fix/<YYYYMMDD>/`.
- Track 3 – Ads + CMP: **Code complete on `feat/phase2-ads-light`; preview QA pending**.
  - A single unobtrusive, theme-aware ad slot (`.ad-slot`) has been added to `index.html`, `tools/index.html`, and the four core tool pages (Dead Link Finder, Sitemap Delta, Wayback Fixer, Converter), each wrapping one responsive AdSense unit.
  - `.ad-slot` is styled in `styles/site.css` using existing tokens (`--panel`, `--border`, `--text`) with a reserved min-height to reduce layout shift, and is hidden when `html.ads-hidden` is set via the `tu-ads-hidden` toggle handled by `scripts/consent.js`.
  - Slots rely on the existing Funding Choices CMP script and `scripts/adsense-monitor.js` to govern when AdSense actually initializes; each slot calls `adsbygoogle.push({})` inside a try/catch so ads only render when allowed.
  - Future smokes/manual QA should verify: (a) Funding Choices prompts/choices behave as expected; (b) exactly one `.ad-slot` appears per page and hides when the hide-ads preference is on; (c) ads, when present, do not introduce noticeable CLS or interfere with primary tool interactions in either theme.
- Track 4 – Light mode: **In progress**.
  - Light-theme tokens in `styles/site.css` have been retuned so `html[data-theme="light"]` uses a soft gray background (`--bg`), white panels (`--panel`), darker muted text (`--muted`), and clearer borders (`--border`), aiming for AA-ish contrast on cards, tool shells, `.ad-slot`, and progress banners while keeping the existing visual language. A future visual QA pass will decide whether this is sufficient or whether a dark-only fallback is needed.
- Track 5 – Smokes + docs: **Partially in place**.
  - Existing preview and converter smokes continue to run as before; `scripts/smoke_convert_preview.mjs` now includes an MD→RTF-specific case that writes `.rtf` artifacts under `artifacts/converter-rtf-fix/<YYYYMMDD>/` when `PREVIEW_URL` is configured.
  - `scripts/preview_smoke.mjs` has been lightly extended to check that core pages return 200 and still contain expected invariant markers (one `.ad-slot` on key pages, `.progress-banner` on Dead Link Finder and Sitemap Delta), while remaining tolerant of missing env tokens.
  - In this environment `PREVIEW_URL` is not set, so `preview_smoke.mjs` exits early with a clear error and `smoke_convert_preview.mjs` logs that it is skipping; code paths are ready, but a real preview run is still pending.
  - This file (`docs/PHASE2_AUTO_STATUS.md`) is now updated to reflect Track 1 completion, Track 2/3/4 progress, and Track 5 smoke coverage (including the current "no PREVIEW_URL" situation) so future sessions can resume without re-deriving context.

Key files touched so far in Phase 2
- `styles/site.css` – shared progress banner styles and theme tokens.
- `tools/dead-link-finder/index.html` – unified progress UX + Blob-based exports.
- `tools/sitemap-delta/index.html` – unified progress UX + Blob-based exports.
- `tools/wayback-fixer/index.html` – unified progress UX + Blob-based exports.
- `tools/text-converter/index.html` – unified progress UX; converter downloads now normalize any `data:` URLs through a Blob-based flow.
- `scripts/download-utils.js` – shared Blob download helper used by the tools.
- `scripts/smoke_convert_preview.mjs` – converter preview smoke, now with an `md_rtf` case that writes `.rtf` artifacts when PREVIEW_URL is set.
- `docs/PHASE2_AUTO_STATUS.md` – this status checkpoint file.

Note
- This file is an internal checkpoint for the Phase 2 Auto run so agents (and future sessions) can quickly see what has been done, what is in flight, and which artifacts/logs to inspect next.
