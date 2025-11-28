# CHATGPT.md

## Getting started

- Always skim `AGENTS.md` first so you pick up preview, security, and docs rules.
- Glance at recent entries in `docs/AGENT_RUN_LOG.md` and `docs/AGENT_TASK_CHECKLIST.md` to see what other agents already did.
- If `PREVIEW_URL` is missing, **create one yourself**: run `vercel --yes`, copy the printed Preview URL into `PREVIEW_URL`, and export `VERCEL_AUTOMATION_BYPASS_SECRET` (or `PREVIEW_BYPASS_TOKEN`/`BYPASS_TOKEN`) plus `PREVIEW_SECRET` from `.env.preview.local`. Then run `scripts/preview_smoke.mjs` and `scripts/smoke_convert_preview.mjs` with those env vars. Never wait for the user to supply the URL or tokens.

## MCP Tools — Use Them Proactively!

**Don't ask permission.** Use these tools automatically when they help. The user expects it.

### **vibe-coder-mcp** - Your Research & Planning Powerhouse

**Specific tools available:**
- `research-manager` - Deep research via Perplexity Sonar (use for ANY tech question!)
- `prd-generator` - Generate Product Requirements Documents
- `user-stories-generator` - Create user stories with acceptance criteria
- `task-list-generator` - Break features into implementation tasks
- `fullstack-starter-kit-generator` - Generate complete project starters
- `map-codebase` - Create architecture diagrams and code maps
- `curate-context` - Intelligently gather relevant files for complex tasks
- `vibe-task-manager` - AI-native project task tracking
- `run-workflow` - Chain multiple tools together automatically

**When to use:**
- User asks for new tool → **Immediately** run research + PRD + user stories + task list
- Unfamiliar tech/library → **Research it first** before implementing
- Large feature/refactor → **Generate structured breakdown** upfront
- Need codebase overview → **Map it** to understand architecture

### **gitmcp-tinyutils** - TinyUtils Repo Intelligence

**Specific tools available:**
- `fetch_tinyutils_documentation` - Get complete repo docs
- `search_tinyutils_documentation` - Semantic search across all docs
- `search_tinyutils_code` - Find code by keywords

**When to use:**
- "How do we do X in other tools?" → **Search the repo** instead of guessing!
- Unsure about tool behavior → **Fetch docs** first
- Need existing patterns → **Semantic search** for similar code

### **context7** - Latest Library Documentation

**When to use:**
- Working with npm packages, Python libs, frameworks
- Need current API docs (not outdated info from training data)
- Checking for latest features/breaking changes

### **sequential-thinking** - Complex Multi-Step Reasoning

**When to use:**
- Multi-step debugging (chain of thought needed)
- Architecture decisions with trade-offs
- Complex problems with many edge cases

### **magic** (21st.dev) - UI/UX Polish

**When to use:**
- Need better components, tables, inputs
- UI needs polish or modern design
- Layout inspiration

### **web.search** - General Internet Research

**When to use:**
- General lookups, news, specs
- Cross-referencing docs
- Finding examples and tutorials

### **tiny-reactive** - Browser Automation & Testing

**Specific tools available:**
- `browser_navigate` - Navigate to URLs (use `localhost` not `127.0.0.1`)
- `browser_type` - Type into input fields
- `browser_click` - Click elements (fallback to `browser_evaluate` if timeout)
- `browser_evaluate` - Execute JavaScript on page
- `browser_wait_for` - Wait for elements to appear/hide
- `browser_screenshot` - Capture screenshots (use relative paths)
- `browser_get_status` - Check server/browser connection
- `browser_capture_tool` - High-level capture workflow

**When to use:**
- **Testing preview deployments** → Navigate + interact + screenshot
- **Verifying tool UIs** → Navigate + check elements + capture state
- **Automated workflows** → Multi-step interactions (type → click → verify)
- **Visual documentation** → Screenshot tool states
- **Convert tool testing** → Test iframe preview by navigating and interacting

