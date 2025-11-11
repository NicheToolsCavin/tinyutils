# Agent Task Checklist

Shared tracker so agents can see which work items are planned, in progress, or finished - and how plans have evolved.

## How to Use
- **Append-only:** Add new tasks to the top of the relevant table (newest first).
- **Always timestamp:** Record Europe/Madrid (CET) timestamps for new entries and status changes.
- **Reference the source:** Link each task to the session ID / plan entry that created it (e.g., `rollout-2025-11-04T16-26-36-...`).
- **Update status promptly:** When a task is completed, move it to the Completed section with evidence pointers. If a task becomes obsolete, mark it as "Superseded" with the reason.
- **Plan changes:** Log scope or approach changes under Plan Updates and cross-reference the affected task.
- **Helper script:** Use `python scripts/add_task_checklist_entry.py --help` to insert rows and plan updates quickly.

## Active Tasks (Newest First)

| Task | Source (Session / Date) | Status | Notes / Evidence / Plan Changes |
| --- | --- | --- | --- |
| *(none — converted tasks moved to Completed)* |  |  |  |
| Converter artifacts & evidence path setup | manual-2025-11-06T23-55 | Completed | Smoke evidence captured at `tinyutils/artifacts/convert/20251107/smoke-local-20251107T034352/` and logged in AGENT_RUN_LOG (2025-11-07 03:46 CET). |
<!-- NOTE: This file is a task tracker only. Authoritative instructions live in AGENTS.md. -->
| Task | Source (Session / Date) | Status | Notes / Evidence / Plan Changes |
| PR4 test suites | manual-2025-11-05T01-29 | Completed | Artifacts: tinyutils/artifacts/pr4-tests/20251105/ |
| PR3 preview fence evidence | manual-2025-11-05T00-49 | Completed | Preview smoke PASS; 401→200 curl captures and cookies stored in tinyutils/artifacts/pr3-fence/20251105/. |
| PR2 noindex + debug hook | manual-2025-11-05T00-14 | Completed | Meta shells now carry noindex meta; DLF debug paragraph has data-testid. Evidence: tinyutils/artifacts/pr2-ux-noindex-debug/20251105/. |
| Add CSP + /public/(.*) cache rule | manual-2025-11-05T00-12 | Completed | vercel.json updated with CSP + /public cache; prod headers archived in tinyutils/artifacts/pr1-security-cache/20251105/ |
| --- | --- | --- | --- |
| Add `<meta name="robots" content="noindex">` to beta HTML shells and `data-testid="debug-scheduler"` in DLF debug paragraph (PR2) | `rollout-2025-11-04T16-26-36-da356561-8be5-4818-8e6c-7eab8f79a99a` (2025-11-04 15:29 CET) | Completed | Superseded by manual-2025-11-05T00-14 entry; evidence in tinyutils/artifacts/pr2-ux-noindex-debug/20251105/. |
| Add CSP + `/public/(.*)` cache rule, then capture production header evidence for PR1 | `rollout-2025-11-04T13-38-25-603afdb2-7fa0-4f61-8351-5e235d315571` & `rollout-2025-11-04T13-29-05-befec95e-6959-4c1c-9713-8ff902acf316` (2025-11-04 12:29-12:38 CET) | Completed | Superseded by manual-2025-11-05T00-12 entry; evidence in tinyutils/artifacts/pr1-security-cache/20251105/. |
| Import PR4 Node test suites and wire `pnpm test` | `rollout-2025-11-04T16-26-36-da356561-8be5-4818-8e6c-7eab8f79a99a` (2025-11-04 15:29 CET) | Completed | manual-2025-11-05T01-29 entry; tests restored and logs captured under tinyutils/artifacts/pr4-tests/20251105/. |
| Preview fence evidence + smoke (include docs) | `rollout-2025-11-04T16-48-41-fcfb6382-8881-4b3a-8ec3-5371fb8d6322` & outstanding plan (2025-11-04 16:26 CET) | Completed | Superseded by manual-2025-11-05T00-49 entry; docs + evidence in tinyutils/artifacts/pr3-fence/20251105/. |
| Documentation refresh to align with new tooling (README, README_DEPLOY, TESTING, DEPLOY_PRODUCTION_CHECKLIST) | `rollout-2025-11-04T16-26-36-da356561-8be5-4818-8e6c-7eab8f79a99a` (2025-11-04 15:29 CET) | Completed | manual-2025-11-05T01-33 entry; docs refreshed with PR1–PR4 workflows. Evidence: tinyutils/artifacts/docs-refresh/20251105/. |
| Keyboard shortcut & a11y compliance fixes in Sitemap Delta / Wayback Fixer | `rollout-2025-11-04T09-42-32-d2d99936-2fbb-46bf-963c-5ba9b250971c` (2025-11-04 08:42 CET) | Completed | Guarded shortcuts from firing while typing; audit logged under tinyutils/artifacts/a11y/20251105/audit.md. |

