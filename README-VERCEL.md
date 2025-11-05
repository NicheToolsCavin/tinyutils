# TinyUtils — Private Preview on Vercel (RC3)

This guide gets a private preview online so you can run the 7‑step smoke before any public launch.

## Option A — Import from GitHub (recommended)
1. Create a **new GitHub repo** (e.g., `tinyutils`).
2. Unzip this archive locally and push all files (include the **`/api`** folder at the project root).
3. In **Vercel** → **Add New… → Project** → Import your GitHub repo.
4. **Framework Preset:** `Other`
5. **Build Command:** *leave blank*
6. **Output Directory:** `/` (project root)
7. Click **Deploy**. Vercel gives you a **Preview URL** like `https://tinyutils-xxxx.vercel.app`.

## Option B — Upload the ZIP directly
1. In Vercel → **Add New… → Project** → **Import Third‑Party Git Repository** → **Upload** → choose this ZIP.
2. Keep **Framework:** `Other`, **Build:** none, **Output:** `/`.
3. Deploy → get the **Preview URL**.

## What to verify right away
- `/api/check` responds to POST (Dead Link Finder)
- `/api/sitemap-delta` responds to POST
- `/api/wayback-fixer` responds to POST
- Page routes open: `/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`

## Preview fence for beta tools
- In Vercel → **Settings → Environment Variables**, set `PREVIEW_SECRET` (same value across preview/prod as needed).
- Beta utilities (`/tools/keyword-density`, `/tools/meta-preview`, `/tools/sitemap-generator`) now require the secret.
  - Access once with `?preview_secret=<your secret>` or header `x-preview-secret: <secret>`; a short-lived `tu_preview_secret` cookie keeps the session.
  - Public GA tools (Dead Link Finder, Sitemap Delta, Wayback Fixer) stay open.
- Evidence lives under `tinyutils/artifacts/pr3-fence/<YYYYMMDD>/` (smoke.txt, 401/200 curl captures).
- Quick verification (CET timestamps):
  1. `curl -I https://tinyutils-eight.vercel.app/tools/keyword-density` → `401 preview_required`
  2. `curl -c cookies.txt "https://tinyutils-eight.vercel.app/api/fence?preview_secret=$PREVIEW_SECRET&target=/tools/keyword-density"`
  3. `curl -b cookies.txt -I https://tinyutils-eight.vercel.app/tools/keyword-density` → `200 OK`

## Release validation rundown (PR1–PR4)

- **PR1 — Security headers & caching**
  - `vercel.json` injects a sitewide CSP plus `/public/(.*)` cache-control. After deploy run:
    ```bash
    export TZ=Europe/Madrid; TODAY=$(date +%Y%m%d); ART=tinyutils/artifacts/pr1-security-cache/$TODAY; mkdir -p "$ART"
    for path in / "/public/styles.css" /api/check; do \
      slug=$(printf '%s' "$path" | tr '/:' '-') \
      slug=${slug:-root} \
      curl -sS -D "$ART/headers${slug}.txt" -o /dev/null "https://tinyutils-eight.vercel.app${path}"; \
    done
    ```
  - Expect `content-security-policy` + HSTS on `/`, cache-control on `/public`, and JSON security headers on `/api/check`.
- **PR2 — Noindex + debug hook**
  - Beta shells ship with `<meta name="robots" content="noindex">`; confirm via `rg 'robots" content="noindex' tools/`.
  - Dead Link Finder debug paragraph uses `data-testid="debug-scheduler"` for smoke tooling. Evidence snapshots: `tinyutils/artifacts/pr2-ux-noindex-debug/<date>/`.
- **PR3 — Preview fence**
  - Run the smoke + manual curl captures above; archive under `tinyutils/artifacts/pr3-fence/<date>/`.
- **PR4 — Regression tests**
  - Run `pnpm install --silent && pnpm test` (Node ≥20). Attach logs to `tinyutils/artifacts/pr4-tests/<date>/` and reference them in the deploy checklist.

## Consent / analytics / ads
- Plausible only loads after consent on **production** domains.
- Ads are disabled unless you manually run in devtools: `localStorage.setItem('ads','on')`.

## (Optional) Private subdomain
- In Vercel → Project → **Domains** → add `rc.tinyutils.net`.
- At your registrar, set **CNAME** for `rc` → `cname.vercel-dns.com`.
