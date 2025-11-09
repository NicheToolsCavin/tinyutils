# Roster Status — 2025-11-05 01:45 CET

Source of truth: `AGENTS.md` (automation section, preview status, roster guardrails).

## Active Orchestrator Agents
- `code-gpt-5-codex` — primary lane for implementation and review; keep guardrail checks enabled before routing work.
- `code-teams-personal` — collaborative helper for paired work; adhere to per-session billing caps noted in AGENTS.md.
- `code-teams-tarot` — exploratory/heuristic model; only schedule when quota headroom is confirmed.
- `qwen-3-coder` — fast parallel slot; monitor latency and throttle if quota pressure appears.

## Disallowed / On Hold
- `code-teams-teacher` — explicitly blocked by billing policy; do not schedule or auto-fallback.

## Gemini Fallback Guidance
- Use `gemini-2.5-pro` or `gemini-2.5-flash` **only** if orchestrator dashboards show no billing/quota warnings.
- Document the escalation reason and billing snapshot in the run log when Gemini is invoked, and disable again once quota resumes.

## Logging & Checklist Reminders
- After each task, run `python scripts/log_run_entry.py` and `python scripts/add_task_checklist_entry.py` to keep `docs/AGENT_RUN_LOG.md` and `docs/AGENT_TASK_CHECKLIST.md` aligned.
- Reference Europe/Madrid timestamps and stash evidence (curl headers, smokes, logs) under `tinyutils/artifacts/<task>/20251105/` per AGENTS.md.

## Drift Risks / Unknowns
- No `config.toml` or orchestrator config detected locally; guardrail thresholds, agent weights, and billing hooks cannot be independently verified.
- Any roster changes must be mirrored back into `AGENTS.md` to avoid divergence between documentation and orchestrator expectations.
