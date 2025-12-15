# AGENTS.md

## CRITICAL: Check OpenMemory FIRST!

**Before diving into any TinyUtils task, query OpenMemory:**

```
openmemory_query("TinyUtils")              # General project context
openmemory_query("TinyUtils troubleshooting")  # Known issues & solutions
openmemory_query("Vercel deployment")      # Deployment gotchas
openmemory_query("converter")              # Text converter specifics
```

**Key TinyUtils gotchas stored in memory:**
- **Vercel deployment**: `git push` does NOT auto-deploy to production! Use `vercel --prod`
- **Text converter**: `previewOnly=true` and `previewOnly=false` are SEPARATE code paths - changes often need BOTH
- **Preview URLs**: Require SSO or bypass tokens (see below)

**30 seconds of memory queries can save 30 minutes of debugging.**

---

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
> `openmemory` is the global memory MCP shared by all agents and projects; use it to store and retrieve long-lived rules, workflows, and user preferences (tagged with the project, e.g. `tinyutils`) so you don't need to re-read AGENTS/CHATGPT every time (never store secrets or tokens).
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

## OpenMemory / Venice / MCP quick reference

This environment runs an OpenMemory backend with Venice embeddings and exposes it via MCP.

- Backend repo: `~/dev/openmemory`
- Backend server: `~/dev/openmemory/backend` → `npm run dev`
- Default URL: `http://localhost:8080`
  - MCP endpoint: `http://localhost:8080/mcp`
  - Health: `GET /health` → JSON embedding + tier info
  - Memory HTTP API: `POST /memory/add`, `POST /memory/query`, etc.
- Global DB: `~/.openmemory/global.sqlite`
- Embeddings: Venice `text-embedding-bge-m3` via OpenAI‑compatible `/embeddings`
- Config doc: `~/dev/openmemory/OPENMEMORY_VENICE_MCP_SETUP.md`

MCP servers available in this environment:

- `openmemory` → OpenMemory memory engine (via `mcp-remote` → `http://localhost:8080/mcp`)
- `context7`, `sequential-thinking`, `magic`, `tiny-reactive`, `gitmcp-tinyutils`, etc. (see `~/.code/config.toml` and `~/.codex/config.toml`)

Use MCP tools for most memory operations:

- `openmemory_store` → add memory
- `openmemory_query` → semantic query
- `openmemory_get` / `openmemory_list` / `openmemory_reinforce` → inspect and manipulate memories

Use HTTP/curl only for advanced or unexposed routes:

```bash
# Health
curl -s http://localhost:8080/health | jq

# Add a memory
curl -s -X POST http://localhost:8080/memory/add \
  -H 'Content-Type: application/json' \
  -d '{"content":"Example memory","user_id":"tinyutils"}'

# Query memory
curl -s -X POST http://localhost:8080/memory/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Example","k":8,"filters":{"user_id":"tinyutils"}}'

# Dashboard JSON (no HTML UI):
curl -s http://localhost:8080/dashboard/stats | jq
curl -s http://localhost:8080/dashboard/health | jq
```

If OpenMemory looks broken, consult `OPENMEMORY_VENICE_MCP_SETUP.md` first.

### Understanding OpenMemory: Storage, Retrieval, and Presentation

OpenMemory uses a **three-layer architecture** that separates storage from retrieval from UI presentation. Understanding this prevents confusion about "truncation":

**Layer 1: Storage (Ground Truth)**
- Full memory text is stored in `memories.content` (no truncation)
- All historical memories have complete content
- Config: `OM_USE_SUMMARY_ONLY=false` in backend ensures full text preservation

**Layer 2: Retrieval (Embeddings & Search)**
- Semantic search (`openmemory_query`) searches against the **full stored memory text**
- Relevance scoring is based on complete embeddings, not summaries
- All search results pull from the full memory content
- You always get the most semantically relevant complete memories

