# CHATGPT.md

## Getting started

- Always skim `AGENTS.md` first so you pick up preview, security, and docs rules.
- Glance at recent entries in `docs/AGENT_RUN_LOG.md` and `docs/AGENT_TASK_CHECKLIST.md` to see what other agents already did.
- If `PREVIEW_URL` is missing, **create one yourself**: run `vercel --yes`, export the printed Preview URL, load `VERCEL_AUTOMATION_BYPASS_SECRET`/`PREVIEW_BYPASS_TOKEN`/`BYPASS_TOKEN` and `PREVIEW_SECRET` from `.env.preview.local` (or `.env.vercel.preview`), then run the preview smokes. Do not wait for the user to hand you the URL/tokens.

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

---

## Quick Decision Tree

1. **"User wants a new tool"** → `research-manager` + `prd-generator` + `user-stories-generator` + `task-list-generator` (all automatic!)
2. **"How does TinyUtils handle X?"** → `gitmcp-tinyutils` search
3. **"What's the best library for Y?"** → `research-manager` + `context7`
4. **"This UI is ugly"** → `magic`
5. **"This is confusing/complex"** → `sequential-thinking`
6. **"Need general info"** → `web.search`

---

**Golden rule:** Use these tools **without asking**. The user installed them so you'd use them proactively. Don't wing it when you have specialized tools available!

Keep changes tight and well-documented. Have fun! 🚀
