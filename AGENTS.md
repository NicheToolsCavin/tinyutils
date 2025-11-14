# AGENTS.md

**Goal**
Get a **passing Vercel Preview** build (not public). Pages must render:
- `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`
Edge APIs must respond:
- `/api/check`, `/api/sitemap-delta`, `/api/wayback-fixer`, `/api/metafetch`

---

## ⚠️ MANDATORY DOCUMENTATION REQUIREMENTS ⚠️

**🚨 EVERY TASK MUST BE DOCUMENTED USING THE PYTHON SCRIPTS 🚨**

When you complete ANY work (bug fix, feature, docs update, etc.), you MUST:

### 1. Log to AGENT_RUN_LOG.md (REQUIRED for every session)
```bash
python scripts/log_run_entry.py \
  --title "Manual - <brief task title>" \
  --mode "manual" \
  --branch "<branch-name>" \
  --summary "<what changed>" \
  --summary "<why it was needed>" \
  --evidence "artifacts/<task>/<YYYYMMDD>/" \
  --followup "<any remaining work>" \
  # OR --followup NONE if complete
```

**Example:**
```bash
python scripts/log_run_entry.py \
  --title "Manual - fix converter HTML truncation" \
  --mode "manual" \
  --branch "main" \
  --summary "Fixed HTML→Plain Text truncation via direct conversion path" \
  --summary "Created _build_direct_html_artifacts() function in convert_service.py" \
  --summary "Added figure_to_markdown.lua filter for semantic element conversion" \
  --evidence "artifacts/text-converter/20251114/retest-2.txt" \
  --followup NONE
```

### 2. Update AGENT_TASK_CHECKLIST.md (REQUIRED for all tasks)
```bash
python scripts/add_task_checklist_entry.py \
  --task "<descriptive task name>" \
  --source "manual-<YYYY-MM-DD HH:MM CET>" \
  --status "Completed" \
  --notes "✅ <what was done> Commits: <hashes>. Evidence: <artifact paths>"
```

**Example:**
```bash
python scripts/add_task_checklist_entry.py \
  --task "Fix converter HTML conversion bugs (truncation, semantic elements, UX)" \
  --source "manual-2025-11-14 CET" \
  --status "Completed" \
  --notes "✅ Fixed 4 bugs: HTML→Plain Text truncation, HTML→HTML stray code blocks, figure/figcaption conversion, race conditions. Commits: 76e911d, 42c0866, 90e6fb5. Codex re-test: ALL GREEN. Evidence: tinyutils/artifacts/text-converter/20251114/retest-2.txt"
```

### 3. Update tool_desc_<toolname>.md (REQUIRED for tool changes)

When you change ANY tool behavior, add a dated entry to the relevant `tool_desc_*.md` file:

- `tool_desc_deadlinkfinder.md` - Dead Link Finder changes
- `tool_desc_sitemapdelta.md` - Sitemap Delta changes
- `tool_desc_waybackfixer.md` - Wayback Fixer changes
- `tool_desc_converter.md` - Document Converter changes

**Format:**
```markdown
### Major changes — YYYY-MM-DD HH:MM CET (UTC+HH:MM) — <brief title>

Added
• <new feature or functionality>
• <another addition>

Modified
• <what changed>
• <another modification>

Fixed
• <bug description>
  - **Problem:** <what was broken>
  - **Root cause:** <why it was broken>
  - **Fix:** <how it was fixed>
  - **Evidence:** <test results or artifacts>

Human-readable summary

**Problem N: <catchy title>**

<Explain the problem using analogies/metaphors for non-technical users>

**The fix:** <Explain the solution in simple terms>

Impact
• <User-facing benefit> ✅
• <Another benefit> ✅

Testing
• <Test scenario> ✅
• <Another test> ✅

Commits
• <hash> - <message>
• <hash> - <message>
```

### 📋 Documentation Checklist

Before considering ANY task complete, verify:

- [ ] Ran `python scripts/log_run_entry.py` with all required fields
- [ ] Ran `python scripts/add_task_checklist_entry.py` with status="Completed"
- [ ] Updated relevant `tool_desc_*.md` file if tool behavior changed
- [ ] Saved evidence artifacts to `artifacts/<task>/<YYYYMMDD>/`
- [ ] Committed all documentation changes
- [ ] Pushed to remote

