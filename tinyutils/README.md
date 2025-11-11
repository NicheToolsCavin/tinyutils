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
   - Run `node scripts/smoke_convert_preview.mjs` with `PREVIEW_URL`, and (if fenced) a valid bypass header via `PREVIEW_FENCE_HEADER`. Capture the manual 401→200 flow.
   - Proof lives in `tinyutils/artifacts/pr3-fence/20251105/` (smoke, unauth/auth headers, cookie dump).
4. **PR4 — Regression tests**
- Execute `pnpm install --silent && pnpm test` (Node ≥20) and stash logs to `tinyutils/artifacts/pr4-tests/<date>/`.

## Python Backends (Preview)

- New FastAPI endpoints live under `/api/convert/` and `/api/findreplace/` for document conversion and regex find/replace previews.
- Responses follow structured manifests: `outputs[]` (name, size, blobUrl), `preview` snippets, `diffs[]`, and `errors[]` arrays for per-file notes.
- Key environment variables: `MAX_FILE_MB`, `MAX_BATCH_MB`, `PREVIEW_HEADINGS_N`, `PREVIEW_SNIPPETS_M`, `DIFF_TRUNCATE_KB`, and optional `BLOB_READ_WRITE_TOKEN` (fallbacks return `data:` URLs).
- Install Python deps with `pip install -r requirements.txt`; Pandoc binaries ship via `pypandoc-binary`.
   - The suite covers API envelope contracts, CSV hardening, and Dead Link Finder invariants.

### Vendored pandoc for serverless builds

Preview/serverless deployments cannot download binaries on-demand, so the convert backend now prefers:
1. `PYPANDOC_PANDOC` (manual override for local testing).
2. The vendored binary at `tinyutils/api/_vendor/pandoc/pandoc`.
3. A `pandoc` executable already on `PATH` (mainly developer laptops).

Run `python3 tinyutils/scripts/vendor_pandoc.py` whenever you refresh the vendored binary. The script fetches the Linux amd64 `pandoc 3.1.11.1` release, writes it to the path above with mode `0755`, and prints archive/binary SHA256s so we can capture the exact artifact in evidence logs.

For every run, log outcomes via `python scripts/log_run_entry.py` and sync the shared checklist with `python scripts/add_task_checklist_entry.py`.
