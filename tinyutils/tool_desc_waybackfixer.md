## tool_desc_waybackfixer.md

### Date: October 8, 2025

#### Purpose
Given a list of **problem URLs**, find the **best Internet Archive (Wayback Machine) snapshots** and produce:
- A **Replacements CSV** mapping `source_url` → `replacement_url` (snapshot) with timestamp and verify status
- A **410 CSV** for URLs that have **no suitable snapshot**
- Optional **Save Page Now (SPN)** enqueue (rate-limited) for missing pages
- Filterable chips: **Archived / No snapshot / SPN queued**
- Lightweight **verify** (HEAD) of snapshot URLs

This answers: *“If these URLs are dead, what can we replace them with (or should we 410)?”*

#### Inputs (UI)
- **List of URLs** (textarea; ignores lines starting with `#` or `//`).  
(A demo list is available for quick testing.)
- **Window preference**: **Any / 5y / 1y** — choose how recent a snapshot should be.
- **Options**:
- **Verify snapshots** (HEAD) to confirm 200/OK.
- **Save Page Now (SPN)** (enqueue up to **≤10/run**) for pages without snapshots.
- **Timeout** (safe cap), **polite concurrency**.
- **Guards**: block **localhost/RFC1918**, `file:`, `javascript:` schemes.

#### Processing (server)
1. **Normalize & guard** each input URL (as in DLF: scheme coercion, block private hosts, strip fragments).
2. **Query Wayback** for each URL within the selected **window**.  
 - Classify: **Archived** (best snapshot), **No snapshot**, **SPN queued** (if SPN enabled).  
 - Record **ISO timestamp** of chosen snapshot (e.g., `2024-11-03T12:34:56Z`).
3. **Optional verify**  
 - HEAD the **snapshot URL** to get `verifyStatus` / `verifyOk`.  
 - A deliberately **low timeout** should produce a visible `note: timed_out` during smoke tests.
4. **Decide outputs**  
 - If a good snapshot exists → include in **Replacements CSV**.  
 - If not → include in **410 CSV** with a human-readable `reason` (e.g., `no_snapshot` or `spn_queued`).

#### Output
- **Replacements CSV header**:  
`source_url,replacement_url,snapshot_date_iso,verify_status,note`
- **410 CSV header**:  
`url_to_remove,reason`
- JSON export includes a `meta` block with `runTimestamp`, `window` (Any/5y/1y), and verify settings.

#### UI/UX
- Status **chips**: Archived / No snapshot / SPN queued; filters toggle visibility and reflow counts.
- **Sticky table header**; **keyboard shortcuts** require Cmd/Ctrl and never hijack typing.  
- **CSV hardening**: prefix cells starting with `= + - @` with `'`.

#### Human-readable description
Paste a list of broken/retired URLs. The tool looks up the best Wayback snapshot for each and gives you a CSV mapping from the dead URL to a snapshot. If there’s no snapshot, it files that URL for removal (410 CSV). You can optionally verify snapshots and even queue new saves (up to 10 per run).

---

### Major changes — 2025-11-03 [18:05] CET (UTC+01:00)

**Added**
• Concurrency and retry metadata (`network.retries`, `concurrency.*`, `spnLimit`) emitted in the API response so exports reflect guardrails.

**Removed**
• Duplicate `protectCSVCell` helper that previously polluted the UI script and broke event wiring.

**Modified**
• Rebuilt front-end run/ export flow to gate actions until results exist, rewire demo buttons, and keep spreadsheet-safe CSV/JSON generation.
• Hardened `/api/wayback-fixer` with `fetchWithRetry`, per-origin jitter, SPN ≤10 cap enforcement, and richer note handling (`retry_1`, `timeout`).

**Human-readable summary**
The Wayback Fixer page now starts the request reliably, re-enables demos and exports only after real results, and the API tracks polite concurrency plus retries so the UI can show precise status badges.

**Impact**
• Users see accurate counts/status chips again and can download CSV/JSON without syntax errors.
• API consumers gain visibility into retry behavior and enforced caps, matching the documented guardrails without extra parsing changes.

### Major changes — 2025-11-04 [09:30] CET (UTC+01:00)

**Added**
• UI now echoes the `x-request-id` next to the status chip and dispatches a `tinyutils:results-updated` event after every render so copy buttons rehydrate reliably.
• The demo button fetches `/tools/wayback-fixer/demo/demo-urls.txt`, showing the real dataset (with graceful fallback) instead of a hard-coded list.

**Removed**
• Duplicate helper block (including the unused `pickDLFColumn`) that previously sat outside the main script and could drift out of sync.

**Modified**
• All CSV/410 exports use CRLF line endings and remain disabled until a successful run completes; the helpers (protectCSVCell, enhanceCopyButtons, withRequestIdEcho) now live inside the main script, keeping the JSON-LD block pure JSON.
• Running a job clears prior status artifacts, waits for `withRequestIdEcho(res)` before re-enabling exports, and emits `tinyutils:results-updated` with the latest totals for downstream listeners.

**Human-readable summary**
The Wayback Fixer page now keeps its helper code in one place, fetches the real demo list, and shows the request ID that came back from the Edge API. Exports are disabled until actual results render and the CSV/410 downloads use Windows-friendly line endings, so QA can copy/paste outputs without stale data or spreadsheet warnings.

**Impact**
• Operators can quote the request ID directly from the UI when debugging preview runs, speeding up support loops.
• Exports/copy buttons no longer act on stale data, and the downloaded files paste cleanly into Excel/Sheets because they always include CRLF terminators and hardened cells.

### Major changes — 2025-11-04 [10:05] CET (UTC+01:00)

**Added**
• Edge handler now issues a `requestId` per run (mirroring `/api/check`) and echoes it via `x-request-id` headers plus `meta.requestId` in the JSON payload.

**Removed**
• Ad-hoc response builders that omitted headers/IDs on 405/500 paths.

**Modified**
• All success/error responses flow through shared `json()/jerr()` helpers so support tooling can correlate UI request IDs with Edge Logs.

**Human-readable summary**
Every Wayback Fixer API response now exposes a request ID in both the body and the HTTP headers, making it trivial to line up UI runs with Edge traces.

**Impact**
• Support can ask users for the on-screen request ID and plug it straight into logs without guessing.
• Monitoring tools no longer see “header-less” 405/500 replies, keeping observability consistent with the other APIs.

### Major changes — 2025-11-04 [18:20] CET (UTC+01:00)

**Added**
• Status banner now exposes `aria-live="polite"` updates and emits the `tinyutils:results-updated` event after every render so clipboard helpers stay hydrated.

**Removed**
• Global keyboard shortcuts firing while users typed in textareas/inputs; exports remain disabled until the latest results finish rendering.

**Modified**
• Shortcut handling now requires Cmd/Ctrl for CSV/JSON actions and ignores keystrokes when focus is inside a form control, while exports/copy buttons only enable after fresh results load (and re-disable on retry).

**Human-readable summary**
Wayback Fixer no longer hijacks typing—keyboard shortcuts only trigger with Cmd/Ctrl and only after the latest results render, while the status area announces progress for assistive tech and keeps copy buttons synced.

**Impact**
• Spreadsheet-style shortcuts work without breaking text entry, improving UX for long URL lists.
• Assistive tech users hear progress updates, and exports always reflect the newest crawl output.
