# NOVEMBER 10-11 (LATE NIGHT)

# Agent Temp State

- Last intended preview (latest deploy log): use the newest URL from `artifacts/convert/*/vercel-deploy-*/vercel_deploy.log`.
- Smokes use Automation Bypass in both header and cookie + x-preview-secret.
- Current deps (Py3.12):
  - fastapi==0.111.0, starlette==0.37.2
  - pydantic==2.7.4, pydantic-core==2.18.4 (vendored for cp312 manylinux)
- Vendor helper: `python3 scripts/vendor_pydantic_core.py --version 2.18.4 --python 312`
- Convert now imports from `convert` (fallback to `tinyutils.convert`) to avoid package name issues in serverless.
- Health/convert return JSON errors in preview mode (with `errorType`/`errorMessage`) to accelerate diagnosis.

Next steps checklist:
- [ ] Deploy new preview and target that exact URL for curls/smoke.
- [ ] Verify `/api/convert/health` returns JSON (OK or degraded) instead of 500.
- [ ] Verify `/api/convert` returns 200 JSON envelope on a small md→md request.
- [ ] Append run log + checklist entries with the new URL and artifacts path.

Snapshot (safe after compact)
- Latest preview (as of now): https://tinyutils-5mra8am1c-cavins-projects-7b0e00bb.vercel.app
- Last smoke artifacts: artifacts/convert/20251111/smoke-preview-005854
- Bypass token source: VERCEL_AUTOMATION_BYPASS_SECRET (fallback: PREVIEW_BYPASS_TOKEN or BYPASS_TOKEN)
- PREVIEW_SECRET: in .env.preview.local (refresh with `vercel env pull .env.preview.local --environment preview` if rotated)
- Vendored native core: api/_vendor/pydantic_core/_pydantic_core.cpython-312-x86_64-linux-gnu.so
- Smoke invocation always sets both header and cookie for x-vercel-protection-bypass and includes x-preview-secret.
- 

  

