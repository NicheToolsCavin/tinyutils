# Agent Run Log

## Sessions

### 2025-11-10 23:25 CET - Manual - roster-alignment
- **Account:** nichetoolscavin
- **Summary:**
  - Confirmed Gemini lanes healthy; unbenched `gemini-2.5-pro`.
  - Kept `code-teams-teacher` benched due to usage limits.
  - Roster file updated: `tinyutils/.code/agents/roster.json` (timestamp refreshed).


### 2025-11-10 13:15 CET - Manual - preview-smoke-bypass
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Preview:** https://tinyutils-jx8owl7l4-cavins-projects-7b0e00bb.vercel.app
- **Summary:**
  - Pulled fresh preview env vars with `vercel env pull`; only `PREVIEW_SECRET` and `PREVIEW_BYPASS_TOKEN` are available (no canned fence header).
  - Authenticated `curl` POST to `/api/convert` plus the updated `scripts/smoke_convert_preview.mjs` (multi-line fence header + `x-preview-secret`) still return HTTP 401 because the provided bypass token is rejected by Vercel Protection.
  - Stored unauth vs. attempted-auth headers/responses plus smoke logs for reference; need a working `x-vercel-protection-bypass` token or MCP-issued bypass cookie to proceed.
- **Artifacts:** tinyutils/artifacts/convert/20251110/smoke-preview-130940/

### 2025-11-10 18:45 CET - Manual - preview-smoke-convert
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Preview:** https://tinyutils-nlkdpr1l0-cavins-projects-7b0e00bb.vercel.app
- **Summary:**
  - Confirmed `/tools/convert` fence: 401 when unauthenticated, 200 after `/api/fence` cookie exchange or `x-vercel-protection-bypass` header.
  - Ran `scripts/smoke_convert_preview.mjs`; both cases returned HTTP 500 because the convert lambda cannot import `pydantic_core._pydantic_core` (see response logs). Pending backend fix.
- **Artifacts:** tinyutils/artifacts/convert/20251110/smoke-preview-124538/

### 2025-11-10 17:20 CET - Manual - vercel-runtime-validation
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Updated all Python functions in `vercel.json` to `python3.11` runtime; `npx vercel build --yes` still failed because CLI 48.8.2 rejects custom runtimes.
  - Removed per-function runtime fields and reran the build; local build completed (still warns about defaulting to Python 3.12).
- **Artifacts:**
  - Fail (python3.11 attempt): tinyutils/artifacts/convert/20251110/vercel-build-python311-20251110T110202Z/vercel_build.log
  - Pass (no runtime): tinyutils/artifacts/convert/20251110/vercel-build-noruntime-20251110T110225Z/vercel_build.log

### 2025-11-10 17:24 CET - Manual - vercel-deploy-prebuilt
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:** Attempted `npx vercel deploy --prebuilt --yes` with existing `.vercel/output`; upload exceeded the 100 MB file cap (~346 MB bundle) and Vercel aborted before issuing a preview URL.
- **Artifacts:** tinyutils/artifacts/convert/20251110/vercel-deploy-prebuilt-20251110T110446Z/vercel_deploy.log

### 2025-11-10 17:34 CET - Manual - vercel-size-triage
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Inspected `.vercel/output/functions` (convert bundle ~300 KB) and captured the measurements.
  - Updated `vercel.json` to exclude `api/_vendor/pandoc/**` entirely, rely on `pandoc_runner` runtime fallback, and raised convert `maxDuration` to 180s.
  - Rebuilt (`npx vercel build --yes`) and recorded `.vercel/output/*` sizes; despite lean functions/static (~1.6 MB), `vercel deploy --prebuilt --yes` still failed with the 100 MB limit (upload reported 334.9 MB), indicating upstream packaging includes additional assets.
- **Artifacts:**
  - tinyutils/artifacts/convert/20251110/vercel-inspect-20251110T110739Z/functions_du.txt
  - tinyutils/artifacts/convert/20251110/vercel-build-noruntime-20251110T110830Z/{vercel_build.log,output_sizes.txt}
  - tinyutils/artifacts/convert/20251110/vercel-deploy-prebuilt-20251110T110856Z/vercel_deploy.log