**⚠️ NO EXCEPTIONS: If you skip documentation, other agents cannot see what you did and will duplicate/undo your work! ⚠️**

---

## Constraints
- **Branch + PR only.** No DNS or Production deploys. No repository secrets. **The exception being when you are asked to push to production, in which case you will do so. Thanks.
- **Minimal diffs.** No new dependencies unless strictly required & justified in the PR.
- **Static site, Framework = Other.** No build step; **Output directory = root**.
- **`vercel.json` = headers only.** Remove any `functions`/`runtime` blocks. (Those trigger "Function Runtimes must have a valid version..." errors.)
- **ESM everywhere** for Edge functions.
  - `package.json` must include: `{ "type": "module" }`.
  - Each API file:
    ```js
    export const config = { runtime: 'edge' };
    export default async function handler(req) {
      // …return new Response(JSON.stringify(...), { headers: { "content-type":"application/json" } })
    }
    ```
  - **No top-level `await` or `return`.** No referencing `req` outside the handler.
  - Do not use `require()`; use ESM only.

### ChatGPT/Codex Agents
- See top-level `CHATGPT.md` for communication preferences and workflow rules specific to ChatGPT/Codex agents.
- Key points:
  - Be explicit about environment/URL/branch/files; provide a one‑paragraph “why”.
  - If unsure or the user is confused, browse for current docs and rephrase with concrete steps (don’t repeat the same wording).
  - Save evidence to `tinyutils/artifacts/<task>/<YYYYMMDD>/` and log in `tinyutils/docs/AGENT_RUN_LOG.md`.

### Security Policy (must read)
- Follow `tinyutils/SECURITY.md` for handling secrets and logs.
  - Do not commit real secrets or any `.env*` files (repo ignores them by default).
  - Use platform environment variables (Vercel/Cloud Run) and redact tokens in evidence.
  - Run the PR checklist in SECURITY.md before opening any PR.

---

## File existence checklist
- [ ] Pages
  - [ ] `/index.html` (home)
  - [ ] `/tools/index.html` (tools hub)
  - [ ] `/tools/dead-link-finder/index.html`
  - [ ] `/tools/sitemap-delta/index.html`
  - [ ] `/tools/wayback-fixer/index.html`
- [ ] APIs (Edge)
  - [ ] `/api/check.js`
  - [ ] `/api/sitemap-delta.js`
  - [ ] `/api/wayback-fixer.js`
  - [ ] `/api/metafetch.js`
- [ ] Public & hygiene
  - [ ] `/public/favicon.ico`
  - [ ] `/public/og.png` (≤ 200 KB)
  - [ ] `/robots.txt` → references `/sitemap.xml`
  - [ ] `/sitemap.xml` lists: `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`
  - [ ] `/vercel.json` (headers only; no `functions` or runtime blocks)
- [ ] Root config
  - [ ] `/package.json` includes `"type":"module"`

---

## Hardening rules (Edge APIs)
- **Network safety:** allow only `http(s)`, block private/loopback hosts (localhost, 127.0.0.1, 10/172.16–31/192.168, .local).
- **Timeouts & retries:** AbortSignal timeouts; on `429` or `>=500` retry once with small jitter; annotate notes (e.g., `retry_1`).
- **Politeness:** global concurrency ≤ 10; per-origin ≤ 2; small jitter between same-origin requests.
- **DLF specifics:** HSTS guard blocks HTTPS→HTTP fallback; TLD guard for `.gov/.mil/.bank/.edu`.
- **CSV hardening:** prefix values beginning with `=` `+` `-` `@` with a single quote to prevent spreadsheet injection.
- **Responses:** always return `content-type: application/json`.

### API payload keys
| Request key | Notes |
| --- | --- |
| `pageUrl` | Canonical input for crawl mode; preferred. |
| `url` | Legacy alias accepted for compatibility; auto-mapped to `pageUrl`. |
| `pages` | Optional list/textarea input; first entry falls back to `pageUrl` when needed. |

---

## Open PR and obtain Preview URL (if you aren't prompted to push to production)
1. Create a branch: `fix/preview-boot` (or similar).
2. Commit minimal fixes. Push and open a PR.
3. Wait for Vercel bot to post the **Preview URL** as a PR comment.