```fish

• Context Checkpoint: TinyUtils Preview Smoke

   - Current Progress
     ·  Preview fence + tokens
       -  Uses Automation Bypass token for both header and cookie on every request.
       -  PREVIEW_SECRET loaded and passed as x-preview-secret.
       -  Quick curls saved: docs/QUICK_PREVIEW_SMOKE.md.
     ·  Smoke script hardened
       -  scripts/smoke_convert_preview.mjs now:
         ⋅  Accepts multi-line PREVIEW_FENCE_HEADER; injects x-preview-secret.
         ⋅  Auto-falls back to env tokens (VERCEL_AUTOMATION_BYPASS_SECRET → PREVIEW_BYPASS_TOKEN → BYPASS_TOKEN).
         ·  API routing and handlers
       -  Added FastAPI aliases so /api/convert and /api/convert/health reach the app.
       -  vercel.json rewrites restored for convert paths (api/convert/index.py), avoiding 404s.
       -  convert(app) import updated to prefer from convert import … (fallback to tinyutils.convert) to avoid “No
         module named 'tinyutils'” in serverless.
         ·  Native dependency (Pydantic v2)
       -  Vendored pydantic-core cp312 manylinux under api/_vendor/pydantic_core/ and inserted api/_vendor on sys.path
         before imports.
       -  Added scripts/vendor_pydantic_core.py (supports --version and --python 312).
     ·  Pandoc runtime
       -  api/_lib/pandoc_runner.py ships pandoc.xz; ensure_pandoc() called at request start to set PYPANDOC_PANDOC.
     ·  Diagnostics
       -  Health and convert return JSON errorType/errorMessage on failures (preview) to accelerate triage.
     ·  Evidence and docs
       -  Artifacts captured under artifacts/convert/<YYYYMMDD>/smoke-preview-<timestamp>/ for each deploy.
       -  Snapshot file for safe compaction: .debug/AGENT_TMP_STATE.md (latest preview URL, last smoke path, token
         source, vendor status, next steps).

   - Key Decisions
     ·  Stay on Pydantic v2 (with vendored pydantic-core) instead of long v1 refactor.
     ·  Prefer Automation Bypass token for fence header + cookie (project-level, stable).
     ·  Route convert paths to the ASGI entry (api/convert/index.py) via rewrites to avoid path mismatches.
     ·  Return structured JSON on preview errors for faster diagnosis.

  - Important Context and Preferences
     ·  User wants bold, explicit “REQUIRED (local)” instructions when needed.
     ·  Both Gemini lanes enabled; Teacher benched. Roster recorded at tinyutils/.code/agents/roster.json.
     ·  Tokens and secrets reside in git-ignored env files (.env.preview.local; .vercel/.env.preview.local).
     ·  Use the latest Preview URL from the most recent vercel_deploy.log by mtime, not older logs.

   - Current State (last snapshot)
     ·  Latest preview: tinyutils-jxrma878p-cavins-projects-7b0e00bb.vercel.app
     ·  Last smoke artifacts: artifacts/convert/20251111/smoke-preview-012131
     ·  Bypass token source: VERCEL_AUTOMATION_BYPASS_SECRET
     ·  Vendored native core: api/_vendor/pydantic_core/_pydantic_core.cpython-312-x86_64-linux-gnu.so
     ·  Requirements (Py3.12 aligned attempt):
       -  fastapi==0.111.0, starlette==0.37.2
       -  pydantic==2.7.4, pydantic-core==2.18.4 (vendored)
     ·  Behavior: Health 200 with vendored pandoc; convert 200 JSON (md→md/txt/html). Root cause was import path relying on top-level `tinyutils`; fixed by using `api.*` imports in serverless bundle and avoiding `tinyutils.*` fallbacks.

   - What Remains (next steps)
     1) Fresh deploy + target exact latest Preview URL (avoid stale URLs).
     2) Run quick curls (in order):
        -  Set cookie: curl -i
          "$PREVIEW_URL/api/convert?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$TOKEN" -c cookies.txt
        -  Health: curl -i -b cookies.txt "$PREVIEW_URL/api/convert/health"
        -  Convert: curl -i -b cookies.txt -H "x-preview-secret: $PREVIEW_SECRET" -H "content-type: application/json"
          -d
          '{"inputs":[{"blobUrl":"data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==","name":"hello.md"}],"from":"markdow
          n","to":["md"]}' "$PREVIEW_URL/api/convert"
 3) Run scripts/smoke_convert_preview.mjs with PREVIEW_FENCE_HEADER containing both: x-vercel-protection-bypass:
   <token> and Cookie: vercel-protection-bypass=<token>.
     4) If 500 persists, open the latest health.json/convert.json in the new smoke artifacts; use errorType/
   errorMessage to guide:
        -  If pandoc missing: verify api/_vendor/pandoc/pandoc.xz included (vercel.json includeFiles) and
          ensure_pandoc() returns a path; consider logging runner.get_configured_pandoc_path() in preview.
        -  If dependency startup error (FastAPI/Starlette/Pydantic mismatch): iterate pins; known working sets on
          Py3.12 include (fastapi 0.111.x, starlette 0.37.x, pydantic 2.7.x) or (fastapi 0.112.x with matching
          starlette and pydantic 2.8.x). Keep pydantic-core vendored to matching version (use vendor script).
        -  If import path issue resurfaces: confirm convert/** is included (vercel.json includeFiles) and convert
          import fallback remains.
     5) Once health returns OK/degraded and convert returns 200 JSON, rerun the smoke.
     6) Append results (preview URL, 401→200 fence evidence, smoke outcome, artifact paths) to:
        -  docs/AGENT_RUN_LOG.md
        -  docs/AGENT_TASK_CHECKLIST.md (Plan Updates).

   - Critical References
     ·  Health/convert app: api/convert/app.py
     ·  Rewrites + includes: vercel.json
     ·  Vendored core: api/_vendor/pydantic_core/
     ·  Pandoc vendor: api/_vendor/pandoc/pandoc.xz
     ·  Vendor helper: scripts/vendor_pydantic_core.py
     ·  Smoke script: scripts/smoke_convert_preview.mjs
     ·  Quick curls: docs/QUICK_PREVIEW_SMOKE.md
     ·  Snapshot for compaction: .debug/AGENT_TMP_STATE.md
     ·  Env secrets: .env.preview.local, .vercel/.env.preview.local

   - Acceptance Criteria
     ·  Fence verified (401 unauth → 200 with bypass header/cookie).
     ·  /api/convert/health returns JSON (status ok/degraded).
     ·  /api/convert POST returns 200 with a proper conversion envelope for minimal md→md.
     ·  Smoke script passes both cases; artifacts stored and logs updated.
     
  

```



At some point, my directory was overwritten by a copy of the root directory.



To clarify: The root of the repo was /Users/cav/dev/TinyUtils/tinyutils
the ../dev/TinyUtils folder held the repo root along with other support documents. now they are gone.

