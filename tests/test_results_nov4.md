# TinyUtils Production Verification — 2025-11-04

All tests executed after pushing `ed72123 (chore: align tinyutils-eight deployment)` to `origin/main`.

## Automated CLI Tests

| Timestamp (UTC) | Command | Result |
| --- | --- | --- |
| 2025-11-04 10:03 | `npm test` | Pass — 1 test suite (`DLF API responds with JSON error envelopes`) ✔ |

## HTTP Smoke via curl (2025-11-04 10:04–10:05 UTC)

### Pages
| URL | Status |
| --- | --- |
| https://tinyutils-eight.vercel.app/ | 200 |
| https://tinyutils-eight.vercel.app/tools/ | 200 |
| https://tinyutils-eight.vercel.app/tools/dead-link-finder/ | 200 |
| https://tinyutils-eight.vercel.app/tools/sitemap-delta/ | 200 |
| https://tinyutils-eight.vercel.app/tools/wayback-fixer/ | 200 |

### Edge APIs (POST)
| Endpoint | Payload Summary | Status | Notes |
| --- | --- | --- | --- |
| `/api/check` | `{ "pageUrl": "https://tinyutils-eight.vercel.app/tools/", "mode": "page" }` | 200 | `ok:true`, requestId `469c3e5d` |
| `/api/sitemap-delta` | Sitemap A = tinyutils-eight root; sitemap B adds facebook.com & wikipedia.org | 200 | `addedCount:1`, requestId `72bb4a8d` |
| `/api/wayback-fixer` | URLs: example.com, facebook.com, wikipedia.org | 200 | `totalChecked:1`, requestId `9dcd1b0f` |
| `/api/metafetch` | `example.com` | 200 | Title "Example Domain", requestId `73988cea` |

## Browser QA (Internal Headless Chrome)

Performed interactive sessions against production UI using external targets (Example, Facebook, Wikipedia).

- **Dead Link Finder** — pasted `example.com` + `wikipedia.org`; run completed, robots/status chips updated, results table populated.
- **Sitemap Delta** — compared tinyutils-eight sitemap vs Facebook/Wikipedia additions; summary chips updated (Removed:0, Added:2), exports enabled, request ID visible.
- **Wayback Fixer** — list (`example.com/old-page`, Facebook, Wikipedia) produced 3-result table; status displayed `3 checked · 0 archived · 0 no snapshot · SPN 0`, exports enabled, request ID `9dcd1b0f` echoed.

Screenshots available via internal browser history (not persisted to disk).

## Notes
- Deployment triggered automatically by Vercel upon pushing to `main`; requests executed ~90 seconds post-publish.
- A 400 response was observed earlier when omitting the required `mode` field on `/api/check`; rerunning with the correct payload returned 200 as recorded above.