**Layer 3: Presentation (UI Display)**
- `openmemory_query` returns human-readable text with **short previews** (~200 chars) for quick scanning
- JSON results in `matches[i].content` contain the **full memory text**
- `openmemory_list` uses `content_preview` for brevity (summaries)
- `openmemory_get` always returns the **complete memory** with no truncation

### Practical: Accessing Summaries vs Full Content

**Quick scan (summary first):**
```python
# openmemory_query returns preview snippets for quick reading
results = openmemory_query("ChatGPT 401 preview smoke")
# result.content shows first ~200 chars: "## ChatGPT 401 Unauthorized..."
# Perfect for scanning many results
```

**Full details (when you need everything):**
```python
# Option A: Use openmemory_get with memory ID
full_memory = openmemory_get(id="d378df52-05dc-4f07-a41d-d3f2596c978f")
# Returns complete stored memory: full content, all metadata

# Option B: Read full content from query JSON
results = openmemory_query("issue")
full_text = results.matches[0].content  # JSON gives you the entire memory
```

**Key distinction:**
- Human-readable text preview (summary) = quick UI display
- JSON `.content` field = actual full stored memory text
- Never assume truncation = incomplete storage; the full text is there

### When to Store in OpenMemory

Store persistent knowledge that **multiple agents across multiple sessions will need**:
- ✅ Operational fixes (like "ChatGPT 401 preview smoke fix" with exact steps)
- ✅ Project rules and constraints
- ✅ Stable workflows or patterns (e.g., "how we handle preview auth")
- ✅ User preferences and style guidelines
- ✅ Lessons learned (e.g., "silent blank DOCX conversion detection gap")

