# Agent Temp State (safe to delete after green preview)

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
