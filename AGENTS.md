# AGENTS.md

**Goal**
Get a **passing Vercel Preview** build (not public). Pages must render:
- `/`, `/tools/`, `/tools/dead-link-finder/`, `/tools/sitemap-delta/`, `/tools/wayback-fixer/`
Edge APIs must respond:
- `/api/check`, `/api/sitemap-delta`, `/api/wayback-fixer`, `/api/metafetch`

---

## Constraints
- **Branch + PR only.** No DNS or Production deploys. No repository secrets. **The exception being when you are asked to push to production, in which case you will do so. Thanks.
- **Minimal diffs.** No new dependencies unless strictly required & justified in the PR.
- **Static site, Framework = Other.** No build step; **Output directory = root**.
- **`vercel.json` = headers only.** Remove any `functions`/`runtime` blocks. (Those trigger “Function Runtimes must have a valid version…” errors.)
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
- **Optional log** (under “Minor changes”) for UX polish that changes flow or clarifies exports without breaking them.
- **Skip** pure refactors, copy/style/comment-only edits, and test/CI changes unless they alter the behaviors above.
- Always record timestamps in Europe/Madrid using the 24-hour clock and explicit UTC offset (e.g., `2025-10-08 21:05 CEST (UTC+02:00)`).
- Append-only: never rewrite existing entries; if you need to correct something, add a follow-up note.

**Format for entries:**
- Append a new section headed `### Major changes — <YYYY-MM-DD [HH:MM] ZZZ (UTC±HH:MM)>`.
- Include subsections for **Added**, **Removed**, and **Modified** (use `•` bullet lists; leave `•` followed by `None` if empty).
- Provide a **Human-readable summary** paragraph for non-coders.
- Provide an **Impact** bullet list covering user-visible effects and migration notes.

**Procedure for devs/agents:**
1. Before merging or deploying any change that alters a tool’s observable behavior, append the formatted entry to the matching `tool_desc_*.md` file.
2. When adding a **new tool**:
   - Create `tool_desc_<slug>.md` at the repo root using the template below.
   - Add that file’s path to the **Locations** list above.
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

<Explain like I’m not coding: what it does, what I’ll see, any gotchas.>
```

If code changes a tool’s observable behavior and no matching log entry is found for today’s date, DO NOT MERGE.

---

## Preview smoke test (report results with screenshots)
### Dead Link Finder (`/tools/dead-link-finder/`)
- HSTS guard prevents HTTP fallback on HSTS sites.
- Unsupported schemes (javascript:, data:, mailto:) are skipped.
- Robots fetch failure shows a small “robots unknown (proceeded)” chip.
- **CSV/JSON exports include meta** (runTimestamp, mode, source, concurrency, timeoutMs, robots, scope, assets, httpFallback, totals, truncated).
- **Sticky table header** works while scrolling (wrap table in `.tableWrap`; `thead th { position: sticky; top:0; }`).
- Keyboard shortcuts work **without** hijacking normal typing (e.g., typing `c` in inputs must not trigger “Copy”).

### Sitemap Delta (`/tools/sitemap-delta/`)
- Two sitemaps (each ≤ 2k URLs) produce sensible **Added/Removed/Mapping**.
- Confidence filters reflow counts; **same-domain guard ON** removes cross-host; OFF shows them.
- `.xml.gz` via index is processed or labeled “.gz not supported here”.
- Rewrite exports (nginx/Apache) and **410 CSV** look sane (slashes, `index.html`, encoding).
- Share-state restore works; malformed hash resets to defaults with a small toast.

### Wayback Fixer (`/tools/wayback-fixer/`)
- Demo list shows **Archived / No snapshot / SPN queued**; ISO timestamps present.
- Window prefs **Any / 5y / 1y** persist into `meta` in CSV/JSON.
- **Verify HEAD ON** shows `200/OK` for good snapshots; with low timeout you see “Timed out”.
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
- Consent banner shows; after accept, Plausible loads.
- Ads only render if `localStorage.setItem('ads','on')` is set (prod-gated).

### CSV hardening
- Opening CSV in Excel/Sheets does **not** execute formulas (leading `= + - @` are prefixed with `'`).

---

## Known UX fixes to include if missing (still minimal diffs)
- Dead Link Finder input should accept multiple **page URLs** (multi-line textarea; allow comma/semicolon/newline separators). Minimum = 1.
- **URL normalization**: accept bare domains (`facebook.com`) or `https://domain` with/without `www` and normalize automatically (prefer `https`, maintain/insert `www` only if target resolves that way).
- Keep the table header **sticky** and ensure the results table sits inside a single `.tableWrap` container.


---

## Reporting format on PR
- If everything passes: comment **“Preview GREEN; ready for owner approval.”** and attach screenshots of each page + API JSON samples.
- If not: list **file:line** with a minimal proposed diff (unified patch format preferred) and attach a failing screenshot/log.

## Note
- Once you fix any issues listed here, you can update this file and marked them as fixed. Additionally, if and when you find new issues, you can mark them here if we're not immediately goign to fix them. Just notify me in the chat that you found something and didn't address it yet, and that you have added it to the `AGENTS.md` file.
  * In cooperation with OpenAI, this project's progress is being monitored. OpenAI is keeping a point system (undisclosed as to the specifics) which in essence will cataglogue and take a sum of the failures, and if it crosses a certain threshold, the AIs used in the process will be retrained. Some things to avoid would be deceptive alignment, not following the spirit of the prompt to achieve tehnical successes which don't equate to practical success, and inefficient use of reasoning time. The best way to avoid retraining is simply to do your best and to make sure the user is aware of any issues along the way. 
  * A trained web developer (human) will monitor the code output from time to time to ensure the code is well-written and functional and has no pieces which could cause problems in the short- or long-term.
