# Agent-Assisted Prompts (copy/paste)

## Agent Mode — Visual QA
Open each page and capture annotated screenshots: `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`, `/tools/text-converter/`.
Check: sticky thead inside `.tableWrap`, focus outlines, AA contrast, spacing between sections, overflow clipping, share-state restore. Add short bullets per page for issues. Save images to `artifacts/agent-mode/YYYYMMDD/`.

## Deep Research — Policies & Protocols
Validate TinyUtils assumptions with primary sources: robots.txt semantics, HSTS and mixed-content rules, public-sector TLD sensitivities (.gov/.mil/.bank/.edu) for crawling, sitemap index and `.xml.gz` handling, Pandoc markdown dialects and flags. Provide citations and a 1-paragraph summary per topic. Save notes to `docs/research/YYYYMMDD/summary.md`.

## Deep Reasoning — Focused Error Hunting (quota‑limited)
Use one run only when a high‑impact decision or unclear failure needs deep analysis. Inputs I will provide: failing payloads/screenshots/logs, acceptance criteria, and constraints (Vercel budgets, no new deps). Output: prioritized root‑cause hypotheses, minimal diffs, and a test checklist to validate fixes. Save to `docs/research/YYYYMMDD/deep-reasoning.md` and artifacts under `artifacts/deep-reasoning/YYYYMMDD/`.

## Pro Reasoning — Converter Engine/UI
Think step-by-step about failure modes for: (1) PDF→MD layout extraction (paragraph wrap merges, heading inference by size/weight, list bullets, table block detection, image extraction), (2) single-target default + advanced multi-export toggle (state persistence, keyboard flow, disabled options). Propose mitigations that fit Vercel budgets. Output a risk table and prioritized fixes.

## Pro Reasoning — Edge API Guards
Examine network guard rails: private/loopback denial, scheme restriction, per-origin concurrency, global concurrency cap, jitter, retry-once 429/5xx, CSV hardening. Identify bypass vectors, race/timing hazards, and logging/observability gaps. Provide concrete tests and minimal diffs to close gaps. Save to `docs/research/YYYYMMDD/guards.md`.