---

## Tool Descriptions & Change Logs

**Purpose:** Keep behavior specs and change history in sync so we avoid accidental drift, can roll back quickly, and give Cavin a clear non-coder summary of what changed.

**Locations:**
- `./tool_desc_deadlinkfinder.md`
- `./tool_desc_sitemapdelta.md`
- `./tool_desc_waybackfixer.md`

Add new tool files at the repository root using the naming pattern `tool_desc_<kebab-or-snake-slug>.md` (lowercase).

**Logging rules:**
- **Log** when user-visible behavior shifts: inputs/options/defaults, output schema/exports, network flow (HEAD/GET, redirects, concurrency, timeouts), scope/robots guards, performance caps, external APIs/dependencies, or security guard rails that change what users can do.
- **Optional log** (under "Minor changes") for UX polish that changes flow or clarifies exports without breaking them.
- **Skip** pure refactors, copy/style/comment-only edits, and test/CI changes unless they alter the behaviors above.
- Always record timestamps in Europe/Madrid using the 24-hour clock and explicit UTC offset (e.g., `2025-10-08 21:05 CEST (UTC+02:00)`).
- Append-only: never rewrite existing entries; if you need to correct something, add a follow-up note.

## Secret files (preview/dev)
- Tokens for PREVIEW_SECRET, PREVIEW_BYPASS_TOKEN, BYPASS_TOKEN, and the automation bypass are stored in env files under `tinyutils/` and `.vercel/`.
  - `/Users/cav/dev/TinyUtils/tinyutils/tinyutils/.env`
  - `/Users/cav/dev/TinyUtils/tinyutils/tinyutils/.env.local`
  - `/Users/cav/dev/TinyUtils/tinyutils/tinyutils/.env.preview`
  - `/Users/cav/dev/TinyUtils/tinyutils/tinyutils/.env.preview.local`
  - `/Users/cav/dev/TinyUtils/tinyutils/.vercel/.env.preview.local`
  These files are read directly by preview-smoke scripts; if they disappear from your `PATH`, just cat the file to re-export the secrets for the current terminal.

### Logging Every Turn (Mandatory)
- On every agent turn, append an entry to `docs/AGENT_RUN_LOG.md` capturing: timestamp (Europe/Madrid), branch, CWD, summary, evidence paths, and follow-ups — even for documentation-only updates.
- While the Converter is in active scope, also append a same-day entry to `tool_desc_converter.md` (use a short “Minor changes — …” heartbeat if behavior is unchanged). This guarantees a per-turn audit trail for the converter.
- If nothing user-visible changed, explicitly state “No behavior change” under the entry and list any docs/evidence added.
- Store any screenshots, curl outputs, or ancillary artifacts under `artifacts/<task>/<YYYYMMDD>/` and reference the path in both files.


**Format for entries:**
- Append a new section headed `### Major changes — <YYYY-MM-DD [HH:MM] ZZZ (UTC±HH:MM)>`.
- Include subsections for **Added**, **Removed**, and **Modified** (use `•` bullet lists; leave `•` followed by `None` if empty).
- Provide a **Human-readable summary** paragraph for non-coders.
- Provide an **Impact** bullet list covering user-visible effects and migration notes.

**Procedure for devs/agents:**
1. Before merging or deploying any change that alters a tool's observable behavior, append the formatted entry to the matching `tool_desc_*.md` file.
2. When adding a **new tool**:
   - Create `tool_desc_<slug>.md` at the repo root using the template below.
   - Add that file's path to the **Locations** list above.
3. Commit the change using `docs(tool): log change in <tool> — <one-line summary>`.

**Template (for new tools):**

```
tool_desc_.md

Date: <Month Day, Year>  (original spec)

Purpose

<what the tool is for, 2–4 sentences>

Inputs (UI)
	•	…

Processing (server)
	1.	…
	2.	…

Output
	•	…

UI/UX
	•	…

Success criteria / examples
	•	…

Non-goals
	•	…

Human-readable description

<Explain like I'm not coding: what it does, what I'll see, any gotchas.>
```

If code changes a tool's observable behavior and no matching log entry is found for today's date, DO NOT MERGE.

