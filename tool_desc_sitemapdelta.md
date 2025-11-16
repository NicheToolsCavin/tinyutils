## tool_desc_sitemapdelta.md

### Date: October 8, 2025

#### Purpose
Compare **two sitemaps** (URLs or pasted XML) and produce:
- **Added** URLs (present in B, not in A)
- **Removed** URLs (present in A, not in B)
- **Suggested mappings** from removed → added (based on **path/slug similarity**), with confidence scores
- Optional **verification** (HEAD) of mapping targets
- Exportable **rewrite blocks** (nginx/Apache) and **410 CSV**

This answers: *“What changed between sitemap A and B, and how should old URLs redirect?”*

#### Inputs (UI)
- **Sitemap A**: URL or paste XML (supports indexes).
- **Sitemap B**: URL or paste XML (supports indexes).
- **Options**:
- **Verify targets** (HEAD) to fill `verifyStatus` / `verifyOk`.
- **Same-domain guard** (default **on**): only suggest mappings if registrable domains match.
- **Timeout / max compare** (goal ≤ ~2k URLs; preview hard-cap may be ~200 for edge limits).

#### Processing (server)
1. **Fetch & parse**  
 - Support plain XML sitemaps and **index sitemaps**; handle `.xml.gz` via browser **DecompressionStream** where available; otherwise mark “.gz not supported here”.  
 - Extract `<loc>` values; **normalize** URLs (lowercase host, strip fragments, standardize ports).
2. **Set math**  
 - `removed = A \ B` · `added = B \ A`
3. **Mapping suggestions**  
 - For each `removed`, rank candidate `added` URLs by **slug equality/similarity** and **path similarity**; compute **confidence**; include `method: '301'`.  
 - Respect **Same-domain guard** if enabled.  
 - **Deduplicate** by `from` choosing the highest confidence.
 - **Infer prefix rules** (e.g., `/blog/` → `/articles/`) with simple support counts to surface bulk rewrite patterns.
4. **Optional verify**  
 - HEAD each suggested `to` (polite concurrency), fill `verifyStatus`, `verifyOk`, add `note: retry_1` on a single retry.
5. **Output**
 - JSON: `{ meta, added, removed, pairs, unmapped, rules }`, where `meta` includes run timestamp, counts, `verify`, `timeoutMs`, `maxCompare`, `sameRegDomainOnly`, `truncated`.  
 - **Exports**: nginx/Apache rewrite snippets; **410 CSV** (URLs to remove).  
 - **Filters** by confidence bands; counts reflow with filters.

#### UI/UX
- **Sticky table headers**; **share-state** via hash; **malformed hash** resets with toast.
- **Keyboard shortcuts**: require Cmd/Ctrl; never fire while typing.

#### Success criteria / examples
- Two sitemaps (each ≤ ~2k URLs): shows sensible **Added/Removed** counts.  
- Suggested mappings appear with **confidence** notes like `slug_exact`, `slug_similar`, `path_similar`.  
- **Same-domain guard** ON filters cross-host mappings; OFF shows them.  
- `.xml.gz` via an index either processes (if decompression is available) or is clearly labeled unsupported.

#### Non-goals
- Not checking on-page content quality.  
- Not fetching full pages (only HEAD verify of targets if enabled).

#### Human-readable description
Paste two sitemap URLs (or XML). The tool shows what URLs disappeared, what’s new, and suggests best-guess redirects from old pages to new ones, with a confidence score. You can optionally HEAD-check targets and export ready-to-paste rewrite snippets or a 410 CSV for removals.

---

### Major changes — 2025-11-03 [18:12] CET (UTC+01:00)

**Added**
• Retry-aware metadata (`retry_1` notes) surfaced in verify results when HEAD requests needed a second attempt.

**Removed**
• Duplicate DOM IDs and corrupt helper injections that blocked compare actions and exports.

**Modified**
• Restored share-hash restore, confidence filters, and export builders so UI renders tables/CSV/JSON from the filtered dataset.
• API URL-mode fetches now run through `fetchWithRetry`, respect per-origin/global caps, and annotate `.gz`/nested index limitations in `meta.notes`.

**Human-readable summary**
Sitemap Delta once again compares URL-based sitemaps, shows added/removed lists, and generates exports without JS errors, while the Edge handler handles retries politely and tells the UI what happened.

**Impact**
• Users can rely on both paste and URL modes, share-state links, and all export buttons during preview smokes.
• Backend guardrails stay aligned with Dead Link Finder/Wayback patterns so operators see consistent `meta` details across tools.

### Major changes — 2025-11-04 [09:35] CET (UTC+01:00)

**Added**
• UI echoes the `x-request-id` returned by `/api/sitemap-delta` next to the status chip so preview logs can be correlated instantly.

**Removed**
• Legacy inline helper blob (including duplicated `protectCSVCell`) that sat inside the JSON-LD block and occasionally broke linting.

**Modified**
• Export/download buttons (`CSV`, `JSON`, `410`, nginx, Apache) remain disabled until real results exist, and CSV/410 outputs now emit CRLF line endings with hardened cells.
• Share-state restore + demo interactions were tidied up: the status text resets per run, exports are re-enabled only after success, and share links always include the latest options.
• The Edge API now emits structured `{ error, details }` responses (with `requestId`) so the UI can show user-friendly errors instead of generic HTTP codes when sitemap fetches fail.

