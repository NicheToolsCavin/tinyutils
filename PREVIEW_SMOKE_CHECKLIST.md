# TinyUtils — Private Preview 7‑Step Smoke

Run these on your **Preview URL** (not public).

1) **Dead Link Finder (/):**
   - HSTS guard behaves; unsupported schemes skipped; robots‑unknown chip appears on fetch failure.
   - CSV/JSON contain meta (runTimestamp, mode, etc.).

2) **Sitemap Delta (/tools/sitemap-delta/):**
   - Two sitemaps ≤2k URLs → Added/Removed/Mapping sensible.
   - Confidence filters reflow counts; Same‑domain guard ON filters cross‑host; OFF shows them.
   - `.xml.gz` via sitemap index → either processed or labeled ".gz not supported here".
   - Exports: nginx/Apache rewrite blocks and 410 CSV sane (trailing slash, index.html, percent‑encoding).
   - Share‑link restore; malformed hash → defaults + toast.

3) **Wayback Fixer (/tools/wayback-fixer/):**
   - Demo list → chips (Archived / No snapshot / SPN queued / Errors) match filters; ISO timestamps present.
   - Window prefs (Any/5y/1y) persist into meta in CSV/JSON.
   - Verify HEAD ON → 200/OK for good snapshots; forced low timeout shows "Timed out".
   - SPN ON enqueues ≤10/run; notes show `no_snapshot|spn_queued`.
   - CSV headers exactly:
     - Replacements: `source_url,replacement_url,snapshot_date_iso,verify_status,note`
     - 410s: `url_to_remove,reason`
   - Guards block localhost, RFC1918, `file:`, `javascript:` (chips: Private host blocked / Unsupported scheme).

4) **A11y/Keyboard:**
   - Visible focus outlines; `aria-live` progress.
   - Shortcuts: Run ⌘/Ctrl+Enter, Filter F, Exports E/J.

5) **Cross‑browser:**
   - Safari (iOS/macOS), Firefox, Edge → sticky `<thead>`, overflow containment, share‑state restore, consent gating.

6) **Consent/analytics/ads:**
   - Consent banner visible; after accept, Plausible loads; ads only if manual `localStorage.setItem('ads','on')`.

7) **CSV Hardening:**
   - Open CSV in Excel/Sheets — cells beginning with `= + - @` are prefixed with `'` (no formula execution).

**Preview fence evidence (PR3)** — 2025-11-05 CET
- `node scripts/preview_smoke.mjs` PASS (see `tinyutils/artifacts/pr3-fence/20251105/smoke.txt`).
- `curl -I https://tinyutils-eight.vercel.app/tools/keyword-density` → 401 `preview_required` (stored in `keyword-density-401-*`).
- `curl -c cookies.txt "https://tinyutils-eight.vercel.app/api/fence?preview_secret=$PREVIEW_SECRET&target=/tools/keyword-density"` sets `tu_preview_secret`.
- `curl -b cookies.txt -I https://tinyutils-eight.vercel.app/tools/keyword-density` → 200 OK (stored in `keyword-density-200-*`).