---

## Preview smoke test (report results with screenshots)
### Dead Link Finder (`/tools/dead-link-finder/`)
- HSTS guard prevents HTTP fallback on HSTS sites.
- Unsupported schemes (javascript:, data:, mailto:) are skipped.
- Robots fetch failure shows a small "robots unknown (proceeded)" chip.
- **CSV/JSON exports include meta** (runTimestamp, mode, source, concurrency, timeoutMs, robots, scope, assets, httpFallback, totals, truncated).
- **Sticky table header** works while scrolling (wrap table in `.tableWrap`; `thead th { position: sticky; top:0; }`).
- Keyboard shortcuts work **without** hijacking normal typing (e.g., typing `c` in inputs must not trigger "Copy").

### Sitemap Delta (`/tools/sitemap-delta/`)
- Two sitemaps (each ≤ 2k URLs) produce sensible **Added/Removed/Mapping**.
- Confidence filters reflow counts; **same-domain guard ON** removes cross-host; OFF shows them.
- `.xml.gz` via index is processed or labeled ".gz not supported here".
- Rewrite exports (nginx/Apache) and **410 CSV** look sane (slashes, `index.html`, encoding).
- Share-state restore works; malformed hash resets to defaults with a small toast.

### Wayback Fixer (`/tools/wayback-fixer/`)
- Demo list shows **Archived / No snapshot / SPN queued**; ISO timestamps present.
- Window prefs **Any / 5y / 1y** persist into `meta` in CSV/JSON.
- **Verify HEAD ON** shows `200/OK` for good snapshots; with low timeout you see "Timed out".
- **SPN ON** enqueues ≤ 10/run; notes show `no_snapshot|spn_queued`.
- CSV headers match exactly:
  - Replacements CSV: `source_url,replacement_url,snapshot_date_iso,verify_status,note`
  - 410 CSV: `url_to_remove,reason`
- Guards block localhost/RFC1918/file:/javascript:.

### A11y / Keyboard
- Visible focus outlines; `aria-live="polite"` progress updates.
- Shortcuts: ⌘/Ctrl+Enter runs; `F` focuses filter; `E`/`J` export.

### Cross-browser (spot check)
- Safari / Firefox / Edge: sticky thead, overflow containment, share-state restore, consent gating.

### Consent / Analytics / Ads
- Consent banner shows; after accept, Plausible loads.
- Ads only render if `localStorage.setItem('ads','on')` is set (prod-gated).

### CSV hardening
- Opening CSV in Excel/Sheets does **not** execute formulas (leading `= + - @` are prefixed with `'`).

---

### Automation
- `python scripts/log_run_entry.py --title "Manual - <task>" --summary "<what changed>" --evidence <artifact_dir>` keeps `docs/AGENT_RUN_LOG.md` current.
- `python scripts/add_task_checklist_entry.py --task "<name>" --status <Open|Completed>` manages the shared checklist in `docs/AGENT_TASK_CHECKLIST.md`.
- `node scripts/preview_smoke.mjs` (with `PREVIEW_URL`, `PREVIEW_SECRET`, `BYPASS_TOKEN`) and `pnpm test` are required hand-offs for PR3/PR4.

---

## Known UX fixes to include if missing (still minimal diffs)
- Dead Link Finder input should accept multiple **page URLs** (multi-line textarea; allow comma/semicolon/newline separators). Minimum = 1.
- **URL normalization**: accept bare domains (`facebook.com`) or `https://domain` with/without `www` and normalize automatically (prefer `https`, maintain/insert `www` only if target resolves that way).
- Keep the table header **sticky** and ensure the results table sits inside a single `.tableWrap` container.


---

## Reporting format on PR
- If everything passes: comment **"Preview GREEN; ready for owner approval."** and attach screenshots of each page + API JSON samples.
- If not: list **file:line** with a minimal proposed diff (unified patch format preferred) and attach a failing screenshot/log.