### 2025-11-10 17:42 CET - Manual - vercel-ignore-prebuilt
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Added `.vercelignore` to drop artifacts/.code/TinyBackups/tests/node_modules/api/_vendor, keeping `.vercel/output/**` intact.
  - Rebuilt (`npx vercel build --yes`); functions+static now ~1.6 MB, logs captured.
  - Re-attempted `vercel deploy --prebuilt --yes`; upload shrank to ~142.8 MB but still hit the 100 MB single-file limit, so no preview URL yet.
- **Artifacts:**
  - tinyutils/artifacts/convert/20251110/vercel-build-ignore-20251110T111210Z/{vercel_build.log,output_sizes.txt}
  - tinyutils/artifacts/convert/20251110/vercel-deploy-prebuilt-ignore-20251110T111239Z/vercel_deploy.log

### 2025-11-10 17:55 CET - Manual - vercel-prebuilt-success
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Dropped the extracted `api/_vendor/pandoc/pandoc` (143 MB) so only `pandoc.xz` ships; updated `.vercelignore` to target just the binary while leaving the archive for runtime fallback.
  - Rebuilt and redeployed prebuilt output; upload is now ~157 KB and preview deploy succeeded at https://tinyutils-nlkdpr1l0-cavins-projects-7b0e00bb.vercel.app (inspect link stored in log).
  - Convert preview smoke not executed: `scripts/smoke_convert_preview.mjs` requires `PREVIEW_SECRET`/`PREVIEW_FENCE_HEADER`, which aren’t available in this session; noted for follow-up.
- **Artifacts:**
  - tinyutils/artifacts/convert/20251110/vercel-build-ignore-20251110T111812Z/{vercel_build.log,output_sizes.txt}
  - tinyutils/artifacts/convert/20251110/vercel-deploy-prebuilt-ignore-20251110T111832Z/vercel_deploy.log
  - tinyutils/artifacts/convert/20251110/vercel-deploy-prebuilt-debug-20251110T111607Z/vercel_deploy.log (debug traces confirming prior 142 MB upload)

### 2025-11-10 17:05 CET - Manual - vercel-config+roster-maintenance
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Rebuilt `vercel.json` with top-level `headers`/`rewrites`, retaining CSP/HSTS caching and adding `/tools/(convert|find-replace)` fence rewrites + extension fallbacks.
  - Tightened serverless bundles (only `api/_vendor/pandoc/pandoc.xz`, excluded artifacts/.code/tests/.vercel) and set all Python APIs to `python3.12` runtime per guidance.
  - Benched `gemini-2.5-pro` in `.code/agents/roster.json` after repeated workspace misses.
  - Ran `npx vercel build --yes`; CLI 48.8.2 rejects `python3.12` runtimes (needs upstream support). Evidence captured.
- **Artifacts:** tinyutils/artifacts/convert/20251110/vercel-build-20251110T105712Z/vercel_build.log

### 2025-11-10 05:37 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-eoq623yjg-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T053627


### 2025-11-10 05:36 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T043627Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T043627Z

### 2025-11-10 05:34 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T053122


### 2025-11-10 05:31 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T043122Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T043122Z

### 2025-11-10 05:14 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-lt4gehkoc-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T051318


### 2025-11-10 05:13 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T041318Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T041318Z

### 2025-11-10 04:47 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-g16zaoswk-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T044617


### 2025-11-10 04:46 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T034617Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T034617Z

### 2025-11-10 04:40 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-9l53e41ej-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T043904


### 2025-11-10 04:39 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T033904Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T033904Z

### 2025-11-10 04:28 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-dz2xyerm4-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T042730


### 2025-11-10 04:27 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T032730Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T032730Z

### 2025-11-10 04:17 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-pt19dd5fb-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T041449


### 2025-11-10 04:17 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-mv4nr87w2-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T041639


### 2025-11-10 04:16 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T031639Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T031639Z

### 2025-11-10 04:15 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T041256


### 2025-11-10 04:14 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T031449Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T031449Z

### 2025-11-10 04:12 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T031256Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T031256Z

### 2025-11-10 04:02 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-j2scpavpr-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T040111


### 2025-11-10 04:01 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T030111Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T030111Z

