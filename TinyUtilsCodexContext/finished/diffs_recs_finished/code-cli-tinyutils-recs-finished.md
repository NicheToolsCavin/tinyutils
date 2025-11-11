# TinyUtils QA Notes (2025-11-02)

## Overview
Manual smoke tests against https://tinyutils.net on 2025-11-02 surfaced several regressions. Dead Link Finder still returns data, Wayback Fixer’s UI fails to render results, Sitemap Delta + Redirect Mapper never surfaces compare output, and several advertised tools 404. Findings below capture what to fix next.

## Issues
1. **Wayback Fixer front-end dead.** Clicking “Find Wayback Replacements” leaves the status stuck on `Ready.` and no `fetch` fires; programmatic clicks show the same. Yet `POST /api/wayback-fixer` succeeds (returns `note: "network_error"` for test URLs). Likely JS errors (duplicate `protectCSVCell` helpers, malformed template literals) stop the handler from binding. Need to restore the event listener and ensure CSV/JSON exports only enable once results load.
2. **Sitemap Delta compare broken for URLs.** UI never changes from `Ready.` and the console shows no network call. Direct API POST with `sitemapAUrl`/`sitemapBUrl` returns HTTP 404, while raw XML text works. Client should surface the failure instead of silently idling, and the server must revive URL fetch support.
3. **Missing demo assets.** UI references `sample-data/dead-links-demo.csv` and sitemap sample XML files that now 404. Update the buttons to use the checked-in `tools/wayback-fixer/demo` files or restore the assets on Vercel.
4. **Sitemap Delta script bugs.** HTML duplicates `id="fileA"` inside both upload blocks and JS calls `filtered.unmapped` before `filtered` is declared, causing runtime errors. Clean up IDs and ensure `computeFiltered()` output is used when rendering tables/exports.
5. **Stale tool links.** `/tools/wayback-index`, `/tools/indexed-urls`, and `/tools/redirect-plan` all 404. Either redeploy those tools or remove them from the listing to avoid dead navigation.
6. **Global JS syntax regressions.** Multiple duplicate `protectCSVCell` definitions and broken expressions such as `protectCSVCell(JSON).stringify(...)` likely break bundling. Consolidate helper functions, lint, and rerun the build.

## Suggested Next Steps
- Restore working UI flows for Wayback Fixer and Sitemap Delta (buttons fire requests, status updates, errors surface politely).
- Fix the `/api/sitemap-delta` handler to honor URL-based comparisons again.
- Rehost or rewire demo/sample datasets so the “Try a demo” buttons work.
- Remove or ship the missing tool pages before publishing links.
- After script cleanup, run the project lint/test suite (e.g., `npm test` or `npm run lint`) to catch duplicate helper issues going forward.
