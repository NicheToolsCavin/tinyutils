### 2025-11-11 21:43 CET (UTC+0100) — DLF Quick Extras hardened (ci/preview-prod-green)
- Added preview_url input, resolve+gate step, unconditional artifact upload.
- scripts/smoke_dlf_extras.sh: bypass cookie + 200/JSON gating; artifacts saved.
- Workflow run: https://github.com/NicheToolsCavin/tinyutils/actions/runs/19278026559
- Result: PASS (green).

# Agent Run Log

Running log for agent-led work so freezes or mid-run swaps never erase context.

## How to Record Entries
- **Append-only:** Add new information at the top of the Sessions list (newest first).
- **Timezone:** Headings must use Europe/Madrid timestamps (e.g., `2025-11-04 14:15 CET`).
- **Granularity:** Log each meaningful task as soon as it finishes (single-agent or multi-agent), then add a session wrap-up when the run completes.
- **Metadata:** Capture run mode (auto/manual), branch, session id (if shown), and CWD when known.
- **Summary bullets:** Note what changed (files/commits), where artifacts live, remaining TODOs, and any deviations from the source plan.
- **Evidence:** Store supporting outputs under `artifacts/` and reference the folder.
- **Follow-ups:** Explicitly list remaining actions or write `None`.
- **Helper script:** Use `python scripts/log_run_entry.py --help` to append entries without manual editing.

## Sessions

### 2025-11-05 01:57 CET - Auto - Phase2 wrap
- **Mode:** auto
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Drafted CSP risk note for PR1 and saved to tinyutils/artifacts/phase2-roster/20251105/.
  - Re-confirmed PR1–PR4 evidence (no missing files) and captured backup tinyutils-backup-20251105T015659.zip.
- **Evidence:** tinyutils/artifacts/phase2-roster/20251105/, tinyutils/artifacts/audit/20251105/
- **Follow-ups:**

### 2025-11-05 01:47 CET - Auto - Phase2 roster/audit
- **Mode:** auto
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Generated phase2 roster snapshot and evidence audit artifacts (20251105).
  - Recorded empty run-log backfill patch for review.
- **Evidence:** tinyutils/artifacts/phase2-roster/20251105/, tinyutils/artifacts/audit/20251105/
- **Follow-ups:**

### 2025-11-05 01:33 CET - Manual - Docs + a11y refresh
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Updated README/DEPLOY/VERCEL/TESTING with PR1–PR4 flows and artifact pointers.
  - Added automation snippet in AGENTS.md and guarded keyboard shortcuts in sitemap-delta + wayback-fixer.
- **Evidence:** tinyutils/artifacts/docs-refresh/20251105/, tinyutils/artifacts/a11y/20251105/
- **Follow-ups:** None

### 2025-11-05 01:29 CET - Manual - PR4 tests
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Restored PR4 test suites
  - Logs under tinyutils/artifacts/pr4-tests/20251105/
- **Evidence:** tinyutils/artifacts/pr4-tests/20251105
- **Follow-ups:**

### 2025-11-05 00:49 CET - Manual - PR3 preview fence evidence
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Ran preview smoke (PASS) and captured 401→200 flow for /tools/keyword-density with tu_preview_secret cookie.
  - Artifacts: tinyutils/artifacts/pr3-fence/20251105/ (smoke.txt, keyword-density-401/200, fence headers, cookies).
- **Evidence:** tinyutils/artifacts/pr3-fence/20251105
- **Follow-ups:**

### 2025-11-05 00:14 CET - Manual - PR2 noindex + debug hook
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added <meta name="robots" content="noindex"> to keyword-density, meta-preview, and sitemap-generator heads.
  - Tagged DLF debug scheduler paragraph with data-testid; verification logs saved under tinyutils/artifacts/pr2-ux-noindex-debug/20251105/.
- **Evidence:** tinyutils/artifacts/pr2-ux-noindex-debug/20251105/
- **Follow-ups:**
  - Re-run UI smoke once remaining PR tasks complete.

### 2025-11-05 00:12 CET - Manual - PR1 CSP + caching
- **Mode:** manual
- **Branch:** `feat/pr3-preview-fence`
- **CWD:** /Users/cav/dev/TinyUtils/tinyutils
- **Summary:**
  - Added CSP header and /public cache rule to vercel.json; validated JSON structure.
  - Captured prod headers at https://tinyutils-eight.vercel.app for /, /public/styles.css, /api/check; stored under tinyutils/artifacts/pr1-security-cache/20251105/.
- **Evidence:** tinyutils/artifacts/pr1-security-cache/20251105/
- **Follow-ups:**

### 2025-11-04 13:47 CET - Auto - `feat/pr3-preview-fence`
- **Intent:** Apply `pr3-preview-fence.diff`, wire rewrites, deploy, capture fence evidence.
- **Result:** Added `api/fence.js`, updated `vercel.json` rewrites, refreshed README-VERCEL, pushed commit `022bd2f1ffa3...`.
- **Evidence:** Nothing archived yet (no curl headers or smoke logs captured post-commit).
- **Follow-ups:** Run `scripts/preview_smoke.mjs` with live `PREVIEW_SECRET`, stash curl headers + cookie proof under `artifacts/pr3-fence/`, document in README & this log.

### 2025-11-04 13:34 CET - Auto - `feat/pr1-security-cache`
- **Intent:** Land `pr1-security-caching.diff` (security headers + API cache-control).
- **Result:** Strengthened headers and `cache-control: no-store` for APIs; skipped CSP string and `/public/(.*)` cache rule from original diff. Commit `1ae7fdf5ef44...` pushed.
- **Follow-ups:** Reintroduce CSP + `/public/(.*)` cache headers, collect production curl evidence, link in `DEPLOY_PRODUCTION_CHECKLIST.md`.

