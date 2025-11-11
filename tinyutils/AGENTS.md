# AGENTS.md

**Goal**
Keep the TinyUtils preview (the auto-generated Vercel preview URL shown after each deploy) green and ready to promote while production (`https://tinyutils.net`) stays stable. Public tools must load without secrets, preview-fenced betas must require `PREVIEW_SECRET`, and all Edge APIs should return valid JSON envelopes with request IDs.

**Environments**
- **Production:** https://tinyutils.net (public)
- **Preview:** auto-generated Vercel preview URL (beta tools 401 until authenticated)
- **Local dev:** Node 20.x, pnpm available, static build (no bundler). Use `workspace-write` sandbox rules from this repo.

---

## Constraints
- **Branch + PR only.** Do not push straight to `main` unless explicitly told to ship to production.

- **Minimal diffs.** Keep changes scoped; no new dependencies unless absolutely required and justified in the PR.

- **Static export.** Framework preset “Other”, no build command, output directory `/`.

 - **Vercel bundle size.** Serverless uploads must stay under the 100 MB per-file limit. Large assets (pandoc binary, artifacts, tests) are excluded via `vercel.json`; avoid reintroducing new large files into deploy bundles without updating the excludes.

  

- **Edge functions = ESM.** `package.json` must keep `{ "type": "module" }`; never use `require()` or top-level `await`. Handler logic stays inside the default export, with `{ runtime: 'edge' }` and JSON `Response` objects.

- **Secrets (single, authoritative).**
  - Never commit secrets. Keep local-only values in `.env.local` (gitignored). Production/preview values live in Vercel project env vars.
  - Do not expose secrets to the client. Serverless functions mint short‑lived signed URLs/tokens.
  - Required envs: `PREVIEW_SECRET` (fence), `BYPASS_TOKEN` (optional internal bypass), `VERCEL_TOKEN` (CLI if needed), `BLOB_READ_WRITE_TOKEN` (Vercel Blob; serverless only).
  - If a secret leaks, rotate it in Vercel and replace your local file.


- **Serverless APIs (Python/Node) are allowed** for heavy jobs. These are configured in `vercel.json` via `functions` + `routes`. The **Edge functions = ESM** rule applies only to existing Edge endpoints listed below.

---

## File / Route Checklist
- [ ] **Public pages**
  - [ ] `/index.html`
  - [ ] `/tools/index.html`
  - [ ] `/privacy.html`, `/terms.html`, `/support.html`, `/feedback.html`
  - [ ] `/guides/index.html` plus article shells under `/guides/`
  - [ ]  `/docx-to-markdown` (SEO lander; routes into the converter UI)
  - `/odt-to-markdown`, `/html-to-markdown`, `/markdown-to-docx`

- [ ] **Public tools**
  - [ ] `/tools/dead-link-finder/index.html`
  - [ ] `/tools/sitemap-delta/index.html`
  - [ ] `/tools/wayback-fixer/index.html`
  - [ ]  `/tools/convert.html` (Universal Converter UI shell)