The ../TinyUtils/tinyutils/tinyutils folder was not my creation, and I don't know why the redundant name existed. But it held important things nonetheless. 

Then you told me to push it, so I did. Now the github has lost files, and the Vercel doesn't work (verified at Nov 11, 14:34)

# NOVEMBER 11 (AFTERNOON)

### Status checkpoint — 2025-11-11 12:15 CET (UTC+01:00)

- Repo location and backups
  - Project root kept at: `~/dev/TinyUtils/tinyutils` (no further relocations will be performed).
  - Snapshots taken to `~/dev/TinyBackups/` before high‑impact steps, latest: `~/dev/TinyBackups/tinyutils-20251111T105136`.

- Preview hardening (convert)
  - Smoke script updated to curl‑first for Vercel bypass cookie; artifacts always written:
    - `tinyutils/scripts/smoke_convert_preview.mjs` (writes `set_cookie.headers`, `cookies.txt`, `resp_*.json`).
  - Vendor checksum script added:
    - `tinyutils/scripts/verify_vendors.py` (SHA256 for `api/_vendor/pandoc/pandoc.xz` and `api/_vendor/pydantic_core/**`).
  - Root GitHub Actions workflow created so CI can see it (Actions only scans repo root):
    - `.github/workflows/preview_smoke.yml` — deploys preview, runs convert smoke, uploads artifacts, fails on non‑200.
  - Branch + PR for CI: `convert-preview-ci` → PR #24 (Convert Preview Smoke).

- CI state (as of this checkpoint)
  - Convert Preview Smoke initially failed due to missing pnpm on runner. Workflow updated to use `npm ci` + `npx vercel` (no pnpm dependency).
  - An unrelated job (DLF Quick Extras) in the repo is failing on a jq parse error; it is not part of convert preview. Left untouched.
  - Required repository secrets for a fully unattended run (names only):
    - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_SECRET`.
    - Local preview env confirms `PREVIEW_SECRET` and `VERCEL_AUTOMATION_BYPASS_SECRET` exist under `tinyutils/.vercel/.env.preview.local`.

- Production probe
  - Production deploy executed from local CLI to verify path: production URL observed in deploy logs.
  - Prod health/convert returned `401` (Vercel protection). Next step is a bypassed prod smoke (set cookie via Automation Bypass token, then run health/convert) and save evidence under `tinyutils/artifacts/prod/<date>/`.

- Files added/modified in this session (convert scope only)
  - Added: `.github/workflows/preview_smoke.yml` (root)
  - Added: `tinyutils/scripts/smoke_convert_preview.mjs`
  - Added: `tinyutils/scripts/verify_vendors.py`
  - No directory moves will be performed going forward.

### Links and evidence

- PR (preview smoke CI): https://github.com/NicheToolsCavin/tinyutils/pull/24
- Latest local preview success (prior verification): `tinyutils/artifacts/convert/20251111/smoke-preview-005854/`
- Latest prod deploy artifacts (in progress): `tinyutils/artifacts/prod/20251111/deploy-110940/`

### What remains to GREEN + PROD (autonomous plan)

1) Rerun/verify Convert Preview Smoke CI on PR #24 after workflow fix (npm + npx vercel). If secrets are missing, run smoke locally and attach artifacts to PR while leaving CI ready for later.
2) Run a bypassed production smoke:
   - `curl -D prod_set_cookie.headers "$PROD_URL/api/convert?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$TOKEN" -c prod_cookies.txt -o prod_set_cookie.html`
   - `curl -b prod_cookies.txt -D prod_health.headers "$PROD_URL/api/convert/health" -o prod_health.json`
   - `curl -b prod_cookies.txt -D prod_convert.headers -H 'content-type: application/json' -H "x-preview-secret: $PREVIEW_SECRET" -d '{…}' "$PROD_URL/api/convert" -o prod_convert.json`
3) If convert fails anywhere, read `errorType`/`errorMessage` in JSON payload and apply a surgical fix inside `tinyutils/`; push and re‑run.
4) After green preview + green bypassed prod smoke, record:
   - Production URL, evidence paths (`tinyutils/artifacts/prod/<date>/`).
   - Snapshot this section again and note any follow‑ups.

### Notes on repository layout and backups

- The working, supported root remains `~/dev/TinyUtils/tinyutils`. Backups in `~/dev/TinyBackups/` are taken before changes.
- If any discrepancy is detected between current tree and the latest “good” backup, only missing files will be restored from backup (no destructive overwrite).

### Secrets mapping (names only; values not stored here)

- Preview (local): `tinyutils/.vercel/.env.preview.local` contains `PREVIEW_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET`, and optional `PREVIEW_BYPASS_TOKEN`.
- GitHub Actions (repository secrets needed): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_SECRET`.
  - `VERCEL_ORG_ID` equals `team_mZMjmINNZDVD3LhduKQwyJnn`.
  - `VERCEL_PROJECT_ID` is read from `tinyutils/.vercel/project.json` (do not guess).

