# Dead Link Finder — Feature Log

## 2025-10-12 — P1 polish: robots status normalization, debug mode, hardened exports & copy UX; server caps
- **Human notes:** Responses now report request IDs and consistent robots status messaging, the page shows a collapsible debug block when `?debug=1`, exports (CSV/JSON/keyboard copy) are hardened with better filenames, and the copy status button includes the run ID.
- **Dev notes:** Updated `api/check.js` (robots normalization, concurrency cap, request header), refreshed `tools/dead-link-finder/index.html` (debug UI, exports, shortcuts), added this log entry.
- **Risk:** Medium — touches critical API flow and front-end export logic; regression tests rely on manual verification.
- **Revert plan:** Revert the commit (`git revert <sha>`) to restore prior API/UI behaviour and remove this log entry.

## [2025-10-12] Change: Expose scheduler metrics in /api/check (DLF)

**Branch/Ticket:** feat/dlf-scheduler-metrics
**Reason:** Verify polite concurrency in production and catch regressions quickly.

### Human notes
- DLF now returns a `meta.scheduler` block after each run:
  - `globalCap`, `perOriginCap`
  - `globalMaxInFlightObserved`
  - `perOriginMaxObserved` (map of origin → max in-flight)
- Visible in the debug drawer when visiting `?debug=1` on the DLF page.

### Dev notes
- Touched `api/check.js` to instrument counters around the global + per-origin semaphore scheduler.
- (Optional) `tools/dead-link-finder/index.html` debug panel renders `meta.scheduler` when present.
- No change to export schemas; status line unchanged.
- No new dependencies.

### Impact / Risk
- Low. Purely additive meta fields; no behavioral change to request flow.

### Revert plan
- `git revert <sha>` of this commit.

### Major changes — 2025-10-20 20:24 CEST (UTC+02:00)
**Added**
• `/api/check` now accepts legacy payload keys (`url`, `pages`) alongside `pageUrl`, auto-canonicalising to keep historic clients working.
• Every JSON response includes `meta.scheduler` with the active caps and observed concurrency; the debug drawer surfaces a one-line summary when `?debug=1`.

**Removed**
• None

**Modified**
• Politeness scheduler enforces the existing global/per-origin caps with jitter while tracking maxima, and the API returns a warning if both `pageUrl` and `url` disagree.

**Human-readable summary**
Older integrations can keep sending `url` or `pages` and still get a crawl, and the API now reports exactly how many concurrent checks ran (globally and per origin). Flip on `?debug=1` and you’ll see those caps right in the UI.

**Impact**
• API callers receive `meta.scheduler` and should ignore or log it as needed; existing success/error envelopes remain JSON-compatible.
• If both `pageUrl` and `url` are supplied, the request still runs but a warning is returned so clients can tidy their payloads.
• No schema changes to exports or CLI tooling; only additive meta/compatibility tweaks.
