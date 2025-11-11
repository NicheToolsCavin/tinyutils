# TinyUtils — ChatGPT Conversation Log (2025-10-28)

Preview URL: <preview-url>
Repo: ~/dev/TinyUtils/tinyutils

This file captures the key Q&A, prompts, decisions, and steps from our session so you can pick up later without losing context.

## Summary
- Added tiny-reactive UI smoke scripts for Sitemap Delta and Wayback Fixer.
- Fixed minor front-end issues in both tools (CSV export, JSON export, file inputs, selectors).
- Verified Edge APIs on the Preview URL return JSON 200.

## Key Actions
- Added scripts:
  - scripts/ui_smoke_sitemap.mjs
  - scripts/ui_smoke_wayback.mjs
- Updated package.json scripts:
  - ui:smoke:sd -> node scripts/ui_smoke_sitemap.mjs
  - ui:smoke:wbf -> node scripts/ui_smoke_wayback.mjs
- Front-end fixes (minimal diffs):
  - public/tools/sitemap-delta/index.html
  - public/tools/wayback-fixer/index.html

## How to run the UI smokes
- Start tiny-reactive (local controller):
```
# If installed globally or via npx
npx tiny-reactive serve --host 127.0.0.1 --port 5566 --headless --debug
```
- Run against Preview URL (set `TINYUTILS_BASE=<preview-url>` before running):
```
TINYUTILS_BASE=<preview-url> node scripts/ui_smoke_sitemap.mjs
TINYUTILS_BASE=<preview-url> node scripts/ui_smoke_wayback.mjs
```
- Outputs:
  - .debug/sitemap-delta-ui.png
  - .debug/wayback-fixer-ui.png

## Edge API sanity (Preview)
- POST /api/sitemap-delta => 200 application/json
- POST /api/wayback-fixer => 200 application/json

## Conversation highlights (condensed)
- SSE2 is a CPU instruction set; cannot be installed via package manager. On x86-64 it is guaranteed.
- Building with SSE2 is safe on x86-64; beware of -march=native and alignment in intrinsics.
- For ChatGPT Pro usage, use it as an auditor and patch generator. Provide a Context Pack and ask for minimal unified diffs only.
- Provided a set of high-impact prompts for Pro (planning, audits, hardening, UI fixes, CSV hardening, docs sync, PR body).
- You requested focus on Sitemap Delta and Wayback Fixer. I added UI smokes and fixed small front-end issues.

## Copy-paste: Context Pack for Pro
```
Goal: Get Vercel Preview GREEN; pages and Edge APIs render per AGENTS.md.
Constraints: Minimal diffs; static + edge; no new deps; ESM only; no top-level await; vercel.json headers only.
Environment: Node 20.x. Output dir = root. Test via tiny-reactive.
Inputs: Include AGENTS.md File existence checklist and Hardening rules.
Artifacts: Paste trimmed file tree and any failing logs/screenshots.
```

## Copy-paste: High-impact prompts for Pro
- Kickoff Plan
```
Read AGENTS.md and this repo. Goal: Preview GREEN per the checklist. Produce a short ordered plan (5–9 steps), exact file paths to touch, top 5 risks, and 3 clarifying questions. Wait for my go before patching.
```
- File Existence + Config Audit
```
Using AGENTS.md File existence checklist, verify required pages and Edge APIs exist and follow ESM with export const config = { runtime: 'edge' }. Output a single minimal patch to add/fix missing or non-compliant files. No new deps.
```
- Edge API Hardening
```
Audit api/*.js against AGENTS.md Hardening rules: block private/loopback hosts, enforce timeouts with AbortSignal, one retry on 429/5xx with small jitter, global<=10 and per-origin<=2 concurrency with jitter, HSTS and TLD guards where applicable, CSV hardening for any CSV output, always content-type: application/json. Output one minimal patch implementing fixes (ESM only, no top-level await).
```
- Dead Link Finder UX Minimums
```
Audit public/tools/dead-link-finder/index.html for multi-URL input, URL normalization, sticky thead with .tableWrap, keyboard shortcuts that do not fire while typing, focus outlines. Output a minimal patch (HTML/inline JS only).
```
- Sitemap Delta UX + Exports
```
Audit public/tools/sitemap-delta/index.html for Added/Removed/Mapping sections, confidence filters updating counts, same-domain guard, .xml.gz via index handling or explicit '.gz not supported here', CSV exports for 301 and 410 with exact headers, share-state restore and malformed-hash reset. Output a minimal patch.
```
- Wayback Fixer Behavior
```
Audit public/tools/wayback-fixer/index.html and /api/wayback-fixer.js for window prefs Any/5y/1y in meta, verify(HEAD) option and timeout behavior, SPN queue <=10/run with notes no_snapshot|spn_queued, CSV headers exactly as specified, guards blocking localhost/RFC1918/file:/javascript:. Output a minimal patch.
```
- CSV Hardening Sweep
```
Scan all CSV exports client/server for spreadsheet injection. Prefix fields starting with = + - @ with a single quote. Output minimal diffs per file path.
```
- Docs Sync (tool_desc_*.md)
```
Append a Major changes entry to each tool_desc_*.md for the behavior changes in the patches. Use Europe/Madrid timestamp. Output only the appended sections inside a patch.
```
- PR Body
```
Generate a concise PR body summarizing changes, risks, and verification steps, plus the 'Preview GREEN' comment text with a checklist of pages/APIs and sample JSON snippets.
```

## Patch summary (paths)
- scripts/ui_smoke_sitemap.mjs
- scripts/ui_smoke_wayback.mjs
- package.json (added ui:smoke:sd and ui:smoke:wbf)
- public/tools/sitemap-delta/index.html (CSV/JSON export fixes, file input markup, rendering safeguard)
- public/tools/wayback-fixer/index.html (CSV imports/exports fixes, selectors, JSON export)

## Next steps
- Run the two new UI smokes and review screenshots.
- If anything fails, send the logs/screens to me and I will propose minimal diffs.
- Optional: open a branch and PR to trigger Vercel Preview with these changes; I can prepare a PR body and verification checklist.

---
Generated automatically to help you resume work later.
