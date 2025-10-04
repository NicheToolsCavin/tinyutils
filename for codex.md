**Goal**
Get a passing Vercel Preview build (NOT public). Pages: /, /tools/, /tools/sitemap-delta/, /tools/wayback-fixer/. Edge APIs: /api/check, /api/sitemap-delta, /api/wayback-fixer, /api/metafetch.

**Constraints**
- Branch + PR only. No DNS/public changes.
- Minimal diffs, no new deps (without approval), no secrets.
- vercel.json = headers only (remove any “functions” block).
- package.json must include { "type": "module" }.
- Edge handlers must be ESM:
  export const config = { runtime: 'edge' };
  export default async function handler(req) { … JSON Response … }
  No top-level await/return. No referencing `req` outside the handler.

**Todo checklist**
- [ ] Ensure files exist:
  - [ ] /index.html, /tools/index.html
  - [ ] /tools/sitemap-delta/index.html, /tools/wayback-fixer/index.html
  - [ ] /api/check.js, /api/sitemap-delta.js, /api/wayback-fixer.js, /api/metafetch.js
  - [ ] /public/favicon.ico, /public/og.png (<200 KB)
  - [ ] /robots.txt → references /sitemap.xml
  - [ ] /sitemap.xml lists /, /tools/, /tools/sitemap-delta/, /tools/wayback-fixer/
  - [ ] /vercel.json (headers only)
  - [ ] /package.json with "type":"module"
- [ ] Harden APIs: http(s) only, block private hosts, set timeouts, retry once on 429/5xx.
- [ ] Open PR “fix/preview-boot”; get Preview URL from Vercel bot comment.
- [ ] Smoke test on Preview (post results + screenshots):
  - [ ] DLF: HSTS guard, skip unsupported schemes, robots-unknown chip, CSV/JSON include meta.
  - [ ] Sitemap Delta: two ≤2k sitemaps → sensible Added/Removed/Mapping; confidence filters; same-domain guard; .xml.gz via index processed or labeled; rewrite exports + 410 CSV; share-state restore; bad hash resets w/ toast.
  - [ ] Wayback Fixer: demo shows Archived/No snapshot/SPN queued; ISO timestamps; Any/5y/1y in meta; Verify HEAD ON shows 200; low timeout → “Timed out”; SPN ON ≤10/run; CSV headers exact; guards block localhost/RFC1918/file:/javascript:.
  - [ ] A11y/keyboard: focus outlines, aria-live, ⌘/Ctrl+Enter runs, F filter, E/J exports.
  - [ ] Cross-browser: Safari/Firefox/Edge sticky thead, overflow, share-state, consent gating.
  - [ ] Consent/analytics/ads: banner; after accept Plausible loads; ads only if localStorage.setItem('ads','on').
  - [ ] CSV hardening: leading = + - @ prefixed with '.
- [ ] If green, comment “Preview GREEN; ready for owner approval.” If nits, list file:line and proposed diff.
