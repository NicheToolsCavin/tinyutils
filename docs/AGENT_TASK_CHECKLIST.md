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
| QA audit follow-ups (size limits, downloads, progress guidance) | manual-2025-11-15 16:25 CET | Open | 🔎 Add explicit size-limit messaging, enforce HTTP downloads for converter outputs, and capture progress/tooltip feedback per the Nov 15 audit. Evidence: docs/TEST_PLAN_SITE.md, docs/UX_REDESIGN_PLAN.md, docs/AGENT_ASSISTED_PROMPTS.md |
| Clarify AGENTS constraints | manual-2025-11-15 15:45 CET | Completed | ✅ Updated AGENTS.md: vercel header rule now owner-approved for relaxations, removed rigid dependency restriction, added PR comment review cadence. Evidence: AGENTS.md |
| Create Supported Formats page + link + ODT output | manual-2025-11-15 CET | Completed | ✅ New page at /tools/formats/; tools index link; converter adds ODT output; sitemap updated. Evidence: tools/formats/index.html |
| Expose ODT output + Supported formats section + preview bypass callout | manual-2025-11-15 CET | Completed | ✅ Added ODT target; UI lists ODT; new Supported formats section; AGENTS.md loud preview bypass note. Evidence: converter service + UI file. |
| Phase 3 — Text Converter UI + Converter smokes | manual-2025-11-15 CET | Completed | ✅ UI single-select + advanced toggle; dialect expansion; PDF progress copy. Smokes: added tiny PDF case with bypass precedence. Evidence: tools/text-converter/index.html, scripts/smoke_convert_preview.mjs |
| PDF→MD refactor Phase 1–2 (engine guardrails) | manual-2025-11-15 CET | Completed | ✅ Added pdf_layout_mode option, timeout/memory guard, rtl meta; optional pdfplumber. Evidence: api/convert/convert_service.py, convert_types.py |
| PDF→MD refactor unified plan | manual-2025-11-15 CET | Completed | ✅ Plan saved at tinyutils/artifacts/pdf-md-refactor/20251115/unified_plan.md |
| Fix preview smoke bypass handshake | manual-2025-11-15 08:29 CET | Completed | ✅ Updated scripts/preview_smoke.mjs to handshake with Vercel protection tokens, then reran the smoke test. Commits: 959faf2. Evidence: tinyutils/artifacts/preview-green/20251115/preview_smoke.after_automation.log |
| Preview GREEN verification (JWT) | manual-2025-11-15 CET | Completed | ✅ All pages/APIs 200 using SSO cookie (_vercel_jwt). Evidence: tinyutils/artifacts/preview-green/20251115/manual |
| Preview smoke run (PR #33) | manual-2025-11-15 CET | Completed | Smoke FAIL. Evidence: tinyutils/artifacts/preview-green/20251115 |
| /plan — PR #33 unified preview plan | manual-2025-11-15 CET | Completed | ✅ Synthesized multi-agent plan. Evidence: artifacts/plan/20251115/final_plan.md |
| PR33 preview monitor + status comment | manual-2025-11-15 CET | Open | ✅ Comment posted; polling for preview URL via scripts/poll_preview_url.sh. Evidence: docs/AGENT_RUN_LOG.md. |
| Vercel preview pass: enforce headers-only vercel.json | manual-2025-11-15 CET | Completed | ✅ Removed rewrites block from vercel.json. Evidence: tinyutils/artifacts/convert/20251115/vercel_before.json, vercel_after.json |
| Author comprehensive site test plan + GCP cost safety checklist | manual-2025-11-14 CET | Completed | ✅ Added docs/TEST_PLAN_SITE.md and docs/GCP_COST_SAFETY.md; added scripts/gcp_cost_guard.sh (read-only audit). Evidence: artifacts listed in AGENT_RUN_LOG.md. |
| Expose PDF in Converter UI; fix RTF 400 | manual-2025-11-14 CET | Completed | ✅ UI adds PDF checkbox; backend now supports RTF target. Evidence: tinyutils/artifacts/text-converter/20251114/patch_pdf_rtf_ui_backend.diff; smoke payloads saved. Branch: fix/converter-pdf-rtf-ui-testplan-gcp |
| Fix converter PDF upload (UI+server) | manual-2025-11-14 CET | Completed | ✅ UI+server patched. Evidence: artifacts/pdf-fix/20251114/notes.txt |
| Link wrapper CODE_HOME configs | manual-2025-11-14 CET | Completed | ✅ Symlinked each `.code-teams-*` directory to share `.code/config.toml`, ensuring the wrappers load the same agent profile; evidence: artifacts/agent-config-change/20251114/summary.txt |
| Enable code-gpt-5 agent | manual-2025-11-14 CET | Completed | ✅ Enabled code-gpt-5 in code_config_hacks/.code/config.toml so it picks up the shared mcp profile; evidence: artifacts/agent-config-change/20251114/summary.txt |
| Enable MCP profile for code agents | manual-2025-11-14 CET | Completed | ✅ Added mcp profile + context7/sequential MCP definitions and taught all code agents to pass `-p mcp`; evidence: artifacts/agent-config-change/20251114/summary.txt |
| Fix PR#28 code review issues (cache key, validation, code quality) | manual-2025-11-14 CET | Completed | ✅ Fixed 6 issues: (1) Added md_dialect to cache key, (2-3) Verified LaTeX detection correct, (4) Added md_dialect validation, (5) Removed unused variable, (6) Replaced magic strings. Commit: a72865c. All fixes pushed to PR#28 branch. |
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
- 2025-11-14 21:09 CET - Set workspace to write; benched teams-personal/teacher; reassigned agents; applied minimal diffs.
- 2025-11-04 13:47 CET - Preview fence commit omitted deployment evidence; tracked under "Preview fence evidence + smoke".
- 2025-11-04 13:34 CET - PR1 commit landed without CSP and `/public` cache rule; captured as follow-up in active tasks.
- 2025-11-04 08:42 CET - Compliance audit flagged keyboard shortcut conflicts; marked "Needs Review" pending verification.
| DLF Quick Extras smoke gates + artifacts | 2025-11-11 21:43 CET (UTC+0100) | Completed | Green; gating + artifacts in place |