### 2025-11-10 04:00 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T035759


### 2025-11-10 03:57 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T025759Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T025759Z

### 2025-11-10 03:56 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T035405


### 2025-11-10 03:54 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T025405Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T025405Z

### 2025-11-10 03:52 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T035045


### 2025-11-10 03:50 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T025045Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T025045Z

### 2025-11-10 03:40 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T033800


### 2025-11-10 03:38 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T023800Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T023800Z

### 2025-11-10 03:26 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-jc5qeq7fw-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T032501


### 2025-11-10 03:25 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T022501Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T022501Z

### 2025-11-10 03:21 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-7w3vske5n-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T032006


### 2025-11-10 03:20 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T022006Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T022006Z

### 2025-11-10 03:19 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-5wshtglq9-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T031807


### 2025-11-10 03:18 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T021807Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T021807Z

### 2025-11-10 03:14 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-hps1ckblv-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T031328


### 2025-11-10 03:13 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T021328Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T021328Z

### 2025-11-10 02:55 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-gpbvecyp4-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T025422


### 2025-11-10 02:54 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T015422Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T015422Z

### 2025-11-10 02:18 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-f3njjo9au-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T021702


### 2025-11-10 02:17 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T011702Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T011702Z

### 2025-11-10 02:09 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T020703


### 2025-11-10 02:07 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T010703Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T010703Z

### 2025-11-10 01:28 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T012642


### 2025-11-10 01:26 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T002642Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T002642Z

### 2025-11-10 01:17 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T011340


### 2025-11-10 01:13 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T001340Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T001340Z

### 2025-11-10 01:06 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251110/smoke-preview-20251110T010247


### 2025-11-10 01:02 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251110T000247Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251110T000247Z

### 2025-11-10 00:55 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251109/smoke-preview-20251110T005142


### 2025-11-10 00:51 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T235142Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T235142Z

### 2025-11-09 23:41 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251109/smoke-preview-20251109T233819


### 2025-11-09 23:38 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T223819Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T223819Z

### 2025-11-09 23:37 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251109/smoke-preview-20251109T233342


### 2025-11-09 23:33 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T223342Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T223342Z

### 2025-11-09 23:30 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T223037Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T223037Z

