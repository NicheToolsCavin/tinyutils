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