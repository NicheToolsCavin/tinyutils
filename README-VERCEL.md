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

## Consent / analytics / ads
- Plausible only loads after consent on **production** domains.
- Ads are disabled unless you manually run in devtools: `localStorage.setItem('ads','on')`.

## (Optional) Private subdomain
- In Vercel → Project → **Domains** → add `rc.tinyutils.net`.
- At your registrar, set **CNAME** for `rc` → `cname.vercel-dns.com`.