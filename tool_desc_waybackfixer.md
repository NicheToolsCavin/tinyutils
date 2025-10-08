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
