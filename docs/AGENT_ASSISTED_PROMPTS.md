# Agent-Assisted Prompts (copy/paste)

## Agent Mode — Visual QA
Open each page and capture annotated screenshots: `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`, `/tools/text-converter/`.
Check: sticky thead inside `.tableWrap`, focus outlines, AA contrast, spacing between sections, overflow clipping, share-state restore. Add short bullets per page for issues. Save images to `artifacts/agent-mode/YYYYMMDD/`.
Also verify conversion downloads use HTTP blobs (no `data:` URIs) and long-running operations show progress indicators; capture annotations when those conditions are missing.

## Deep Research — Policies & Protocols
Validate TinyUtils assumptions with primary sources: robots.txt semantics, HSTS and mixed-content rules, public-sector TLD sensitivities (.gov/.mil/.bank/.edu) for crawling, sitemap index and `.xml.gz` handling, Pandoc markdown dialects and flags. Provide citations and a 1-paragraph summary per topic. Save notes to `docs/research/YYYYMMDD/summary.md`.

## Deep Reasoning — Focused Error Hunting (quota‑limited)
Use one run only when a high‑impact decision or unclear failure needs deep analysis. Inputs I will provide: failing payloads/screenshots/logs, acceptance criteria, and constraints (Vercel budgets, no new deps). Output: prioritized root‑cause hypotheses, minimal diffs, and a test checklist to validate fixes. Save to `docs/research/YYYYMMDD/deep-reasoning.md` and artifacts under `artifacts/deep-reasoning/YYYYMMDD/`.

## Pro Reasoning — Converter Engine/UI
Think step-by-step about failure modes for: (1) PDF→MD layout extraction (paragraph wrap merges, heading inference by size/weight, list bullets, table block detection, image extraction), (2) single-target default + advanced multi-export toggle (state persistence, keyboard flow, disabled options). Propose mitigations that fit Vercel budgets. Output a risk table and prioritized fixes.

## Pro Reasoning — Edge API Guards
Examine network guard rails: private/loopback denial, scheme restriction, per-origin concurrency, global concurrency cap, jitter, retry-once 429/5xx, CSV hardening. Identify bypass vectors, race/timing hazards, and logging/observability gaps. Provide concrete tests and minimal diffs to close gaps. Save to `docs/research/YYYYMMDD/guards.md`.

## Agent-Assisted Runbook
1. **Open the new mode toggle:** In the ChatGPT UI, click the model drop-down, select “Agent Mode”, and choose whichever agent (deep research, visual agent, or pro reasoning) best fits the task. Once the session opens, click the “Upload file” button inside agent mode and attach `tinyutils-context-YYYYMMDD.tar` (located at `~/dev/TinyUtils/tinyutils-context-20251114.tar`) so the agent can inspect the repo.  
2. **Deep Research:** Paste `deep-research-prompt-pdf-md-2025-11-14.txt` into the Deep Research composer after selecting Deep Research mode; ensure the uploaded tar is attached, then run. Save the returned paper under `artifacts/deep-research/YYYYMMDD/DRN-<id>.md` and log the file path in `docs/AGENT_RUN_LOG.md`.  
3. **Agent Mode Visual QA:** For UI passes, capture annotated screenshots (tools pages + converter) in Agent Mode. Save the generated images to `artifacts/agent-mode/YYYYMMDD/AGM-<id>/` and note the path in the run log.  
4. **Pro Reasoning:** Choose the Pro Reasoning option for high-stakes design reviews; use the prepared prompts from `docs/AGENT_ASSISTED_PROMPTS.md` as a base, run the reasoning, save outputs to `artifacts/pro-reasoning/YYYYMMDD/PRO-<id>.md`, and mention the path in the log.  
5. **Document material changes:** Only update `docs/AGENT_RUN_LOG.md` and `docs/AGENT_TASK_CHECKLIST.md` when a run produces material changes (code/docs/assets/config edits, PRs, or evidence artifacts you intend to preserve). Skip logging for exploration-only runs. Reference artifact paths and DRN/AGM/PRO IDs when you do log.
6. **Headless preview fallback:** If Agent Mode can’t reach the preview, run `node scripts/headless_preview_fallback.mjs` using the same bypass headers/cookies. It saves raw HTML snapshots + `summary.json` under `artifacts/agent-mode/YYYYMMDD/headless-preview/`; link that directory and the JSON in your run log/checklist entry so others can review it.
