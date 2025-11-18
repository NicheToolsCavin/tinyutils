# Phase 2 – PR Notes for `feat/phase2-ads-light`

Branch
- `feat/phase2-ads-light`

Scope
- Phase 2 UX/behavior improvements across the four core tools (Dead Link Finder, Sitemap Delta, Wayback Fixer, Converter) and the main shells:
  - Track 1 – Progress UX
  - Track 2 – Downloads + MD→RTF
  - Track 3 – Ads + CMP
  - Track 4 – Light mode tokens
  - Track 5 – Smokes + docs

## Track 1 – Progress / "Working" UX

What changed
- Added shared progress styling in `styles/site.css`:
  - `.progress-banner` and `.progress-text` for a consistent status block and meter.
- Wired all four tools to use accessible status areas:
  - Dead Link Finder, Sitemap Delta, Wayback Fixer, and Converter now expose `role="status"` + `aria-live="polite"` regions that show "ready", "working", timeouts, and completion.
- Added `isBusy` flags and shortcut guards per tool so global shortcuts (e.g., Cmd/Ctrl+Enter) do not fire while a run is in flight or while a text field is focused.

Impact
- Users see consistent progress messages and a small meter during long crawls/conversions.
- Keyboard shortcuts are safer for screen-reader/keyboard users and no longer trigger while typing.

## Track 2 – Downloads + MD→RTF

What changed
- Introduced `scripts/download-utils.js` with `window.tuDownloadBlob({ filename, mimeType, content })` as the shared Blob download helper.
- Normalized exports for the crawl tools:
  - Dead Link Finder, Sitemap Delta, and Wayback Fixer CSV/JSON/410 exports now use `tuDownloadBlob` (or a Blob+URL fallback) while preserving existing CSV injection guards.
- Hardened converter downloads:
  - Converter still renders downloads from `output.blobUrl || output.url`, but now intercepts any `data:` URLs with a `handleDataUrlDownload` helper that decodes them and funnels them through `tuDownloadBlob` (or a local Blob fallback).
- Extended converter smokes:
  - `scripts/smoke_convert_preview.mjs` adds an `md_rtf` case that posts a small Markdown demo with `to:['rtf']` and, when `PREVIEW_URL` is set, writes both `resp_md_rtf.json` and a real `.rtf` file under `artifacts/converter-rtf-fix/<YYYYMMDD>/`.

Impact
- All user-facing CSV/JSON/410 exports are Blob-based (no data: URLs), matching the security posture of the CSV hardening.
- Converter downloads behave consistently even when the API returns `data:` URLs; users still just click "Download".
- MD→RTF correctness is exercised by a smoke that produces an artifact suitable for TextEdit/Word spot-checks.

## Track 3 – Ads + CMP

What changed
- Added a single `.ad-slot` per key page:
  - `index.html`, `tools/index.html`, and the four core tools (DLF, Sitemap Delta, Wayback Fixer, Converter) each get one ad unit placed below the hero/intro and above the main controls.
- Styled slots in `styles/site.css`:
  - `.ad-slot` uses the existing tokens (`--panel`, `--border`, `--text`, `--radius`) and a modest `min-height` to reserve space and reduce CLS.
  - `html.ads-hidden .ad-slot { display:none !important; }` hides all slots when the local `tu-ads-hidden` preference is on.
- Kept CMP/AdSense wiring aligned with Phase 3:
  - Funding Choices CMP script and AdSense loader (`client=ca-pub-3079281180008443`) are already present on these pages.
  - `scripts/consent.js` continues to manage the `tu-ads-hidden` toggle and `html.ads-hidden`.
  - `scripts/adsense-monitor.js` watches for AdSense init and shows a soft anti-adblock toast only when `window.adsbygoogle` never appears.
- Documented behavior in `ADSENSE_SETUP.md`:
  - Lists exact `.ad-slot` placements, interaction with CMP/consent, and what future smokes/manual QA should verify (CMP flow, hide-ads, CLS, themes).

Impact
- Ads become a small, theme-aware frame under the hero instead of ad-hoc placements, with a single unit per page.
- Users who toggle "hide ad UI" no longer see ad frames, while AdSense behavior and CMP consent remain governed by Google.

## Track 4 – Light mode tokens

What changed
- Retuned the light-theme CSS variables in `styles/site.css`:
  - `html[data-theme="light"]` now uses:
    - `--bg:#f3f4f6` (soft gray canvas),
    - `--panel:#ffffff` (white cards),
    - `--muted:#4b5563` (darker muted text),
    - `--text:#111827` (near-black body text),
    - `--border:#d1d5db` (clearer card/table borders),
    - existing brand/focus colors.
- No per-component overrides; all pages (home, tools, DLF, Sitemap, Wayback, Converter) inherit these tokens for cards, `.ad-slot`, progress banners, and tables.

Impact
- Light mode now looks more intentional and readable, closer to the dark theme’s design language instead of a simple inversion.
- Contrast on cards/tool shells/`.ad-slot`/progress banners should be closer to AA levels, pending a final visual QA pass.

## Track 5 – Smokes + docs

What changed
- Preview smoke:
  - `scripts/preview_smoke.mjs` still uses Vercel automation-bypass headers/cookies, but now also checks that:
    - Core pages return HTTP 200.
    - Key pages contain invariant markers:
      - `.ad-slot` on `/`, `/tools/`, and the core tool shells.
      - `.progress-banner` on Dead Link Finder and Sitemap Delta.
- Converter smoke:
  - `scripts/smoke_convert_preview.mjs` includes the `md_rtf` case described under Track 2 and no-ops safely when `PREVIEW_URL` is not set.
- Documentation:
  - `docs/PHASE2_AUTO_STATUS.md` tracks per-track status + next actions.
  - `docs/AGENT_TASK_CHECKLIST.md` and `docs/AGENT_RUN_LOG.md` contain entries for each Phase 2 track and Workstream A (preview smokes).

Impact
- Smokes now lightly cover the new Phase 2 surfaces (progress, Blob downloads, ads, MD→RTF) without becoming brittle.
- Future agents can see exactly what has been implemented and what remains to validate via preview.

## Remaining verification before merge

These are the last steps to validate on a real preview before merging `feat/phase2-ads-light`:
- Configure `PREVIEW_URL` and bypass envs for this branch’s Vercel preview and run:
  - `node scripts/preview_smoke.mjs`
  - `node scripts/smoke_convert_preview.mjs`
  to confirm page/API status, `.ad-slot`/`.progress-banner` markers, and MD→RTF artifacts.
- Do a quick visual QA pass in a browser (dark and light themes) on `/`, `/tools/`, and the four tools to check:
  - CMP flow and ad behavior (one slot per page, minimal CLS, hide-ads toggle working).
  - Light-mode contrast on cards, `.ad-slot`, and progress banners.
- If light mode still feels off after QA, consider a temporary dark-only fallback in `scripts/theme-toggle.js` and log it as a separate, reversible change.