### 2025-11-09 23:30 CET - Manual - Add functions block (serverless Python)
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Add functions: api/convert, api/findreplace/{preview,apply} (python3.12, include tinyutils/**, maxDuration 60)
- **Evidence:** tinyutils/vercel.json
- **Follow-ups:**

### 2025-11-09 23:28 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T222830Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T222830Z

### 2025-11-09 23:28 CET - Manual - JSON config tidy
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Roster set active + Sonic watch; docs consolidated.
  - Added scripts: smoke:convert:preview
- **Evidence:** tinyutils/package.json

### 2025-11-09 23:25 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T222544Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T222544Z

### 2025-11-09 23:25 CET - Manual - Sync remote package/vercel configs
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Origin: https://github.com/NicheToolsCavin/tinyutils (branch: main)
  - Applied remote package.json and/or vercel.json

### 2025-11-09 23:25 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T222529Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T222529Z

### 2025-11-09 22:58 CET - Manual - Preflight Safe Point
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Tar archive: tinyutils-20251109T215826Z.tar.gz
  - HEAD: 8e3c836 2025-11-07 11:06:59 +0100 deploy: harden preview deploy/smoke and update ignores/docs
  - ## feature/universal-converter-backend
- **Evidence:** /Users/cav/dev/TinyBackups/safe_points/20251109T215826Z

### 2025-11-08 19:31 CET - manual - preview blob smoke
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - preview credentials missing; cannot rerun smoke
  - Need PREVIEW_URL + PREVIEW_FENCE_HEADER + BLOB_READ_WRITE_TOKEN to unblock
- **Evidence:** tinyutils/artifacts/convert/20251108/blob-ready/pytest_api_convert.log
- **Follow-ups:**
  - Awaiting preview fence header / token before rerunning scripts/smoke_convert_preview.mjs

### 2025-11-08 19:31 CET - manual - preview blob smoke
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - preview credentials missing; cannot rerun smoke
- **Evidence:** artifacts/convert/20251108/blob-ready/pytest_api_convert.log
- **Follow-ups:**
  - Need PREVIEW_URL + PREVIEW_FENCE_HEADER + BLOB_READ_WRITE_TOKEN

### 2025-11-08 21:05 CET - manual - pandoc vendoring + baseline rerun
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Added `tinyutils/scripts/vendor_pandoc.py` + `_vendor/.gitkeep`; script fetches pandoc 3.1.11.1 linux-amd64 on demand and installs it into `tinyutils/api/_vendor/pandoc/pandoc` with checksums.
  - Refactored `tinyutils/api/_lib/pandoc_runner.py` to prefer `PYPANDOC_PANDOC`, then the vendored binary, then PATH without runtime downloads; exposed helpers for logging.
  - FastAPI convert startup now logs pandoc availability, and docs (README + convert_api_contract + checklist) describe the new flow.
  - Re-ran narrow pytest slices (`tests/convert/test_service.py -k pandoc` and `tests/api/test_blob.py -k upload`); logs stored under `artifacts/convert/20251108/pandoc-fix/`.
- **Evidence:**
  - `tinyutils/scripts/vendor_pandoc.py`
  - `tinyutils/api/_lib/pandoc_runner.py`
  - `tinyutils/artifacts/convert/20251108/pandoc-fix/pytest_pandoc.log`
  - `tinyutils/artifacts/convert/20251108/pandoc-fix/pytest_blob.log`
- **Follow-ups:** Step remaining is to vendor the actual binary (run the script before preview deploy) and capture a preview smoke with the new startup log once preview fence credentials land.

### 2025-11-08 21:42 CET - manual - blob/token readiness pass
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Kept `tinyutils/api/_lib/blob.upload_bytes` behavior (token → Blob, missing token → `data:` URLs) and added DOC/Checklist references for `BLOB_READ_WRITE_TOKEN` + `VERCEL_BLOB_API_URL`.
  - Extended FastAPI tests so `_serialize_outputs` is exercised in both modes by patching `_upload_to_vercel_blob` (token present returns `https://blob.example/...`, token absent never calls it).
  - Added a new unit test that proves `upload_bytes` never reaches `requests.post` when the token is unset.
  - Installed `httpx` locally so `tests/convert/test_api_convert.py` executes instead of skipping, then reran the focused pytest slices with logs under `artifacts/convert/20251108/blob-ready/`.
- **Evidence:**
  - `tinyutils/artifacts/convert/20251108/blob-ready/pytest_blob_api.log`
  - `tinyutils/artifacts/convert/20251108/blob-ready/pytest_api_convert.log`
  - `tinyutils/docs/convert_api_contract.md` + `tinyutils/docs/AGENT_TASK_CHECKLIST.md`
- **Follow-ups:** Once preview creds arrive, rerun `scripts/smoke_convert_preview.mjs` with `BLOB_READ_WRITE_TOKEN` set and capture blob-backed URLs alongside data-url fallback evidence.

### 2025-11-08 20:05 CET - manual - converter baseline checks
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Invoked `pandoc_runner.ensure_pandoc()` directly; it failed immediately with `PandocError pypandoc not installed`, confirming no vendored binary in the FastAPI runtime.
  - Exercised `blob.upload_bytes` without `BLOB_READ_WRITE_TOKEN`; response fell back to a `data:` URI (`data:text/plain;base64,...`), proving Blob storage is still unwired.
  - Ran the narrowest pytest slices for converter pandoc cases and blob helpers (`pytest tests/convert/test_service.py -k pandoc`, `pytest tests/api/test_blob.py -k upload`); both pass locally but rely on mocked pandoc/blob behaviors, so they don't cover missing binary/token in preview.
  - Current blockers: (1) Vendored linux-amd64 pandoc binary absent, so preview lambdas bail immediately. (2) `BLOB_READ_WRITE_TOKEN` missing, so `/api/convert` still emits `data:` URLs instead of Vercel Blob links. (3) Preview fence header unavailable, so we cannot hit `/api/convert` via `smoke_convert_preview.mjs` yet.
  - Launched dedicated agents for vendoring strategy, Blob readiness plan, and pandoc fallback diff to unblock implementation once approvals land.
- **Evidence:**
  - `tinyutils/artifacts/convert/20251108/baseline/ensure_pandoc.log`
  - `tinyutils/artifacts/convert/20251108/baseline/blob_upload.log`
  - `tinyutils/artifacts/convert/20251108/baseline/pytest_pandoc.log`
  - `tinyutils/artifacts/convert/20251108/baseline/pytest_blob.log`
- **Follow-ups:** Vendor linux-amd64 pandoc under `_vendor`, add graceful fallback + health logs, wire Blob token configuration/tests, then rerun preview smoke once the preview fence header is available.

### 2025-11-08 18:27 CET - manual - preview secrets + smoke
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Collected preview tokens from .env.production/.env.preview, wrote merged .env.preview.local, and stored redacted snapshot+log under artifacts/convert/20251108/preview-secrets/.
  - Reran scripts/smoke_convert_preview.mjs with bypass headers; reached function (HTTP 500) and saved responses/logs in preview-secrets/.
- **Evidence:** artifacts/convert/20251108/preview-secrets/smoke.log
- **Follow-ups:**
  - Replace local BLOB_READ_WRITE_TOKEN placeholder with real Vercel blob token + link store to project.

### 2025-11-08 18:17 CET - manual - pandoc guard tests
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** repo-root
- **Summary:**
  - Ran pytest tests/convert/test_service.py -k pandoc after guard changes; pass (1 selected, 8 deselected).
- **Evidence:** artifacts/convert/20251108/patch/pytest.log
- **Follow-ups:**
  - Monitor additional converter cases once full suite reruns.

### 2025-11-08 18:09 CET - manual - convert triage
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Collected FastAPI reproduction logs plus Vercel CLI output for preview 500s; evidence under artifacts/convert/20251108/triage/.
  - Local smoke replay blocked by missing fence header (401), confirming need for PREVIEW_FENCE_HEADER to reach convert lambda.
- **Evidence:** artifacts/convert/20251108/triage
- **Follow-ups:**
  - Bundle or vend pypandoc/pandoc into the preview function (or add guard) so convert endpoint stops raising PandocError.
  - Obtain preview bypass headers so we can hit /api/convert and capture live Vercel logs.

### 2025-11-08 12:49 CET - manual - smoke_convert_preview
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Ran scripts/smoke_convert_preview.mjs against https://tinyutils-dond63lpw-cavins-projects-7b0e00bb.vercel.app using x-vercel-protection-bypass + preview cookie headers.
  - Both md/md+txt and md/html cases returned HTTP 500 FUNCTION_INVOCATION_FAILED; see resp_* and smoke.log for traces.
- **Evidence:** artifacts/convert/20251108/preview-smoke-20251108T123100/
- **Follow-ups:**
  - Investigate convert API failure on preview (Vercel logs) and rerun smoke once fixed.

### 2025-11-08 16:12 CET - manual - converter backend wrap-up
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** repo root
- **Summary:**
  - Finalized converter docs (checklist + docs/convert_api_contract.md) and Blob-backed response behaviors
  - Reran Python + Node suites with cache/Blob coverage; stored logs under `artifacts/convert/20251108/final/`
  - Preview smoke script skipped because `PREVIEW_URL`/`PREVIEW_SECRET` are unset (see log)
- **Evidence:**
  - `artifacts/convert/20251108/final/pytest.log`
  - `artifacts/convert/20251108/final/pnpm-test.log`
  - `artifacts/convert/20251108/final/smoke_convert_preview.log`
- **Follow-ups:** When preview credentials are available, rerun `scripts/smoke_convert_preview.mjs` to capture gated evidence.

### 2025-11-08 01:17 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-56o1r8z9h-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251108/smoke-preview-20251108T011632


### 2025-11-08 01:06 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-eosckdapa-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251108/smoke-preview-20251108T010544


### 2025-11-08 01:05 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-aij492neg-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251108/smoke-preview-20251108T010413


### 2025-11-08 01:01 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-7qe8pqyz8-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251108/smoke-preview-20251108T010018


### 2025-11-08 00:57 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-lro72or7z-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251108T005645


### 2025-11-08 00:54 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-134xn3n9j-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251108T005321


### 2025-11-08 00:52 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-usq9zb50x-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251108T005207


### 2025-11-08 00:51 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** https://tinyutils-rjxfy1slu-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251108T005020


### 2025-11-08 00:49 CET - manual - agent roster verification
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Reset `.code/agents/roster.json` so every listed agent is active (nothing benched)
  - Re-affirmed the 10-minute roster re-check cadence from AGENTS.md
- **Evidence:** tinyutils/.code/agents/roster.json
- **Follow-ups:** Re-run roster check by 2025-11-08 00:59 CET

### 2025-11-08 00:49 CET - Auto - deploy_and_smoke_convert
- **Status:** pending
- **Preview:** https://tinyutils-jsc6ur081-cavins-projects-7b0e00bb.vercel.app
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251108T004844


### 2025-11-07 23:39 CET - manual - strip vercel.app refs
- **Mode:** manual
- **Branch:** `feature/universal-converter-backend`
- **CWD:** tinyutils
- **Summary:**
  - Docs/tests/canonicals now use https://tinyutils.net and preview references use <preview-url> placeholders
  - Ad scripts tightened to treat only prod host as OK
  - Ran vercel_check.sh to confirm CLI auth
- **Evidence:** tinyutils/artifacts/convert/20251107/cred-check-20251107T233924/vercel_whoami.log
- **Follow-ups:**

### 2025-11-07 21:58 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T215756


### 2025-11-07 21:56 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T215546


### 2025-11-07 21:53 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T215236


### 2025-11-07 21:50 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T214954


### 2025-11-07 21:47 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T214615


### 2025-11-07 21:42 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T214204


### 2025-11-07 21:41 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T213921


### 2025-11-07 21:38 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T213811


### 2025-11-07 21:27 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T212720


### 2025-11-07 21:24 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T212410


### 2025-11-07 21:22 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T212203


### 2025-11-07 21:21 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T212110


### 2025-11-07 21:20 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T211959


### 2025-11-07 21:19 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T211909


### 2025-11-07 20:58 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T205734


### 2025-11-07 20:56 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T205316


### 2025-11-07 20:51 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T204817


### 2025-11-07 20:38 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T203721


### 2025-11-07 20:36 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T203547


### 2025-11-07 20:34 CET - Auto - deploy_and_smoke_convert
- **Status:** smoke_failed
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T203327


### 2025-11-07 20:33 CET - Auto - deploy_and_smoke_convert
- **Status:** pending
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T203224


### 2025-11-07 20:31 CET - Auto - deploy_and_smoke_convert
- **Status:** pending
- **Preview:** <preview-url>
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T203112


### 2025-11-07 20:30 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T202724


### 2025-11-07 20:26 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T202336


### 2025-11-07 20:21 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T201750


### 2025-11-07 13:21 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T131816


### 2025-11-07 12:49 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T124607


### 2025-11-07 12:06 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T120259


### 2025-11-07 11:53 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T114959


### 2025-11-07 11:24 CET - Auto - deploy_and_smoke_convert
- **Status:** vercel_deploy_failed
- **Preview:** n/a
- **Artifacts:** artifacts/convert/20251107/smoke-preview-20251107T112107


### 2025-11-08 12:00 CET - Manual - verify-no-vercel-app-urls
- **Status:** completed
- **Summary:** Swept repository for lingering .vercel.app references; none found in main codebase (only in agent logs which is expected)
- **Files touched:** none (verification only)
- **Follow-up:** Documentation already uses correct patterns (preview as auto URL, prod as https://tinyutils.net)
- 2025-11-11: Preview GREEN for convert
  - Preview: https://tinyutils-5mra8am1c-cavins-projects-7b0e00bb.vercel.app
  - Evidence:
    - /api/convert/health 200 JSON (pandoc 3.1.11.1, vendored path OK)
    - /api/convert POST 200 JSON (md→md/txt/html) with request fence (header+cookie) and x-preview-secret
    - Artifacts: artifacts/convert/20251111/smoke-preview-005854
  - Notes: Fixed ModuleNotFoundError by avoiding top-level `tinyutils` imports inside the serverless bundle. Switched to `api.*` imports and hardened alias routes to surface JSON errors in preview.
