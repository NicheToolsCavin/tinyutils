# TinyUtils — Dead Link Finder (Release 1.0)

**Deploy quickstart (Vercel)**
1. Create a new Vercel project and import this folder.
2. Ensure the default framework is "Other" (static) and keep the root as `/`.
3. API routes live under `/api` and run on **Edge Runtime** (no env needed).
4. Build command: _none_. Output directory: `/`.
5. After deploy, test `/api/check` with a single-URL run.

**Notes**
- robots.txt is honored by default; per-origin concurrency ≤2; global cap 10; 200 URLs/run.
- HTTPS→HTTP fallback is in Advanced (OFF) and guarded by TLD + HSTS.
- Exports include meta & redirect chain; sticky header CSS is in `public/styles.css`.
- Security headers & caching are enforced via `vercel.json` (CSP plus `/public/(.*)` cache-control). Keep evidence under `tinyutils/artifacts/pr1-security-cache/<date>/`.
- Beta HTML shells stay private: each includes `<meta name="robots" content="noindex">`; rerun `rg 'robots" content="noindex' tools` after changes.
- Preview fence requires `PREVIEW_SECRET` (and optional `BYPASS_TOKEN`). Capture smoke + 401→200 artifacts in `tinyutils/artifacts/pr3-fence/<date>/`.
- CI-less regression coverage: run `pnpm install --silent && pnpm test` and file the log at `tinyutils/artifacts/pr4-tests/<date>/`.