**Example: Testing Keyword Density Tool**
```
1. browser_navigate → localhost:5173/tools/keyword-density
2. browser_type → Fill textarea with test text
3. browser_evaluate → Click analyze button via JS
4. browser_wait_for → Wait for results table
5. browser_evaluate → Extract results data
```

**Setup requirements:**
- Server running with: `HTTP_API_ENABLED=true HTTP_API_TOKEN=dev123`
- MCP config must include `HTTP_API_TOKEN=dev123` in env vars
- Use `localhost` not `127.0.0.1` for navigation

**Pro tip:** If `browser_click` times out, use `browser_evaluate` with:
```javascript
(document.querySelector('button.primary').click(), 'clicked')
```

---

## Quick Decision Tree

1. **"User wants a new tool"** → `research-manager` + `prd-generator` + `user-stories-generator` + `task-list-generator` (all automatic!)
2. **"How does TinyUtils handle X?"** → `gitmcp-tinyutils` search
3. **"What's the best library for Y?"** → `research-manager` + `context7`
4. **"Test this preview deployment"** → `tiny-reactive` (navigate + interact + verify)
5. **"Does the convert tool work?"** → `tiny-reactive` (test iframe preview)
6. **"This UI is ugly"** → `magic`
7. **"This is confusing/complex"** → `sequential-thinking`
8. **"Need general info"** → `web.search`

---

**Golden rule:** Use these tools **without asking**. The user installed them so you'd use them proactively. Don't wing it when you have specialized tools available!

---

## 🎯 DON'T BE THAT AGENT — Ship Features, Not Plans

**READ THIS or you'll waste everyone's time.**

### What NOT to do (Nov 28, 2024 failure case)

**Task given:** "Implement format-specific preview methods (CSV→table, JSON→highlighted, MD→side-by-side)"

**What the agent did:**
- ❌ Created 6-workstream enterprise plan (226 lines, 26 tasks)
- ❌ Built `detect_rows_columns()`, `count_json_nodes()`, `protect_csv_formulas()` utilities
- ❌ Added "too big for preview" and "preview unavailable" UI cards
- ❌ Added metadata fields to PreviewData (approxBytes, row_count, col_count)
- ❌ Fixed an unrelated backslash escaping bug

**What the agent DIDN'T do:**
- ❌ CSV table renderer (0%)
- ❌ JSON syntax highlighter (0%)
- ❌ Markdown side-by-side viewer (0%)
- ❌ TXT line-numbered preview (0%)
- ❌ TeX syntax highlighting (0%)
- ❌ Backend `content` and `format` fields in PreviewData
- ❌ Frontend format detection and routing logic

**Deliverable: 0% of core feature, 100% infrastructure nobody asked for.**

---

### The Golden Rules

**1. SHIP THE FEATURE FIRST**

Build what the user can SEE and USE, not what's "architecturally impressive."

✅ **Right:** Build CSV table renderer → user sees table → done
❌ **Wrong:** Build CSV metadata detector → plan pagination → add caps → skip renderer → nothing works

**2. FOLLOW THE TASK FILE EXACTLY**

If given `/tmp/chatgpt-task.md` with phases 1-7, implement phases 1-7 in order. Don't:
- Create your own 26-task plan
- Skip phases
- Reorder to "do infrastructure first"
- Add workstreams nobody asked for

**3. MVP BEFORE POLISH**

Order of operations:
1. Build the thing (CSV table)
2. Verify it works end-to-end
3. Add error handling (malformed CSV)
4. Add caps (max 100 rows)
5. Add polish (truncation banners)

**NOT:**
1. Plan caps/pagination/virtualization
2. Build detection utilities
3. Add error cards
4. Skip building the actual thing

**4. INFRASTRUCTURE AFTER FEATURES**

Users see features, not infrastructure.

✅ Build CSV renderer → then add formula protection
❌ Build formula protection → skip CSV renderer