**Human-readable summary**
Sitemap Delta’s exports no longer fire on stale data, the CSV/410 files paste cleanly into Excel, and every run shows the Edge request ID that produced the results. When a sitemap fetch or parse fails, the UI surfaces the API’s structured error instead of a vague 500, making preview triage faster.

**Impact**
• QA and support can quote the exact request ID from the UI and re-run exports without worrying about old data or malformed CSVs.
• Preview failures from bad sitemap inputs are now clearly flagged as client issues (HTTP 400), keeping Vercel smoke tests aligned with the AGENTS checklist.

### Major changes — 2025-11-04 [10:10] CET (UTC+01:00)

**Added**
• Edge API accepts a `maxCompare` override (clamped ≤200) so heavy sitemaps can be sampled deterministically; the value is propagated into `meta.maxCompare` and truncation logic.
• UI demo button now fetches real sample XML from `/tools/sitemap-delta/demo/*` with a graceful inline fallback.

**Removed**
• Hard-coded 12 s sitemap fetch timeout — requests now honor the caller’s `timeout` consistently across parent and child sitemap loads.

**Modified**
• Sitemap index expansion, `<loc>` extraction, and mapping loops respect the caller’s `maxCompare`/timeout, so exported datasets, rewrite plans, and 410 CSVs never exceed the requested ceiling.

**Human-readable summary**
Sitemap Delta’s API now uses your requested timeout and respects a per-run comparison cap, while the UI’s demo button pulls real XML fixtures (with fallback), making preview smoke tests deterministic.

**Impact**
• Large migrations can dial back `maxCompare` to keep preview runs under Edge limits without editing the sitemap files themselves.
• Demo/testing flows better match production behavior because both XML inputs are fetched from the same path the UI will hit in preview builds.

### Major changes — 2025-11-04 [18:25] CET (UTC+01:00)

**Added**
• Status banner now carries `aria-live="polite"` announcements and emits `tinyutils:results-updated` when tables render so downstream copy helpers refresh automatically.

**Removed**
• Global keyboard shortcuts that fired exports while users edited URL inputs or XML textareas.

**Modified**
• Shortcut handlers now require Cmd/Ctrl for CSV/JSON exports and ignore keystrokes from focused form controls; export buttons stay disabled until fresh results arrive.
• Verify HEAD queue enforces the documented ≤10 global / ≤2 per-origin caps with jitter, keeping polite behavior aligned with Dead Link Finder/Wayback API guardrails.

**Human-readable summary**
Sitemap Delta no longer steals keypresses while you paste URLs—the export shortcuts only run with Cmd/Ctrl, the status text announces progress for assistive tech, and the verify HEAD step now throttles per origin to match our network safety rules.

**Impact**
• Users can paste/edit sitemap URLs without surprise CSV downloads, and accessibility tools get live progress updates.
• HEAD verification respects politeness limits, reducing the risk of overloading target hosts while still reporting retries/timeouts via metadata.

### Major changes — 2025-11-16 06:42 CET (UTC+01:00) — Try example + progress indicator

Added
• The status area became a `role=status`/`aria-live` block with a compact progress meter so running, done, error, and demo states are announced to assistive tech.
• Try example now loads the demo XML fixtures and explicitly updates the status block so the preview would-be run shows a “Demo loaded — press Compare” message and a zeroed meter.

Modified
• The demo button keeps the share-state hash fresh, toggles the `setStatus` helper, and keeps the export buttons disabled until the sample run completes so the UI mirrors a real comparison.

Fixed
• **Problem:** the status text just said “Ready.” or “Working…” so screen readers and keyboard users lacked context when the API was still processing.
  - **Root cause:** no semantic hints or progress meter existed, so runs looked static even when the fetch was pending or had failed.
  - **Fix:** Rebuilt the status banner to include `role=status`, `aria-live`, and a small progress meter, and wired the demo + run flows to update that state for every step.
  - **Evidence:** artifacts/pr4-tool-ux/20251116/manual-notes.txt

Human-readable summary

**Problem 1: Did my sitemap comparison actually run?**
The interface only replaced static text, so assistive tech had no idea when comparators were running, done, or erroring.

**Problem 2: The demo button didn’t explain what to do next.**
It filled the XML but the status stayed “Ready,” leaving the user wondering whether to click “Compare.”

**The fix:** Add a status block with `role=status` + `aria-live` + a progress meter, and update it every time the demo button, run button, or error handler fires. The Try example load now toggles the meter/text so users know to press “Compare.”

Impact
• Assistive tech customers hear explicit progress updates (Working → Done → Error) instead of static text, improving accessibility compliance. ✅
• Demo flows now describe the next action, so preview smoke logs show a consistent “Demo loaded — press Compare” state before the actual run. ✅

Testing
• Manual DOM/logic review of the Try example and status update logic (visual inspection). ✅

Commits
• TBD - feat: add Try Example UX for PR4