- [ ] **Preview-fenced betas** (serve 401 until `PREVIEW_SECRET` accepted)
  - [ ] `/tools/keyword-density.html`
  - [ ] `/tools/meta-preview.html`
  - [ ] `/tools/sitemap-generator.html`
  - [  ] /tools/find-replace.html` (Find & Replace UI shell)
  -  [ ] vercel.json defines serverless function runtimes/routes for /api/convert and /api/findreplace/*

- [ ] **APIs**

  - [ ] `/api/check.js`
  - [ ] `/api/sitemap-delta.js`
  - [ ] `/api/wayback-fixer.js`
  - [ ] `/api/metafetch.js`
  - [ ] `/api/fence.js`
  - [ ] `/api/health.js`

-  **Serverless APIs (Python)**

  -  `/api/convert/index.py`

  -  `/api/findreplace/preview.py`

  -  `/api/findreplace/apply.py`

    > [!NOTE]
    >
    > Serverless APIs must return JSON envelopes with request IDs and Blob URLs to outputs; large artifacts are never inlined in responses.

    

- [ ] **Assets & config**
  - [ ] `/public/favicon.ico`
  - [ ] `/public/og.png` (≤ 200 KB)
  - [ ] `/public/styles.css` mirrors current design tokens
  - [ ] `/styles/site.css` matches the marketing shell
  - [ ] `/scripts/consent.js` stays aligned with production consent UX
  - [ ] `/robots.txt` references `/sitemap.xml`
  - [ ] `/sitemap.xml` lists `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`
  - [ ] `/package.json` retains `"type": "module"`
  - [ ] Keep fallback copies in `/public/` (`index.html`, `tools/index.html`, `guides/*`) when editing content
  - [ ]  **`vercel.json`** may define `functions` (Python runtime + `maxDuration`) and `routes` for `/api/convert` and `/api/findreplace/*`. (This supersedes any prior “headers/rewrites only” guidance.)
  - [ ] vercel.json defines serverless function runtimes/routes for /api/convert and /api/findreplace/*

- [ ] 

---

## Hardening Rules (Edge APIs)
- **Network safety:** Restrict outbound fetches to `http(s)`; block private/loopback hosts (`localhost`, `127.*`, `10.*`, `172.16–31.*`, `192.168.*`, `.local`, IPv6 RFC4193/link-local).
- **Concurrency caps:** Global ≤10, per-origin ≤2. Dead Link Finder additionally limits to 200 URLs/run, 5 redirects, 16 sitemap fetches.
- **HSTS guard:** HTTPS→HTTP fallback stays disabled for HSTS or guarded TLDs (`.gov/.mil/.bank/.edu`).
- **Retries & timeouts:** Wrap fetches with `AbortSignal.timeout(...)`; retry once on `429` or `>=500` with jitter and annotate notes (e.g., `retry_1`).
- **CSV hardening:** Prefix cells that start with `=`, `+`, `-`, `@` with `'` before exporting.
- **Responses:** Always return JSON with `content-type: application/json; charset=utf-8`, include `cache-control: no-store`, and set `x-request-id`.

### API payload keys
| Request key | Notes |
| --- | --- |
| `pageUrl` | Canonical input for Dead Link Finder; auto-normalised. |
| `url` | Legacy alias that maps to `pageUrl`. |
| `pages` | Optional textarea input; first entry still seeds `pageUrl`. |

---

## Preview Fence (PR3)
- `api/fence.js` expects `PREVIEW_SECRET`. Visitors hit 401 until they present it via `?preview_secret=` or header `x-preview-secret`.
- Successful auth sets `tu_preview_secret` (HttpOnly, SameSite=Lax) scoped to `/tools/` for 24h. Subsequent requests forward with `x-preview-fence-bypass: 1`.
- Vercel rewrites (`vercel.json`) route `/tools/<beta>` to the fence unless `preview_fence_proxy=1` is already present.
- Evidence path: `tinyutils/artifacts/pr3-fence/<YYYYMMDD>/` with smoke logs + 401/200 curl headers + cookie jar.
- **Vercel Blob** credentials (read/write). Do not embed in client; serverless functions sign uploads/links.
- Keep using `PREVIEW_SECRET` for beta fences; converter/find-replace endpoints must accept the fence header/cookie.

### Quick curl
```bash
export PREVIEW=<auto-generated-preview-url>
curl -I "$PREVIEW/tools/keyword-density"                   # 401 preview_required
curl -c cookies.txt "$PREVIEW/api/fence?preview_secret=$PREVIEW_SECRET&target=/tools/keyword-density"
curl -b cookies.txt -I "$PREVIEW/tools/keyword-density"    # 200 OK
```

---

## Tool Descriptions & Change Logs
- Keep behaviour specs synced in:
  - `tool_desc_deadlinkfinder.md`
  - `tool_desc_sitemapdelta.md`
  - `tool_desc_waybackfixer.md`
- Append-only updates using Europe/Madrid timestamps (`YYYY-MM-DD HH:MM ZZZ (UTC±HH:MM)`).
- Format: sections for **Added / Removed / Modified**, plus **Human-readable summary** and **Impact** bullets. Use bullet `•`; leave `• None` when empty.
- Any user-visible change (inputs, outputs, network flow, guard rails, defaults) requires a logged entry the same day. No retroactive edits—add corrections as follow-ups.

---

## Serverless APIs (Converter & Find/Replace)

These endpoints are Python/Node **serverless** (not Edge). They process files via `/api/convert` and `/api/findreplace/*` and store artifacts in Vercel Blob.

### Limits & Safety
- Per-file cap: **≤ 100 MB**; batch cap: **≤ 1 GB** (ZIP allowed).
- Reject password-protected DOCX with a clear JSON error.
- Work in ephemeral `/tmp`; delete temp files individually as needed (no `rm -rf`).
- Treat unknown/binary files as errors unless `force=true`.
- Timeouts: respect function `maxDuration`; fail a single file, continue the batch.
- **Outputs are never inlined** in HTTP responses. Upload results to Blob and return URLs.

### Response Contract
- Always JSON: `content-type: application/json; charset=utf-8`
- `cache-control: no-store`
- `x-request-id` header returned (and echoed in body)
- Body includes:
  - `toolVersions`, `logs[]`, `errors[]`
  - `outputs[]` with `{ name, size, blobUrl }`
  - `preview` (snippets, image manifest) for pre-run screens

### Routing & Config
- `vercel.json` may define `functions` (Python runtime + `maxDuration`) and `routes` for:
  - `/api/convert` → `api/convert/index.py`
  - `/api/findreplace/preview` → `api/findreplace/preview.py`
  - `/api/findreplace/apply` → `api/findreplace/apply.py`
- Large artifacts *must* go to Blob; responses should remain small.

### Preview Fence
- If a tool is in beta, HTML shells at `/tools/convert` and `/tools/find-replace` are gated by `PREVIEW_SECRET` (same fence flow as other betas).
- Public SEO landers (e.g., `/docx-to-markdown`) may be open but **must not** trigger conversion unless fence cookie/token is present.

---

## Backup & Recovery
- `./scripts/backup_repo.sh` writes timestamped tarballs to `~/dev/TinyBackups` (default), pruning to the latest 14 unless `KEEP_COUNT` is set. Pass a custom directory to change the target.
- Automate with `launchd`/`cron` as described in `docs/BACKUP.md`, and mirror the backup folder to cloud storage (restic/borg) for Time Machine-style history.
- An event-driven `launchd` watcher template lives in `launchd/com.tinyutils.backup.watch.plist` (fires on repo changes, honours `MIN_INTERVAL_SECONDS=600` + `SKIP_IF_CLEAN=1`).
- Use `~/dev/TinyBackups/scripts/restic_push.sh` with the LaunchAgent template in the same folder to ship archives to your restic repository; populate `~/dev/TinyBackups/scripts/restic.env` with the necessary `export RESTIC_*` credentials (instructions in `docs/BACKUP.md`).
- `.env.local` is captured by the backup script; guard it carefully since it contains Vercel tokens and preview secrets.

---

## Automation & Evidence
All tasks should be logged before completion.

- Authoritative instructions live in `AGENTS.md`. The `docs/AGENT_TASK_CHECKLIST.md` is a tracker only (statuses, evidence pointers), not a policy or instruction source.
- Log progress: `python scripts/log_run_entry.py --help` → appends to `docs/AGENT_RUN_LOG.md` and mirrors to `~/dev/TinyBackups/log_mirror/`.
- Maintain tasks: `python scripts/add_task_checklist_entry.py` updates the checklist (status, plan updates, evidence paths).
- Store artefacts under `artifacts/<task>/<YYYYMMDD>/` (curl outputs, screenshots, HARs). Reference these in run logs and PR notes.
- Smoke helpers: `node scripts/smoke_convert_preview.mjs` (converter), `pnpm smoke:preview`, `pnpm smoke:extras`, `node scripts/ui_smoke_{dlf|sitemap|wayback}.mjs`.
- Tests: `pnpm install --silent && pnpm test` (Node 20).
- Converter evidence: `artifacts/convert/<YYYYMMDD>/`. Find/replace evidence: `artifacts/findreplace/<YYYYMMDD>/`.

---

## Agent Roster (2025-11-06)
** Use .code/agents/roster.json and make sure it stays updated. If a session is new then the roster should be cleared and re-tested. **

- **Re-check cadence:** review the bench every 10 minutes.. Document any unbench/reenable actions in `docs/AGENT_RUN_LOG.md` and update `.code/agents/roster.json` plus this section when statuses change.
- **Reset after tasks:** whenever a task that required a temporary roster adjustment is completed or canceled, immediately restore the default roster in `.code/agents/roster.json`, mirror the reset here, and log the action in `docs/AGENT_RUN_LOG.md`.
- **Usage-based reactivation:** consult the harness usage output (`~/dev/CodeProjects/code_config_hacks/.code/usage/*` or the latest agent status logs) to determine the correct cool-down interval per agent. Schedule the next check accordingly and reassign the agent as soon as the usage window clears, recording the reset in the run log and roster files.

> Bench removal policy: only reinstate once the blocking reason expires (timeout cleared, quota restored, billing OK). Record the reason + timestamp in the run log when adjusting.

---

## Manual Preview Smoke (Public tools)
### Dead Link Finder (`/tools/dead-link-finder/`)
- HSTS guard prevents HTTPS→HTTP downgrade when fallback toggle is ON.
- Unsupported schemes (`javascript:`, `data:`, `mailto:`) are skipped with notes.
- Robots fetch failure surfaces "robots unknown (proceeded)" chip.
- Exports (CSV/JSON/copy) include meta: `runTimestamp`, `mode`, `source`, `concurrency`, `timeoutMs`, `robots`, `scope`, `assets`, `httpFallback`, `totals`, `truncated`.
- Results table sits in `.tableWrap` with sticky `thead`.
- Keyboard shortcuts avoid interfering with text inputs (typing `c` inside a field must not trigger copy).

### Sitemap Delta (`/tools/sitemap-delta/`)
- Compare two sitemaps ≤2k URLs each; Added/Removed/Mapping counts update immediately.
- Same-domain guard ON hides cross-host pairs; toggling OFF reveals them.
- `.xml.gz` through sitemap index is handled or shows `gz_not_supported` note.
- Rewrite exports (nginx/Apache) and 410 CSV keep slashes + UTF-8 intact.
- Share-state restore respects hashes; malformed fragments reset to defaults with a toast.

### Wayback Fixer (`/tools/wayback-fixer/`)
- Demo list shows statuses `Archived / No snapshot / SPN queued` with ISO timestamps.
- Window preferences (Any/5y/1y) persist into exported `meta`.
- Verify HEAD ON displays `200 OK`; low timeouts return `Timed out`.
- SPN queue caps at ≤10 per run; notes include `no_snapshot|spn_queued`.
- CSV headers stay exact:
  - Replacements: `source_url,replacement_url,snapshot_date_iso,verify_status,note`
  - 410: `url_to_remove,reason`
- Guards block localhost/RFC1918/file:/javascript: URLs.

### A11y & Keyboard
- Visible focus outlines, `aria-live="polite"` progress updates.
- Shortcuts: ⌘/Ctrl+Enter triggers run; `F` focuses filter; `E`/`J` open export modals.

### Consent / Analytics / Ads
- Consent banner appears for EU heuristics; only after **Accept** does Plausible load.
- Ads render only when manually toggled (`localStorage.setItem('ads','on')`).

### CSV Hardening
- Opening exports in Excel/Sheets never executes formulas (dangerous prefixes are quoted).

### Preview Fence (beta shells)
- Without secret: `curl -I /tools/keyword-density` → 401 JSON `preview_required`.
- With secret: `api/fence?preview_secret=…` sets `tu_preview_secret`; subsequent page loads return 200 with HTML.

# Converter (preview-fenced)
curl -I "$PREVIEW/tools/convert"                     # 401 until fenced
curl -b cookies.txt -I "$PREVIEW/tools/convert"      # 200 after /api/fence

# Find & Replace (preview-fenced)
curl -I "$PREVIEW/tools/find-replace"                # 401 until fenced

# API contracts (JSON envelopes with request-id)
curl -s "$PREVIEW/api/convert" | jq '.requestId'
curl -s "$PREVIEW/api/findreplace/health" | jq '.ok'

---

## PR Tracks (keep evidence current)
**UPDATE THIS AS YOU GO**

---

## Reporting & Coordination
- Before coding: skim latest `docs/AGENT_RUN_LOG.md` + `docs/AGENT_TASK_CHECKLIST.md` for hand-offs.
- When you finish a task: log it, update checklist status, and move items to Completed with evidence pointers.
- PR comment format: if all checks pass, reply **"Preview GREEN; ready for owner approval."** with screenshots of each public tool + API JSON sample.
- If something fails, list `file:line` with a minimal proposed diff and attach failing logs/screenshots instead.

---

## Known UX Invariants
- Dead Link Finder input accepts multi-line page URLs (newline/comma/semicolon separated) and auto-normalises bare domains to `https://`.
- Results tables keep headers sticky and constrained inside `.tableWrap`.
- Share-state hashes should never break page load; fall back gracefully.

---

## Preview Status — 2025-11-05
- **Completed:** PR1 headers + caching, PR2 beta noindex/debug tag, PR3 preview fence evidence, PR4 regression suite (logs in `artifacts/pr4-tests/20251105/`).
- **Current posture:** Preview fence requires `PREVIEW_SECRET`; latest smoke (2025-11-05) is green with stored 401→200 captures.
- **Next steps:** When secrets rotate or new betas land, rerun `scripts/smoke_convert_preview.mjs`, refresh curl headers, and append run-log/checklist entries.
- ** COMPLETED PR4** Now on to building the new tools.

---

# Safety
- Never run `rm -rf`. Remove files deliberately (`rm path/to/file`) only when explicitly required.
- Flag unexpected repository changes you didn’t make before continuing.
- Treat production (`tinyutils.net`) as live: no DNS or deploy changes without owner approval.