## Completed Tasks

| Task | Completed On (CET) | Notes / Evidence |
| --- | --- | --- |
| FastAPI / blob wiring for converter responses (schema, headers, media zip) | 2025-11-08 16:05 CET | Envelope + Blob uploads finalized; see docs/convert_api_contract.md and artifacts/convert/20251108/final/pnpm-test.log. |
| Converter library caching + media packaging | 2025-11-08 16:05 CET | `tinyutils/convert/service.py` cache now reusable per-input; media zips + logs covered. Evidence: artifacts/convert/20251108/final/pytest.log. |
| Converter unit/API tests & fixtures | 2025-11-08 16:05 CET | `tests/convert/*` + `tests/api/test_blob.py` cover cache hits, partial errors, Blob fallback. Evidence: artifacts/convert/20251108/final/*.log. |
| Move repo auto-backups to `~/dev/TinyBackups` (script defaults, docs, launchd logs) | 2025-11-07 01:35 CET | Evidence: `artifacts/backup-relocation/20251107/`; launchctl bootout/bootstrap/kickstart (macOS Tahoe syntax) applied for backup + restic agents. |

## Plan Updates
- 2025-11-11 01:59 CET - Preview smoke green for convert API (manual curls). Fixed serverless import paths by avoiding top-level `tinyutils.*` in the function bundle; switched to `api.*` and guarded fallbacks. Hardened FastAPI aliases to surface JSON error payloads in preview. Smoke script still needs JWT cookie bootstrap; update pending.
- 2025-11-10 13:15 CET - Preview smoke still blocked: refreshed preview env via `vercel env pull`, but the published `PREVIEW_BYPASS_TOKEN` no longer satisfies Vercel Protection (all `/tools/convert` + `/api/convert` calls return 401). Need a current bypass token/cookie before rerunning smoke.
- 2025-11-10 18:45 CET - Preview smoke attempted (https://tinyutils-nlkdpr1l0-cavins-projects-7b0e00bb.vercel.app); fence OK but convert lambda fails with `ModuleNotFoundError: pydantic_core._pydantic_core`. Evidence: artifacts/convert/20251110/smoke-preview-124538/.
- 2025-11-10 17:20 CET - Runtime validation: python3.11 build still blocked by CLI; keeping runtimes unset until tooling supports them.
- 2025-11-10 17:55 CET - Removed extracted `api/_vendor/pandoc/pandoc`, leaving the `.xz` archive for runtime unpack; prebuilt deploy now succeeds (preview https://tinyutils-nlkdpr1l0-cavins-projects-7b0e00bb.vercel.app). Awaiting PREVIEW_SECRET before running convert smoke.
- 2025-11-10 17:05 CET - Logged vercel.json rewrite + roster bench (session vercel-config+roster-maintenance); pending rerun once Vercel supports python3.12 runtimes locally.
- 2025-11-04 13:47 CET - Preview fence commit omitted deployment evidence; tracked under "Preview fence evidence + smoke".
- 2025-11-04 13:34 CET - PR1 commit landed without CSP and `/public` cache rule; captured as follow-up in active tasks.
- 2025-11-04 08:42 CET - Compliance audit flagged keyboard shortcut conflicts; marked "Needs Review" pending verification.

## Pandoc Vendoring Reference
- Preferred pandoc order: `PYPANDOC_PANDOC` override → vendored binary at `tinyutils/api/_vendor/pandoc/pandoc` → developer PATH. Preview/serverless builds **must** ship the vendored binary.
- Refresh the vendored binary with `python3 tinyutils/scripts/vendor_pandoc.py` (prints archive + binary SHA256 values for evidence logs).
- Tests that depend on pandoc availability should monkeypatch `pandoc_runner.ensure_pandoc` / `get_configured_pandoc_path` to simulate both presence and fallback to ensure the convert API continues to degrade gracefully when pandoc is absent.

## Blob Upload Reference
- Set `BLOB_READ_WRITE_TOKEN` (Vercel project token) before rerunning `scripts/smoke_convert_preview.mjs`; optionally override `VERCEL_BLOB_API_URL` for staging endpoints.
- Converter responses should surface real Blob HTTPS URLs when the token is present and inline `data:` URLs otherwise—capture both modes under `tinyutils/artifacts/convert/<date>/blob-ready/`.
- Tests that exercise blob uploads must mock `_upload_to_vercel_blob` to avoid network access and simulate both success and fallback paths.