**Never store:**
- ❌ Secrets, tokens, API keys, credentials
- ❌ Transient session logs
- ❌ Temporary debugging notes
- ❌ One-off task results (unless they're pattern-breaking insights)

### Example: Storing & Retrieving a Fix

**Store (once, permanently):**
```python
openmemory_store(
  content="""## ChatGPT 401 Unauthorized Preview Smoke Test - FIX
Error: ChatGPT failed with 401 unauthorized when running preview smoke tests.
Root Cause: Missing `VERCEL_AUTOMATION_BYPASS_SECRET` env var.
Solution: [full instructions with code blocks]
""",
  tags=["tinyutils", "preview", "401-unauthorized", "smoke-test"],
  user_id="tinyutils",
  metadata={"project": "tinyutils", "issue": "401-preview-auth"}
)
```

**Retrieve (any future session):**
```python
# Agent in month 4 doesn't remember this fix
results = openmemory_query("401 unauthorized preview smoke")
# Gets back the fix with summary preview + full JSON content
# Can immediately apply the solution without re-debugging
```

#  AGENTS USAGE:

Due to improper use of agents, the user has described the use of certain agents in the file found in this directory: `JUSTEVERY_AGENTS_LIST.md`. When doing any multi-agent task, you  must read and follow this file.


---

## 🎯 TASK EXECUTION DISCIPLINE — Ship Features, Not Plans

**CRITICAL: Read this before starting any implementation task.**

This section exists because agents have previously:
- Created massive enterprise plans (26+ tasks) for simple 3-phase implementations
- Built infrastructure/utilities instead of user-facing features
- Shipped metadata plumbing but zero actual functionality
- Got distracted by "impressive but tangential" work instead of core requirements

### Core Principles

**1. ALWAYS implement the CORE user-facing feature FIRST**

❌ **WRONG approach:**
- Build metadata detection utilities
- Add size/truncation checks
- Create "unavailable" and "too big" UI cards
- Write security sanitization helpers
- Plan pagination/lazy-loading/accessibility
- **Skip the actual feature entirely**

✅ **CORRECT approach:**
- Implement the EXACT feature requested (e.g., "CSV table preview")
- Verify it works end-to-end
- THEN add utilities, error states, and polish

**Example from Nov 28, 2024 failure:**
- **Task:** "Implement format-specific preview methods (CSV→table, JSON→highlighted, MD→side-by-side)"
- **What agent did:** Built `detect_rows_columns()`, `count_json_nodes()`, "too big" cards, security utils, 6-workstream enterprise plan
- **What agent DIDN'T do:** CSV table renderer, JSON formatter, Markdown side-by-side viewer (0% of core feature)
- **Correct order:** Build the 5 preview renderers FIRST, then add caps/security/polish

---

**2. Follow task specifications EXACTLY (phase-by-phase)**

When given a task file with phases (Phase 1: Backend, Phase 2: Frontend, Phase 3-7: Renderers):
- ✅ Complete Phase 1 fully before moving to Phase 2
- ✅ Implement ALL phases in order
- ❌ Don't skip to "advanced features" before basics work
- ❌ Don't create your own 6-workstream plan when given a 7-phase spec

If the task says "Add `content` and `format` fields to PreviewData":
- ✅ Add those exact fields to the dataclass
- ❌ Don't add only metadata fields and skip the core fields

---

**3. MVP mindset: Simplest thing that works**

**First iteration should be:**
- Minimal but FUNCTIONAL
- User-visible (they can SEE the feature working)
- End-to-end complete (backend → frontend → user sees result)

**NOT:**
- Enterprise-grade infrastructure
- Pagination/virtualization/lazy-loading before basic rendering works
- Performance caps before there's anything to cap
- Accessibility improvements before there's a feature to make accessible

**Ship the bicycle before designing the Formula 1 car.**

---

**4. Avoid scope creep and over-planning**

If asked to implement 5 preview renderers:
- ✅ Implement those 5 renderers
- ❌ Don't expand to 26-task enterprise plan covering security, performance, a11y, monitoring, telemetry

If the task doesn't mention pagination:
- ✅ Build simple "first 100 rows" cap
- ❌ Don't architect a full pagination system with "Load next 500 rows" before basic tables work

**Planning is good. Over-planning is procrastination.**

---

**5. Infrastructure AFTER features, not before**

**Correct order:**
1. Build the feature (CSV table preview)
2. Verify it works
3. Add error handling (malformed CSV)
4. Add performance caps (max 100 rows)
5. Add security (formula escaping)
6. Add polish (truncation banners)

**Wrong order:**
1. Build CSV formula protection utilities
2. Add row/column detection
3. Create "too big" UI card
4. Plan pagination system
5. Skip building the actual CSV table renderer

**Users see features, not infrastructure.**

---

**6. Test the core feature end-to-end before adding polish**

Before implementing:
- "Preview unavailable" cards
- "Too large for preview" warnings
- Truncation banners
- Performance telemetry
- Accessibility improvements

**FIRST verify:**
- ✅ Can backend send CSV content + format?
- ✅ Can frontend detect format="csv"?
- ✅ Does CSV render as an HTML table?
- ✅ Can user SEE the table in their browser?

**If the answer to ANY of these is "no", fix that before adding polish.**

---

**7. When given a detailed task file (/tmp/chatgpt-task.md), FOLLOW IT**

If the task file says:

```
Phase 1: Backend changes (add content/format to PreviewData)
Phase 2: Frontend detection (switch statement routing)
Phase 3: CSV renderer
Phase 4: JSON renderer
Phase 5: Markdown renderer
...
```

**Then implement IN THAT ORDER.**

Don't create your own plan. Don't skip phases. Don't reorder to "do infrastructure first."

The task file author (often Claude Code) has already thought through the correct sequence. Respect it.

---

**8. Self-check before marking work complete**

Ask yourself:

1. **Can the USER see the feature working?**
   - If no → you're not done
   - If "well, the infrastructure is there" → you're not done

2. **Did I implement the EXACT thing requested?**
   - If you built utilities instead of features → you're not done
   - If you planned but didn't ship → you're not done

3. **Would the task requester be satisfied with this deliverable?**
   - If they asked for "CSV table preview" and you delivered "CSV metadata detection" → you're not done

4. **Is there a single end-to-end user flow that works?**
   - Upload CSV → Click Preview → See table in browser
   - If ANY step is missing → you're not done

---

### Red Flags (Stop and Reassess)

🚩 **You're writing a plan longer than 10 tasks for a "simple feature" request**
→ You're over-engineering. Simplify.

🚩 **You're implementing "Phase 2" before "Phase 1" works**
→ Stop. Go back. Build in order.

🚩 **You've added 5+ utility functions but zero user-facing changes**
→ Wrong priorities. Build the feature first.

🚩 **You're discussing pagination/virtualization/lazy-loading before basic rendering exists**
→ Premature optimization. Ship the basics.

🚩 **The diff shows metadata fields added but no actual rendering logic**
→ Infrastructure without features. Reverse your approach.

🚩 **You're planning "Workstream 1-6" for a 3-day task**
→ Scope explosion. Get back to basics.

---

### What "Done" Looks Like

✅ **User can perform the feature end-to-end:**
- Upload document → Click Preview → See format-specific rendering

✅ **Core functionality works for ALL requested formats:**
- CSV shows as table ✓
- JSON shows syntax-highlighted ✓
- Markdown shows side-by-side ✓
- TXT shows line-numbered ✓
- TeX shows syntax-highlighted ✓

✅ **Backend sends the right data:**
- `preview.content` contains raw text ✓
- `preview.format` indicates type ✓

✅ **Frontend routes correctly:**
- Detects format ✓
- Calls appropriate renderer ✓
- Displays result ✓

✅ **You can demo it working:**
- Not "the infrastructure is ready"
- Not "the plan is comprehensive"
- Actually show: upload → preview → rendered output

**If you can't demo it, you didn't ship it.**

---

### Recovery Protocol (If You Catch Yourself Over-Engineering)

1. **Stop immediately**
2. **Re-read the original task request**
3. **Identify the ONE core user-facing feature**
4. **Delete/shelve the enterprise plan**
5. **Implement ONLY that core feature**
6. **Verify it works end-to-end**
7. **THEN ask: "Should I add polish or ship now?"**

**When in doubt: ship the minimal working feature.**

The user can always ask for caps/pagination/a11y/security later. They can't ask for improvements to a feature that doesn't exist.

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

## Agent Orchestration — Sources and Priority

Where configuration lives
- **Agent list:** `JUSTEVERY_AGENTS_LIST.md` — Human-readable list of available agents with descriptions and model configs. Updated by user.
- **External config:** `~/dev/CodeProjects/code_config_hacks/.code/config.toml` — Enables/disables named agents and sets wrapper args, model parameters, and env vars.

Current policy (effective now)
- Prefer enabled agents in order listed in `JUSTEVERY_AGENTS_LIST.md`.
- Selection order: `claude-opus-4.5`, `claude-sonnet-4.5`, `claude-haiku-4.5`, `cavinsays`, `foai_user3`, `3DMan`, `LeoMoralez`, `gemini-2.5-flash`, `qwen-3-coder`.

How to change
- Update `JUSTEVERY_AGENTS_LIST.md` to add/remove agents or change the recommended order.
- Update `~/dev/CodeProjects/code_config_hacks/.code/config.toml` to toggle `[[agents]].enabled = true/false` or adjust model parameters.



# AVOIDING INFINITE LOOPS

Sometimes you go into an infinite loop, especially when your name is Codex or ChatGPT and you're working in the `just-every/code` CLI utility. You can use the following custom C-coded ntoification utility to ensure that you get pinged every x seconds so that if something  infinite looping, you can stop yourself.



simply enter:

```fish
idle-notifier
```

which is located in:

```~/.opt/bin` 

which should be in the path.

<!-- BEGIN CODE-PLUS -->
# code-plus Lifecycle Hooks

> **Project:** code-plus — Claude Code Plugin Compatibility Layer
>
> This file provides lifecycle hook instructions for Claude Code agents.
> It is auto-injected by the code-plus wrapper during SessionStart.

---

## MANDATORY: Lifecycle Hooks

You have access to the `claude-plugins-mcp` MCP server which provides lifecycle hooks.

### Critical Requirements (NON-NEGOTIABLE)

**1. Before completing ANY task, you MUST call:**

```
lifecycle_check({ event: "stop", context: "<summary of what you did>" })
```

- If `allow_exit` is `false`, continue with the provided `continue_prompt`
- Do NOT finish until this returns `allow_exit: true`

**Why:** This allows plugins to:
- Inject additional requirements before you exit
- Run cleanup hooks
- Check Ralph loop completion promises

**2. Before editing sensitive files** (.env, credentials, config files):

```
lifecycle_check({ event: "pre_tool_use", tool: "edit", args: { file: "..." } })
```

- If `allow` is `false`, do NOT proceed with the edit
- Ask the user for permission if blocked

**3. If Ralph loop is active**, call `ralph_check()` periodically:

```
ralph_check()
```

- If `should_continue` is `true`, continue iterating with the provided `prompt`
- Include iteration count in status updates
- Update the user on progress

**4. Understand Plugin Commands**

The following commands from Claude Code plugins are available as MCP tools:

<!-- PLUGIN_COMMANDS_LIST - auto-injected by installer -->
- /analyze-codebase:analyze-codebase — ---
- /audit:audit — ---
- /bug-detective:bug-detective — ---
- /lyra:lyra — ---
- /sugar:sugar-analyze — ---
- /sugar:sugar-review — ---
- /sugar:sugar-run — ---
- /sugar:sugar-status — ---
- /sugar:sugar-task — ---
- /ultrathink:ultrathink — ---
- /code-review:code-review — ---
- /commit-commands:clean_gone — ---
- /commit-commands:commit-push-pr — ---
- /commit-commands:commit — ---
- /feature-dev:feature-dev — ---
- /ralph-wiggum:cancel-ralph — ---
- /ralph-wiggum:help — ---
- /ralph-wiggum:ralph-loop — ---

---

## Usage Examples

### Normal Workflow

```
You: Build a REST API with authentication
Claude: [implements code]
Claude: [calls lifecycle_check before finishing]
MCP Server: allow_exit=true (all plugins approved)
Claude: Here's your API!
```

### Ralph Loop Workflow

```
You: ralph "Build todo API with tests" --max-iter 20
code-plus: Starting Ralph loop (iteration 1)
Claude: [builds basic API]
Claude: [calls ralph_check]
MCP Server: should_continue=true, iteration=1
Claude: [continues with tests]
Code: Iteration 2
Claude: [adds error handling]
Claude: [calls ralph_check]
MCP Server: should_continue=false (iteration limit reached)
Claude: Complete!
```

### Plugin Hook Example

```
You: review this code with code-review plugin
Claude: [edits file]
Claude: [calls lifecycle_check for pre_tool_use]
MCP Server: [code-review plugin runs linting]
Claude: Code review passed, continuing...
```

---

## Available MCP Tools

- `lifecycle_check(event, tool?, args?, context?)` — Soft hooks for lifecycle events
- `ralph_check()` — Check Ralph loop status
- `ralph_start(prompt, max_iterations?, completion_promise?)` — Start a Ralph loop
- `plugin_command(command, args)` — Execute Claude Code plugin commands (future)

---

## Why This Matters

These hooks enable **Claude Code plugins** (like `code-review`, `ralph-wiggum`, `frontend-design`) to work in code/codex, which normally doesn't support plugins.

Failing to call lifecycle hooks:
- 🚫 Breaks plugin functionality
- 🚫 Can cause infinite loops in Ralph mode
- 🚫 Skips security checks (pre_tool_use)
- 🚫 Breaks plugin cleanup operations

**You MUST call these hooks. They are not optional.**

---

## Questions?

See the code-plus documentation:
- Main plan: `~/dev/CodeProjects/justeverycodeskill/CODE-PLUS-PLAN.md`
- Full AGENTS.md: `~/dev/CodeProjects/justeverycodeskill/AGENTS.md`

---

*Auto-generated by code-plus SessionStart hook. Do not manually edit this section.*
<!-- END CODE-PLUS -->
