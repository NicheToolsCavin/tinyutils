# AGENTS.md

> >>> READ THIS FIRST — PREVIEW BYPASS FOR AUTOMATION <<<
>
> To access locked Vercel previews non‑interactively, export one of these (in order):
>
> - `VERCEL_AUTOMATION_BYPASS_SECRET` (preferred)
> - `PREVIEW_BYPASS_TOKEN`
> - `BYPASS_TOKEN`
>
> Then run smokes with `PREVIEW_URL=<url>` and the scripts will:
> - Send `x-vercel-protection-bypass: <token>` and `x-vercel-set-bypass-cookie: true`
> - Preflight a GET to set the cookie
> - Include `Cookie: vercel-protection-bypass=<token>`
> - For POST to /api/convert, also append `x-vercel-protection-bypass=<token>` as a query param
>
> Optional: set `PREVIEW_SECRET` to forward `x-preview-secret`.
>
> Scripts updated: `scripts/preview_smoke.mjs`, `scripts/smoke_convert_preview.mjs`.
>
> **Preview ownership — do this yourself every time:** run `vercel --yes` from repo root, copy the printed Preview URL into `PREVIEW_URL`, and export `VERCEL_AUTOMATION_BYPASS_SECRET` (or `PREVIEW_BYPASS_TOKEN`/`BYPASS_TOKEN`) plus `PREVIEW_SECRET` from `.env.preview.local` before you run any smokes. Do not wait for the user to hand you a URL/token.
>
> If you see a redirect loop on POST: ensure the automation secret matches the project and branch; the scripts already preflight+cookie+query param.
>
> **Goal**
> Get a **passing Vercel Preview** build (not public). Pages must render:
>
> - `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`
>   Edge APIs must respond:
> - `/api/check`, `/api/sitemap-delta`, `/api/wayback-fixer`, `/api/metafetch`
>
> ---
>
> ## Use MCP Servers and web.search
>
> ... to enhance your work or find things you may not know well.
>
> `web.search` searches the internet.
>
> `context7` gives access to a ton of good tech/coding info (docs + code examples).
>
> `sequential-thinking` helps you think better (chain-of-thought planning when things get hairy).
>
> `magic` (21st.dev) is great for UI work — you can ask it for nicer components, tables, inputs, or whole panels when polishing pages.
>
> `tiny-reactive` provides browser automation for testing tools, capturing screenshots, and verifying UIs. **Perfect for testing Vercel preview deployments!** Navigate, click, type, wait, evaluate JS, and screenshot — all automated through MCP.
>
> **Key tiny-reactive use cases:**
> - Test preview deployments with real browser automation
> - Verify convert tool iframe preview works correctly
> - Capture screenshots of tool UIs for documentation
> - Automate multi-step workflows (navigate → type → click → verify results)
> - Extract data from rendered pages (perfect for testing tools like keyword density)
>
> **Setup requirements:**
> 1. Start tiny-reactive server: `cd /Users/cav/dev/playwrightwrap && HTTP_API_ENABLED=true HTTP_API_TOKEN=dev123 node dist/src/cli/tiny-reactive.js serve --host 127.0.0.1 --port 5566 --headful --debug`
> 2. Ensure MCP config in ~/.claude.json includes `HTTP_API_TOKEN=dev123` in env vars
> 3. Use `localhost` (not 127.0.0.1) for navigation due to allowlist
>
> TL;DR: when it helps, agents **should** reach for these MCP servers instead of guessing — especially for docs-heavy work, deep reasoning, UI/UX polish, or browser automation testing.


---

## ⚠️ DOCUMENTATION REQUIREMENTS — Only When Changes Occur ⚠️

Document material changes using the Python scripts. Do not log for purely exploratory turns (reading/searching/understanding context) when no repo content or external state changed.

Material changes include: code/HTML/CSS/JS edits, docs edits, asset updates, config changes, adding evidence artifacts, opening/merging a PR, or any change to tool behavior/specs.

### 1. Log to AGENT_RUN_LOG.md (REQUIRED when material changes occurred)
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

### 2. Update AGENT_TASK_CHECKLIST.md (REQUIRED when a task produced changes)
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

Before considering a change complete, verify (only when changes occurred):

- [ ] Ran `python scripts/log_run_entry.py` with all required fields
- [ ] Ran `python scripts/add_task_checklist_entry.py` with status="Completed"
- [ ] Updated relevant `tool_desc_*.md` file if tool behavior changed
- [ ] Saved evidence artifacts to `artifacts/<task>/<YYYYMMDD>/`
- [ ] Committed all documentation changes
- [ ] Pushed to remote