### Owner hand‑off

- I will continue to: (a) keep backups, (b) keep changes surgical, (c) not relocate directories, and (d) push preview/prod smoke evidence.
- If the owner wants DLF/other jobs greened, I can address those after convert is green + prod verified.



## /COMPACT COMMAND SUMMARY

 CONTEXT CHECKPOINT HANDOFF

   Current Progress and Key Decisions
   - Convert API is green in preview locally: health returns 200 JSON; convert returns 200 for md→md/txt/html when bypass header+cookie and x-preview-secret are used.
   - Pydantic v2 retained; pydantic-core vendored for Py3.12; pandoc.xz vendored and unpacked at runtime to /tmp.
   - Import paths hardened in serverless: use api._lib.* to avoid reliance on top-level tinyutils in Vercel bundles.
   - Smoke script hardened: curl-first cookie bootstrap implemented; artifacts include set_cookie.headers, cookies.txt, resp_*.json.
   - Vendor integrity script added to print SHA256 for api/_vendor/pandoc/pandoc.xz and api/_vendor/pydantic_core/**.
   - Root-level CI workflow added (required by GitHub Actions): .github/workflows/preview_smoke.yml — deploy preview, run smoke, upload artifacts, fail on non-200.
   - PR opened to run CI: convert-preview-ci → PR #24. Workflow refactored to use npm + npx vercel (no pnpm dependency).

   Important Context and Preferences
   - Repo root stays at ~/dev/TinyUtils/tinyutils. User prefers no relocations; take a backup before impactful steps to ~/dev/TinyBackups/.
   - Secrets policy:
     ·  Local preview env: tinyutils/.vercel/.env.preview.local has PREVIEW_SECRET and VERCEL_AUTOMATION_BYPASS_SECRET.
     ·  GitHub Actions requires repository secrets: VERCEL_TOKEN, VERCEL_ORG_ID (team_mZMjmINNZDVD3LhduKQwyJnn), VERCEL_PROJECT_ID (from tinyutils/.vercel/project.json),
       VERCEL_AUTOMATION_BYPASS_SECRET, PREVIEW_SECRET.
   - Vercel protection: Preview/prod require bypass token. Smoke must set _vercel_jwt via query param + cookie jar and include x-preview-secret.
   - Keep changes surgical; no directory moves; capture artifacts for every run.

   What Remains (Clear Next Steps)
   1) CI Preview Smoke
      ·  Ensure GH secrets exist (names above). If missing, CI will fail at env pull or deploy.
      ·  Rerun “Convert Preview Smoke” on PR #24; inspect artifacts if red.
      ·  If failures persist, patch tinyutils/ surgically and re-run until green.

   2) Production Smoke (Bypass)
      ·  Use VERCEL_AUTOMATION_BYPASS_SECRET to set cookie for PROD_URL.
      ·  Run:
        -  GET $PROD_URL/api/convert/health (save headers/body)
        -  POST $PROD_URL/api/convert (md→md/txt/html) with x-preview-secret (if used for prod), save headers/body.
      ·  Store artifacts in tinyutils/artifacts/prod/<YYYYMMDD>/deploy-<HHMMSS>/.
        -  Document and Handoff
          ·  Update tinyutils/.debug/AGENT_TMP_STATE.md with production URL and artifact paths.
          ·  Optionally add a minimal “prod smoke” workflow for manual verification.
      
         Critical Data and References
         - Preview URL (latest recorded): see tinyutils/.debug/AGENT_TMP_STATE.md and artifacts/convert/20251111/smoke-preview-005854.
         - Production deploy log and URL (latest): tinyutils/artifacts/prod/20251111/deploy-110940/vercel_deploy_prod.log; extract “Production: https://…vercel.app”.
         - Key files:
           ·  API: tinyutils/api/convert/app.py; tinyutils/vercel.json
           ·  Converter: tinyutils/convert/service.py; pandoc runner: tinyutils/api/_lib/pandoc_runner.py
           ·  Smoke: tinyutils/scripts/smoke_convert_preview.mjs (curl-first cookie path)
           ·  Vendor check: tinyutils/scripts/verify_vendors.py
           ·  CI workflow: .github/workflows/preview_smoke.yml
           ·  Status: tinyutils/.debug/AGENT_TMP_STATE.md
         - Example curl (prod bypass):
           ·  curl -D prod_set_cookie.headers "$PROD_URL/api/convert?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$TOKEN" -c prod_cookies.txt -o prod_set_cookie.html
           ·  curl -b prod_cookies.txt -D prod_health.headers "$PROD_URL/api/convert/health" -o prod_health.json
           ·  curl -b prod_cookies.txt -D prod_convert.headers -H "content-type: application/json" -H "x-preview-secret: $PREVIEW_SECRET" -d
             '{"inputs":[{"blobUrl":"data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==","name":"hello.md"}],"from":"markdown","to":["md","txt","html"]}' "$PROD_URL/api/convert" -o prod_convert.json
      
         Notes
         - There is an unrelated CI job “DLF Quick Extras” failing (jq parse). Ignore unless requested.
         - Always snapshot before changes: rsync -a --delete ~/dev/TinyUtils/tinyutils/ ~/dev/TinyBackups/tinyutils-<timestamp>/.

### Recovery checkpoint — 2025-11-11 (local)

- Restored missing Convert assets from backup (no relocations):
  - Source archive: /Users/cav/dev/TinyBackups/tinyutils-20251111T000545Z.tar.gz
  - Restored into repo root `tinyutils/`:
    • api/convert/** (index.py, app.py, etc.)
    • api/_vendor/pandoc/pandoc.xz
    • api/_vendor/pydantic_core/**
    • scripts/smoke_convert_preview.mjs
  - Verification: both `pandoc.xz` and `pydantic_core` present; `api/convert/app.py` readable.

- Rationale: these paths were missing in the live tree after the accidental overwrite (see earlier note). The backup from 2025‑11‑11T00:05:45Z contained exactly the expected layout and binaries.

- What I did NOT do:
  - No directory moves or deletes; only additive restore of missing files.
  - No deploys, no env changes, no edits to vercel.json.

- Next steps (unchanged, now unblocked):
  1) Fresh Preview deploy to obtain an exact Preview URL.
  2) Run `scripts/smoke_convert_preview.mjs` with PREVIEW_URL + fence headers (uses VERCEL_AUTOMATION_BYPASS_SECRET and x-preview-secret).
  3) If red, open new `artifacts/convert/<date>/preview-smoke-*/resp_*.json` and triage via errorType/errorMessage.
  4) Append the new Preview URL and artifact path here and in docs/AGENT_RUN_LOG.md.

 Here’s the concise status after reading the state file and scanning the repo.

   What I Found
   - Nested repo exists at tinyutils/.git; your working tree root is tinyutils/.
   - Convert API and its vendors were missing under tinyutils/api/ (root cause of preview failure).
   - Root-level scripts/smoke_convert_preview.mjs was also missing (CI pointed to it).

   What I Restored
   - From backup /Users/cav/dev/TinyBackups/tinyutils-20251111T000545Z.tar.gz into tinyutils/:
     ·  api/convert/** (includes app.py, index.py)
     ·  api/_vendor/pandoc/pandoc.xz
     ·  api/_vendor/pydantic_core/**
     ·  scripts/smoke_convert_preview.mjs
   - Verified present: pandoc.xz, pydantic_core, api/convert/app.py.
   - Logged the recovery in tinyutils/.debug/AGENT_TMP_STATE.md (Recovery checkpoint).

   Git
   - Committed in nested repo tinyutils on branch convert-preview-ci (no push).
     ·  Message: restore(convert): recover api/convert + vendors from backup; add smoke script; append recovery checkpoint.

   Next Actions (quick)
   - Deploy a fresh Preview to get the exact URL.
   - Run scripts/smoke_convert_preview.mjs with:
     ·  PREVIEW_URL, PREVIEW_SECRET, and VERCEL_AUTOMATION_BYPASS_SECRET.
     ·  It will set the bypass cookie, hit /api/convert/health, and run md→md/txt/html conversions, saving artifacts.
   - If it fails, read errorType/errorMessage in the saved resp_*.json and iterate.

   Want me to:
   1) Kick off a fresh Preview deploy and run the smoke locally, or
   2) Re-run the GitHub “Convert Preview Smoke” workflow on PR #24 and inspect its artifacts?
