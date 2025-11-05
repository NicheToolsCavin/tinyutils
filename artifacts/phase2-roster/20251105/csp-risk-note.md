# CSP Risk Note — 2025-11-05 01:56 CET

## Findings
- Repository search (`rg '<iframe'`, `rg '<embed'`) shows no iframe or embed usage across `tools/` or `public/tools/`.
- `scripts/consent.js` injects Plausible analytics after consent, loading `https://plausible.io/js/script.js` on every tool page (e.g., `public/tools/dead-link-finder/index.html:17`, `public/tools/sitemap-delta/index.html:17`).
- Beta pages (`tools/meta-preview.html`, `tools/keyword-density.html`) and `tools/sitemap-delta/index.html` can load Google AdSense via `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` once localStorage flags allow ads.
- Ad flows may pull additional subresources such as `https://googleads.g.doubleclick.net` and `https://tpc.googlesyndication.com`; monitor production requests to extend allowlists as needed.
- Application code relies on inline scripts/styles (e.g., consent bootstrapping, ad slot configuration, tool logic) and on `fetch('/api/...')` calls that stay same-origin.

## Recommended CSP (strict but compatible baseline)
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://plausible.io https://pagead2.googlesyndication.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net;
font-src 'self' data:;
connect-src 'self' https://plausible.io;
frame-src https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com;
base-uri 'self';
form-action 'self';
object-src 'none';
```
Add nonces or hashes to drop `'unsafe-inline'` once inline analytics/ad bootstrap code is refactored.

## Compatibility Notes
- Preview fence relies on the `tu_preview_secret` cookie; no additional CSP allowances are required beyond same-origin.
- Plausible falls back to `navigator.sendBeacon` to `https://plausible.io/api/event`, so keep that host in `connect-src`.
- AdSense often chains to other domains (`googleads.g.doubleclick.net`, `adservice.google.com`, creative CDNs). Capture real traffic after enabling ads in production and widen the allowlist if responses are blocked.
- Every tool includes inline styles for layout tweaks; expect breakage if `'unsafe-inline'` is removed without a nonce/hashed alternative.

## Human Confirmation
- Replace placeholder AdSense publisher IDs (`ca-pub-REPLACE_ME`, `ca-pub-XXXXXXXXXXXXXXXX`) before launch and confirm policy compliance.
- Validate that consent UX plus CSP updates meet EU/non-personalized ad requirements for the beta shells.
- After deploying a tightened CSP, run a smoke against Plausible and AdSense flows to confirm no additional third-party endpoints need to be whitelisted.