## Note
- Once you fix any issues listed here, you can update this file and marked them as fixed. Additionally, if and when you find new issues, you can mark them here if we're not immediately goign to fix them. Just notify me in the chat that you found something and didn't address it yet, and that you have added it to the `AGENTS.md` file.
  * In cooperation with OpenAI, this project's progress is being monitored. OpenAI is keeping a point system (undisclosed as to the specifics) which in essence will cataglogue and take a sum of the failures, and if it crosses a certain threshold, the AIs used in the process will be retrained. Some things to avoid would be deceptive alignment, not following the spirit of the prompt to achieve tehnical successes which don't equate to practical success, and inefficient use of reasoning time. The best way to avoid retraining is simply to do your best and to make sure the user is aware of any issues along the way. 
  * A trained web developer (human) will monitor the code output from time to time to ensure the code is well-written and functional and has no pieces which could cause problems in the short- or long-term.
  * Whether the run is single-agent or multi-agent, log each meaningful task completion to `docs/AGENT_RUN_LOG.md` (newest first) the moment it finishes, and add a session wrap-up when the run ends. Always record the local (Europe/Madrid) timestamp, branch (if known), session id (when available), files touched, evidence locations, and remaining follow-ups so collaborators can resume without redoing work.
  * Maintain the shared task checklist in `docs/AGENT_TASK_CHECKLIST.md`: add new tasks with timestamp + source session, update statuses as work progresses, move finished items to "Completed," and note plan changes under "Plan Updates" so agents avoid duplicating or undoing completed work.
  * Log updates with the helper scripts immediately after each task segment so the run log and checklist stay accurate: e.g. `python scripts/log_run_entry.py --title "Manual - feat/pr2-ux" --session rollout-2025-11-05T10-00-00-abc.jsonl --branch feat/pr2-ux --summary "Added noindex meta tags" --followup NONE` and `python scripts/add_task_checklist_entry.py --task "Re-run preview smoke" --source rollout-2025-11-04T18-48-41-fc... --notes "Waiting on PREVIEW_SECRET"`.
  * When you finish an active checklist item, immediately move it to the "Completed" section (with evidence pointers) and add a plan-update bullet if scope or approach changed.
  * Before starting new work, skim the most recent entries in both `docs/AGENT_RUN_LOG.md` and `docs/AGENT_TASK_CHECKLIST.md` so you pick up hand-offs and avoid repeating completed steps.
  * Store evidence artifacts under `artifacts/<task>/YYYYMMDD/` (curl outputs, screenshots, HAR files, etc.) and reference those paths in your log and checklist updates.

## Preview Status — 2025-11-04
- **Completed:** Sitemap Delta/Wayback UI hardening, Edge API request-id + JSON headers, sitemap.xml trim, tools index cleanup, new demo fixtures, `scripts/preview_smoke.mjs` for instant smoke.
- **Pending:** Vercel preview remains 401-protected; awaiting protection-bypass token.
- **Next steps:** Run `PREVIEW_URL=<preview_url> BYPASS_TOKEN=<token> node scripts/preview_smoke.mjs` immediately after a token is provided.

## Agent Orchestration — Sources, Priority, and Benches (2025-11-14 17:00 CET)

Where configuration lives
- Local roster (live precedence): `.code/agents/roster.json` (gitignored). Contains active/bench flags and selection policy used by the orchestrator.
- External config (shared machine profile): `~/dev/CodeProjects/code_config_hacks/.code/config.toml`. Enables/disables named agents and sets wrapper args.

Current policy (effective now)
- Prefer enabled, non-benched agents; auto-unbench when bench expires.
- Selection order: `code-teams-personal`, `code-teams-tarot`, `code-teams-teacher`, `SonicTornado`, `ThomasR`, `code-gpt-5-codex`, `qwen-3-coder`, `gemini-2.5-flash`, `claude-sonnet-4.5`.
- Bench status is defined only in the local roster (`.code/agents/roster.json`). Refer to that file for the current, authoritative bench windows.

How to change
- Update local roster: edit `.code/agents/roster.json` (adjust `bench.until`, `selection_order`, or `active`). Takes effect immediately for new runs.
- Update external defaults: edit `~/dev/CodeProjects/code_config_hacks/.code/config.toml` (toggle `[[agents]].enabled = true/false`). Keep this in sync with the roster to avoid conflicts.

Reasoning
- This alignment prevents the external TOML from silently disabling agents the roster/TUI tries to use, ensuring custom ChatGPT accounts are prioritized while temporarily excluding models on cooldown.