### 2025-11-04 12:50 CET - Auto - `feat/pr3-preview-fence`
- **Intent:** Confirm preview fence deployment completion.
- **Result:** Session reported success but produced no new commits or evidence.
- **Follow-ups:** Covered by the 13:47 CET entry (still outstanding).

### 2025-11-04 12:38 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-38-29-7022c54b-64cd-4e58-92f2-52f17e752825.jsonl`
- **Summary:** Captured non-interactive shell flow for production deploy verification (`vercel pull`, `vercel deploy --prod`, curl headers into `artifacts/pr1-prod-*.txt`).
- **Follow-ups:** Run workflow once headers/CSP finalized to populate artifacts.

### 2025-11-04 12:29 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-29-05-befec95e-6959-4c1c-9713-8ff902acf316.jsonl`
- **Summary:** Proposed full header set for PR1 (HSTS, XFO, nosniff, strict referrer, permissions policy, CSP, API `no-store`/`X-Robots-Tag`).
- **Follow-ups:** Apply CSP + `/public` cache rule, validate via preview headers.

### 2025-11-04 12:06 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-05-48-576fe3d4-f7bd-4d4d-8476-d101681bc1ee.jsonl`
- **Summary:** Drafted deploy smoke checklist (curl probes for public pages, APIs, robots, sitemap, preview fence secret flow). Suggested env vars (`PROD`, `PREVIEW`, `PREVIEW_SECRET`).
- **Follow-ups:** Execute once preview fence + PR2/PR4 are in place; archive outputs.

### 2025-11-04 12:05 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-05-44-d4744ea5-bb4a-4351-9637-54cd32747c1d.jsonl`
- **Summary:** Catalogued touched paths for PR1-PR4 and recommended apply order (PR1 -> stacked PR3, parallel PR2 & PR4).
- **Follow-ups:** Execute outstanding PR2/PR4 diffs; watch for `vercel.json` merge overlap.

### 2025-11-04 12:05 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-05-40-19cc9758-0231-418a-b4de-2538f88b2949.jsonl`
- **Summary:** Acceptance matrix for each PR (headers inspection, fence 401/200 checks, PR2 noindex verification, PR4 `pnpm test`, post-deploy probes).
- **Follow-ups:** Use matrix as QA checklist once pending work lands.

### 2025-11-04 12:05 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T13-04-53-c6c7c3a2-95fe-4d93-bf27-0ff65f59599f.jsonl`
- **Summary:** Inventory of `package.json` scripts, absence of lockfiles, CI workflows, existing tests, and public static entrypoints.
- **Follow-ups:** None beyond acting on PR-specific tasks.

### 2025-11-04 12:00 CET - Auto - Planning Pass
- **Session:** `rollout-2025-11-04T13-00-27-035a4137-821f-4924-a5df-88752ac03d60.jsonl`
- **Summary:** Multi-agent planner mapped four-PR DAG, dependencies, smoke/test expectations, and shell setup for future tasks (see acceptance matrix entry for details).
- **Follow-ups:** Execute outstanding PR2/PR4 items; update docs as noted.

### 2025-11-04 08:42 CET - Auto - Compliance Sweep
- **Session:** `rollout-2025-11-04T09-42-32-d2d99936-2fbb-46bf-963c-5ba9b250971c.jsonl`
- **Summary:** Flagged keyboard shortcut collisions in `tools/sitemap-delta` & `tools/wayback-fixer`, missing `aria-live`, and sitemap politeness gaps.
- **Follow-ups:** Verify fixes once PR2/PR4 work lands; re-run UI smokes and capture evidence.

### 2025-11-04 05:55 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T05-54-59-1c5bc25e-ac5c-4653-83fb-5dd9da7168ee.jsonl`
- **Summary:** Blocked applying `api/metafetch.js` patch due to read-only sandbox; documented diff to add request-id + JSON headers.
- **Follow-ups:** Ensure PR1 branch incorporates request-id helper (already present in local implementation; double-check after CSP update).

### 2025-11-04 02:11 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T02-10-58-8ab922a8-7262-4741-b85b-257ba4745771.jsonl`
- **Summary:** Read-only sandbox prevented applying sitemap-delta timeout/maxCompare patch; included diff snippet for manual apply.
- **Follow-ups:** Verify current `api/sitemap-delta.js` matches intended behavior post-PR1 commit (timeout, maxCompare, truncation metadata).

### 2025-11-04 02:09 CET - Auto - Backfill
- **Session:** `rollout-2025-11-04T02-09-05-3289c90a-4213-46a4-9c0f-984b0525407a.jsonl`
- **Summary:** Initial read-only run captured minimal diff for `api/wayback-fixer.js` to add request-id handling.
- **Follow-ups:** Confirm PR1 commit includes these changes (current code does expose `cache-control` + request-id).

## Outstanding Roll-up (as of 2025-11-04 18:30 CET)
- Add `<meta name="robots" content="noindex">` to beta HTML shells and `data-testid="debug-scheduler"` to the DLF debug paragraph (PR2).
- Introduce CSP + `/public/(.*)` cache rule per original PR1 diff; capture curl evidence and store under `artifacts/pr1-security-cache-2025-11-04/`.
- Import `tests/api_contracts.test.mjs`, `tests/dlf_envelope_invariants.test.mjs`, `tests/csv_hardening.unit.test.mjs`; update `package.json` scripts and run `pnpm test` (PR4).
- Run preview smoke + fence evidence collection, archive results, and document in README/DEPLOY docs.
- Refresh `README.md`, `README_DEPLOY.md`, `DEPLOY_PRODUCTION_CHECKLIST.md`, `TESTING.md` with new verification steps and evidence pointers.