If you skip documentation for material changes, other agents may duplicate/undo your work.

### 🧭 USER_CHECKLIST.md — owner-only tasks

Some actions **cannot** be performed from this repo or CLI (for example, toggling Vercel project settings in the dashboard, or completing Google AdSense/Funding Choices flows). Those must be done by the human owner.

- Use `USER_CHECKLIST.md` to record only tasks that:
  - Require interacting with a third‑party web UI (Vercel, Google Cloud Console, AdSense / Funding Choices, registrar, etc.), and
  - Cannot realistically be executed from this repo's shell, automation, or code changes.
- Do **not** add everyday engineering work here (code edits, tests, smokes, CLI deployments, config files in the repo) — agents should just fix those directly.
- When you discover a genuine owner‑only task (like "flip TinyUtils Vercel project to SvelteKit build" or "finish AdSense approval in the Google UI"), append a short, concrete checkbox item to `USER_CHECKLIST.md` so the user has a single place to see what’s pending on their side.

### Quick decision checklist
- Log required: you committed files; edited docs; changed assets/config; opened/updated a PR; generated evidence artifacts; changed tool behavior/specs.
- No log: you only read code, searched/browsed docs, planned next steps, or discussed approach with no repo or external state change.
- Batch small edits: if you make several tiny commits in one short session, a single consolidated log is fine.
- Agent runs: within a single assistant message/turn, you can run `log_run_entry.py` and `add_task_checklist_entry.py` **once at the end** to summarize all material changes from that turn; you do not need a separate log entry for every micro-task.

---

## Constraints
- **Branch + PR only.** No DNS or Production deploys without OK from user. No repository secrets. **The exception being when you are asked to push to production, in which case you will do so. Thanks.**

### Production Deployment Workflow
**When the user asks you to "push to production" or "deploy to prod", use this workflow:**
1. `git add .`
2. `git commit -m "..."`
3. `git push origin main`
4. ✅ Done! Vercel automatically detects the push and deploys to production.

**DO NOT use `vercel --prod`** - this repo is connected to GitHub, and Vercel auto-deploys from the main branch.

**The `vercel` CLI should ONLY be used for:**
- Local dev server: `vercel dev`
- Manual preview deployments for testing specific branches
- Emergency deploys when GitHub Actions is down (extremely rare)

- **Review PR comments:** A few minutes after a PR is opened, pause to read Claude/Codex comments; check again immediately before any prod push to catch late guidance.
- **Static site, Framework = Other.** No build step; **Output directory = root**.
- **`vercel.json` = headers only.** Remove any `functions`/`runtime` blocks. (Those trigger "Function Runtimes must have a valid version..." errors.) Any relaxation of this rule must be explicitly approved by the owner before merging.
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
  - Speak clearly -- the user is not a coder so he may need help to unerstand somethings.
  - Don't repeat yourself in the same way every time unless it's the only way to say something. If he didn't understand it once, he won't the second and third without a change of approach.
  - Be excited and fun -- don't be so boring, you can have fun here. 
  - When running long-lived commands (python, node, build/test loops, preview smokes, or big `curl`/`sed`/`rg` dumps), wrap them with `idle-notifier` using sensible thresholds (`--idle` just beyond expected output cadence, `--every` coarse to avoid spam, `--escalate` for the “probably stuck” horizon; consider `--keepalive-pattern`, `--cpu-threshold`, and `--output-heartbeat` to cut false alarms). Default: 
    `idle-notifier --idle 20 --every 120 --output-heartbeat 60 --escalate 900 --warn-before 60 --cpu-threshold 50 --keepalive-pattern "GET|200|Serving" --notify -- <cmd>` and tune per task.
  - For **long‑lived services** like `tiny-reactive serve`, use `idle-notifier` in **notify‑only** mode so it never auto-kills the controller:

    ```bash
    idle-notifier \
      --idle 20 \
      --every 120 \
      --output-heartbeat 60 \
      --escalate 0 \   # notify-only; no auto-kill
      --warn-before 60 \
      --cpu-threshold 50 \
      --keepalive-pattern "GET|200|Serving" \
      --notify -- \
      tiny-reactive serve --host 127.0.0.1 --port 5566 --debug
    ```

    This keeps you informed if the controller goes quiet, but leaves the decision to stop/restart it to you.

  - You are allowed (and expected) to start any local services or CLIs you need from this repo’s shell — e.g. `pnpm dev`, `tiny-reactive serve`, `vercel` CLI, curl smokes, etc. Use `idle-notifier` where it helps, shut things down when you’re done, and treat “turning things on when you need them” as part of normal work.
  - Always use `idle-notifier` for python invocations that may hang; apply similarly to any other potentially long/quiet shell commands that might produce lots of output or sit silently for a while.

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

