# USER_CHECKLIST.md

High‑level tasks the human owner must do in external dashboards (Vercel, Google, etc.).
Agents must NOT add items here for things they can fix themselves via code changes, CLI tools, or this repo's scripts.

Only add an item when:
- The change requires clicking through a third‑party web UI (Vercel, Google Cloud, AdSense, etc.), AND
- It cannot realistically be done from this repo's shell or via the configured automation.

---

## 1. Vercel project configuration (TinyUtils)

- [ ] **Switch TinyUtils project to SvelteKit build once ready**
  - In the Vercel dashboard for the `tinyutils` project:
    - Set **Framework Preset** to **SvelteKit** instead of "Other".
    - Set **Build Command** to `pnpm build` (or `npm run build` if you prefer a script wrapper).
    - Ensure the output is the default SvelteKit `.vercel/output` (do not override Output Directory).
  - Goal: have both preview and production use the SvelteKit app under `src/` + `static/`, instead of the legacy static `index.html`/`tools/*.html` snapshot.
  - Timing: do this only after you are happy with the SvelteKit versions of `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`, and `/tools/text-converter/`.

- [ ] **Retire any legacy static shells that conflict with SvelteKit routes**
  - After the SvelteKit build is the source of truth, clean up conflicting static entries via the Vercel UI / project settings if needed:
    - Verify that `/tools/*` routes are served by SvelteKit, not by old `tools/*.html` files.
  - This may involve adjusting how Vercel treats the project (e.g., rebuilding from repo rather than a previously imported static zip) and confirming no old deployment is still aliased as prod.

## 2. Vercel deployment protection / SSO

- [ ] **Confirm your desired preview protection flow**
  - Decide whether `tinyutils-*.vercel.app` previews should:
    - Require SSO / login (current behavior for the bare project URL), or
    - Be accessible to automation+you via the configured `VERCEL_AUTOMATION_BYPASS_SECRET` only.
  - Adjust settings in the Vercel dashboard accordingly so that:
    - The **branch preview URLs** used in smoke tests remain usable via bypass tokens.
    - Any human‑only preview URLs you care about are still reachable after auth.

## 3. Google AdSense / Funding Choices CMP

- [ ] **Complete AdSense approval + Funding Choices setup**
  - In the AdSense / Google Funding Choices dashboards:
    - Finish whatever approval steps are still pending for `tinyutils.net`.
    - Ensure Funding Choices CMP is correctly configured and associated with the `ca-pub-3079281180008443` property.
  - The code already expects Funding Choices to own consent; once you are approved, verify:
    - The CMP banner appears where expected.
    - Ads only run when consent has been granted.

## 4. Google Cloud Run (PDF renderer)

- [ ] **Monitor and adjust Cloud Run PDF service as needed**
  - In the Google Cloud console for `PDF_RENDERER_URL`:
    - Keep an eye on usage and costs.
    - Adjust autoscaling / max instances if volumes change.
  - The repo is already wired for this; ongoing cost/usage decisions are yours.

## 5. Workstream 2: Bulk Replace API

- [ ] Fix `/api/bulk-replace` on current Vercel preview
  - Preview URL: https://tinyutils-e2en8enzf-cavins-projects-7b0e00bb.vercel.app
  - Problem: Bulk Replace API smoke (`scripts/smoke_bulk_replace_preview.mjs`) receives an HTML/auth response (401 text/html) from `/api/bulk-replace` instead of the expected 200 JSON `{ ok: true, data: { stats, diffs } }`.
  - Actions:
    - In Vercel, verify preview protection and bypass settings for this project/branch.
    - Ensure `VERCEL_AUTOMATION_BYPASS_SECRET` / `PREVIEW_BYPASS_TOKEN` / `BYPASS_TOKEN` and `PREVIEW_SECRET` are valid for this preview.
    - Confirm that the Python `api/bulk-replace.py` function is deployed and reachable on previews (not gated behind additional auth).
    - Once fixed, rerun `node scripts/smoke_bulk_replace_preview.mjs` with `PREVIEW_URL` set to this URL until it reports `envBlocked: false` and `ok: true`.
  - Additional note (2025-12-04): On the Santa Phase 6 preview for branch `feat/converter-test-coverage-100pct`, `/api/bulk-replace` at `https://tinyutils-c2z1p3co8-cavins-projects-7b0e00bb.vercel.app/api/bulk-replace` currently returns a Vercel-level 307 redirect loop with `content-type: text/plain` and body `Redirecting...`, repeatedly setting `_vercel_jwt` and never reaching the Python handler; diagnostic artifacts are stored under `artifacts/api/bulk-find-replace/20251204/`. Bulk Replace API smokes remain environment-blocked until this redirect loop is resolved in the Vercel configuration.
