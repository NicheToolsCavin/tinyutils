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
| Fix converter HTML conversion bugs (truncation, semantic elements, UX) | manual-2025-11-14 CET | Completed | ✅ Fixed 4 bugs: (1) HTML→Plain Text truncation via direct conversion path, (2) HTML→HTML stray code blocks, (3) HTML→Markdown figure/figcaption via Lua filter, (4) Results table race conditions. UX: Smart disable logic for Extract Media & Accept Tracked Changes. UI: Updated text to reflect 100+ format support. Commits: 76e911d, 42c0866, 90e6fb5. Codex re-test: ALL GREEN ✅. Evidence: tinyutils/artifacts/text-converter/20251114/retest-2.txt |
| Fix environment variable whitespace (BLOB_READ_WRITE_TOKEN, PDF_RENDERER_URL, CONVERTER_SHARED_SECRET) | manual-2025-11-13 13:53 CET | Completed | ✅ Added .strip() calls to 3 env vars in blob.py and _pdf_external.py. Fixed "Invalid header value" errors. Commits: dc7e23a, 979eb0f. Also cleaned git history of 268MB artifacts file and added artifacts/ to .gitignore |
| Automated Vercel log downloading to ~/dev/TinyUtils/logs/ | manual-2025-11-12 14:25 CET | Todo | Create script/command to fetch Vercel logs automatically instead of manual fetch. Log grabber script exists at ~/dev/TinyUtils/logs/grab_logs_converter_preview.sh |
| Converter API — Debug remaining 500 error on POST /api/convert | manual-2025-11-12 14:25 & 16:10 CET | Completed | ✅ FIXED! 16 commits total (91e28d1→8dee8bd). Final solution: Copied convert modules into api/convert/ to avoid cross-package imports. Health check ✅. POST /api/convert ✅. Evidence: artifacts/convert/20251112/success_test_final.json |
| Enforce per-turn logging (AGENTS.md + converter heartbeat) | manual-2025-11-12 10:42 CET | Completed | AGENTS.md updated; tool_desc_converter.md heartbeat added; artifacts/convert/20251112/heartbeat/ |
| Converter — ZIP input (minimal) | auto-2025-11-12T10-35 CET | Completed | Safe extraction; per-member guard; supported formats only |
| Converter — extended Options + filters (graceful) | auto-2025-11-12T10-35 CET | Completed | normalize*/wrap/headers/ascii; runner.apply_lua_filters best‑effort; filters under /filters |
| Converter — preview flag + consistent manifest | auto-2025-11-12T10-35 CET | Completed | Always return preview object; signature-aware pass to convert_batch |
| Lander + sitemap — html-to-markdown | auto-2025-11-12T10-35 CET | Completed | Redirect + sitemap entry |
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
| _None recorded yet_ |  |  |

## Plan Updates
- 2025-11-04 13:47 CET - Preview fence commit omitted deployment evidence; tracked under "Preview fence evidence + smoke".
- 2025-11-04 13:34 CET - PR1 commit landed without CSP and `/public` cache rule; captured as follow-up in active tasks.
- 2025-11-04 08:42 CET - Compliance audit flagged keyboard shortcut conflicts; marked "Needs Review" pending verification.
| DLF Quick Extras smoke gates + artifacts | 2025-11-11 21:43 CET (UTC+0100) | Completed | Green; gating + artifacts in place |
| Markdown dialect detection/output (GFM/CommonMark/strict) | manual-2025-11-14 01:10 CET (UTC+01:00) | Open | Add input heuristics + output selector to support multiple Markdown dialects; map Pandoc args accordingly; UI affordance and API pass-through. |