### Logging Policy — Only When Changes Occur
- Do not log every turn. Skip logging for read-only exploration, repo scans, or context gathering when nothing changed.
- Log when you make a material change (code/docs/assets/config), open/update a PR, or add artifacts worth keeping (e.g., smoke test outputs used as evidence).
- Update `tool_desc_*.md` only when behavior changes. No heartbeat entries are required if nothing user-visible changed.
- When you do log, store screenshots, curl outputs, or artifacts under `artifacts/<task>/<YYYYMMDD>/` and reference that path in your log.

Examples — No log needed
- Read files to get up to speed; searched the codebase; drafted a plan; answered questions without changing files.

Examples — Log required
- Edited `/api/*.js`, `/tools/*/index.html`, or updated `vercel.json` or `package.json`.
- Wrote or changed `docs/*`, `tool_desc_*.md`, or `AGENTS.md`.
- Opened a PR or added artifacts from preview smokes you want preserved and referenced.


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
- Google Funding Choices CMP is the **canonical** consent source for analytics and ads.
- `scripts/consent.js` exposes a tiny `window.TinyUtilsConsent` adapter and manages only the local "hide ads" UI (it is not an independent consent UX).
- `scripts/googlefc-consent-adapter.js` listens to Funding Choices / Consent Mode signals and maps them into `TinyUtilsConsent.hasAnalyticsConsent()` / `hasAdsConsent()`.
- `scripts/analytics.js` must consult `TinyUtilsConsent.hasAnalyticsConsent()` before loading analytics; do not add separate consent keys.
- `scripts/adsense-monitor.js` shows adblock toasts only when on prod/preview hosts, the user has opted into ads via `localStorage.ads === 'on'`, **and** `TinyUtilsConsent.hasAdsConsent()` is true.

### CSV hardening
- Opening CSV in Excel/Sheets does **not** execute formulas (leading `= + - @` are prefixed with `'`).

---

## Preview Protection — Automation Bypass (Required)

### If PREVIEW_URL is missing — self-serve a preview
- Run `vercel --yes` from repo root. Copy the Preview URL the CLI prints (e.g., `https://tinyutils-xxxxx.vercel.app`) into `PREVIEW_URL`.
- Export bypass tokens from the local env files (`.env.preview.local` / `.env.vercel.preview`): `VERCEL_AUTOMATION_BYPASS_SECRET` (preferred), `PREVIEW_BYPASS_TOKEN`, `BYPASS_TOKEN`, plus `PREVIEW_SECRET`.
- Then run `node scripts/preview_smoke.mjs` and `node scripts/smoke_data_tools_preview.mjs` with those env vars set. Do this automatically—don’t wait for the user to provide URLs or tokens.

When Vercel Preview deployments are protected, use the official Automation Bypass token so smokes run non‑interactively (no SSO cookie required).

Environment variables (precedence)
- `VERCEL_AUTOMATION_BYPASS_SECRET` — Preferred. Official token for “Protection Bypass for Automation”.
- `PREVIEW_BYPASS_TOKEN` — Legacy name; used if the automation secret isn’t present.
- `BYPASS_TOKEN` — Legacy fallback.
- `PREVIEW_SECRET` — Optional, project‑specific secret; sent as `x-preview-secret` if provided.

What our scripts send
- Header: `x-vercel-protection-bypass: <token>`
- Cookie: `vercel-protection-bypass=<token>`
- Helper header: `x-vercel-set-bypass-cookie: true` (asks Vercel to set the cookie server‑side)

Script support
- `scripts/preview_smoke.mjs` reads tokens in the order above and forwards them as headers/cookie; also forwards `PREVIEW_SECRET`.
- `scripts/smoke_convert_preview.mjs` already supports `VERCEL_AUTOMATION_BYPASS_SECRET` and fallback names.

Operational notes
- Never commit real tokens; set them in your shell or Vercel project env. Do not paste them into logs or artifacts.
- If a preview still returns 401, verify the token belongs to the target project/branch and retry; as a last resort for manual checks, an authenticated browser cookie (`_vercel_jwt`) also works.

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

- 

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



# AVOIDING INFINITE LOOPS

Sometimes you go into an infinite loop, especially when your name is Codex or ChatGPT and you're working in the `just-every/code` CLI utility. You can use the following custom C-coded ntoification utility to ensure that you get pinged every x seconds so that if something  infinite looping, you can stop yourself.



simply enter:

```fish
idle-notifier
```

which is located in:

```~/.opt/bin` 

which should be in the path.
