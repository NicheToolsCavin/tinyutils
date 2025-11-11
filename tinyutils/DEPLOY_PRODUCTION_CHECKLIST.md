# TinyUtils — Production Deploy Checklist

Proceed only after the Preview 7‑Step Smoke is **GREEN**.

## Attach domain in Vercel
1. Project → **Domains** → **Add** `tinyutils.net` and `www.tinyutils.net`.
2. At registrar:
   - Apex `tinyutils.net` → **A** record to `76.76.21.21` (Vercel edge).
   - `www` → **CNAME** to `cname.vercel-dns.com`.
3. Wait for **HTTPS** certs (automatic).

## Final hygiene
- `robots.txt` references `/sitemap.xml`.
- OG/Twitter card renders (paste your URLs into any card checker).
- Consent banner shows; analytics loads only after accept.
- Ads remain manual toggle unless you explicitly enable them later.

## Rollback
Vercel → **Deployments** → click the last GREEN preview → **Promote to Production** or revert in one click.

## PR1: Security Headers & Caching Evidence (CET 2025-11-04)

- Treat `https://tinyutils.net` as the production domain until the custom apex is attached.
- Archived headers live in `tinyutils/artifacts/pr1-security-cache/20251104/`:
  - `prod-vercel-root-20251104T231729+0100.headers`
  - `prod-vercel-public-20251104T231729+0100.headers`
  - `prod-vercel-api-20251104T231730+0100.headers`
- Expected values:
  - Root: `Content-Security-Policy` present alongside existing security headers.
  - `/public/styles.css`: `Cache-Control: public, max-age=600`.
  - `/api/check`: `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- Once a custom domain is wired up, rerun the same curl checks and stash the headers under the new date-stamped folder, then update this section.
