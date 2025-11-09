# tinyutils
TinyUtils

## DLF Quick Extras (smokes)

Run against production (override with `TINYUTILS_BASE`):

```bash
pnpm smoke:extras
```

Assertions:
- HSTS / hard-TLD guard — even with `retryHttpOnHttpsFail=true`, HTTP fallback is never used on guarded domains.
- Robots “unknown” (best-effort) — probes a small set of flaky hosts and always validates the JSON envelope; surfaces `robotsStatus=unknown` when reproducible.

Optional UI sanity (local, uses Tiny-Reactive):

```bash
tiny-reactive serve --host 127.0.0.1 --port 5566 --headful --debug
pnpm ui:smoke:dlf
# override controller URL with `TINY_REACTIVE_URL` if the server isn’t on localhost
```

Artifacts save to `./.debug/` (e.g., `dlf-ui.png`).

## Operational Checklist (CET)

Follow these quick references after pulling the latest branch. Evidence for each phase is stored beneath `tinyutils/artifacts/<task>/<YYYYMMDD>/` using Europe/Madrid timestamps.

1. **PR1 — Security headers & caching**
   - Apply the `vercel.json` policy (CSP + `/public/(.*)` caching) and confirm with `curl -I` against `/`, `/public/styles.css`, and `/api/check`.
   - Latest capture: `tinyutils/artifacts/pr1-security-cache/20251105/`.
2. **PR2 — Beta shell noindex + debug hook**
   - Ensure each beta HTML shell includes `<meta name="robots" content="noindex">` and the Dead Link Finder debug paragraph carries `data-testid="debug-scheduler"`.
   - Snippets/screenshots: `tinyutils/artifacts/pr2-ux-noindex-debug/20251105/`.
3. **PR3 — Preview fence**
   - Run `node scripts/preview_smoke.mjs` with `PREVIEW_URL`, `PREVIEW_SECRET`, `BYPASS_TOKEN` then capture the manual 401→200 flow.
   - Proof lives in `tinyutils/artifacts/pr3-fence/20251105/` (smoke, unauth/auth headers, cookie dump).
4. **PR4 — Regression tests**
   - Execute `pnpm install --silent && pnpm test` (Node ≥20) and stash logs to `tinyutils/artifacts/pr4-tests/<date>/`.
   - The suite covers API envelope contracts, CSV hardening, and Dead Link Finder invariants.

For every run, log outcomes via `python scripts/log_run_entry.py` and sync the shared checklist with `python scripts/add_task_checklist_entry.py`.