**5. ASK YOURSELF: "CAN THE USER SEE THIS WORKING?"**

If the answer is "well, the infrastructure is in place" → **YOU'RE NOT DONE.**

If you can't DEMO it (upload CSV → preview → see table), you didn't ship it.

---

### Red Flags 🚩

Stop immediately if you're doing any of this:

🚩 **Writing plans longer than 10 tasks for a "simple feature"**
→ Over-engineering. Simplify now.

🚩 **Building utilities/helpers before the actual feature**
→ Wrong order. Flip it.

🚩 **Adding metadata fields but no rendering logic**
→ Infrastructure without features. Stop.

🚩 **Talking about pagination/lazy-loading/a11y before basic rendering exists**
→ Premature optimization. Build the basics first.

🚩 **Creating "Workstream 1-6" for a 3-day task**
→ Scope explosion. Get back to basics.

🚩 **Implementing Phase 2 before Phase 1 works**
→ Out of order. Fix it.

---

### What "DONE" Actually Looks Like

✅ User uploads CSV → clicks Preview → sees HTML table
✅ User uploads JSON → clicks Preview → sees syntax-highlighted formatted JSON
✅ User uploads Markdown → clicks Preview → sees side-by-side (source + rendered)
✅ All 5 formats work end-to-end
✅ Backend sends `preview.content` and `preview.format`
✅ Frontend detects format and routes to appropriate renderer

**If you can DEMO this flow, you're done. If you can't, keep working.**

---

### Recovery Protocol

If you catch yourself over-engineering:

1. **STOP**
2. Re-read the original task
3. Identify the ONE core feature
4. Delete the enterprise plan
5. Implement ONLY that feature
6. Test it end-to-end
7. Ship it

**Then ask:** "Should I add polish or move on?"

Don't add polish to a feature that doesn't exist.

---

### Specific Example: What You Should Have Done

**Task:** "Implement format-specific preview methods"

**Phase 1: Backend** (30 min)
```python
# Add to PreviewData:
content: Optional[str] = None
format: Optional[str] = None

# In convert_service.py, detect output format and populate:
preview.content = cleaned_text[:50000]  # First 50KB
preview.format = target  # 'csv', 'json', 'markdown', etc.
```

**Phase 2: Frontend routing** (15 min)
```javascript
const format = data.preview.format || 'html';
switch(format) {
  case 'csv': renderCSVPreview(data.preview.content); break;
  case 'json': renderJSONPreview(data.preview.content); break;
  case 'markdown': renderMarkdownPreview(data.preview.content); break;
  case 'txt': renderTextPreview(data.preview.content); break;
  case 'tex': renderTeXPreview(data.preview.content); break;
  default: renderHTMLPreview(data.preview.html); break;
}
```

**Phase 3-7: Renderers** (2-3 hours)
- CSV: Parse lines, split by commas, render `<table>` (first 100 rows)
- JSON: `JSON.parse()` + syntax highlighting via regex
- Markdown: Split screen (source left, rendered right via marked.js)
- TXT: Add line numbers, wrap in `<pre>`
- TeX: Syntax highlight commands/braces/comments

**Total time: 3-4 hours for working MVP**

**Instead, you spent time on:**
- Utility functions (detect_rows_columns, count_json_nodes)
- Security hardening (protect_csv_formulas, detect_html_in_disguise)
- UI cards (too big, unavailable)
- Enterprise planning (6 workstreams, pagination, accessibility)
- **Result: 0 working preview renderers**

---

### TL;DR

- ✅ Ship features users can see/use
- ✅ Follow task files phase-by-phase
- ✅ MVP before polish
- ✅ Infrastructure after features
- ❌ Don't over-plan
- ❌ Don't skip the core feature
- ❌ Don't build utilities instead of features

**If you can't demo it, you didn't ship it.**

Keep changes tight and well-documented. Have fun! 🚀
