## tool_desc_deadlinkfinder.md

### Date: October 8, 2025

#### Purpose
Given **one page URL**, fetch that page, **extract every link on that page**, and **check each extracted link** for HTTP status and redirects. It answers: *“Are there any broken or problematic links on this page?”*  
(We later added an **Advanced** “Pages list” mode that directly checks a pasted list of URLs, but the **default** is single-page crawl.)

#### Inputs (UI)
- **Page URL** (single field). Accept *loose* inputs:
- `facebook.com`, `//example.com/path`, `https://example.com` (no forced `www`).
- **Scope**:
- **Internal only** → only links whose **registrable domain** matches the page’s (same eTLD+1, e.g., `example.co.uk` and `blog.example.co.uk`).
- **All links on page** → internal + external.
- **Options**:
- **Include assets** (optional): also extract `<img src>`, `<script src>`, `<link href>`.
- **Try HEAD before GET** (default **on**): use HEAD first, then GET if needed.
- **Retry HTTP if HTTPS fails** (default **off**): try `http://` only if `https://` failed **and** site isn’t guarded by HSTS/“hard TLD”.
- **Respect robots** (default **on** for crawling the page HTML).
- **Timeout / Concurrency** (safe caps).

#### Processing (server)
1. **Normalize & guard**  
 - Coerce to `https://` if missing scheme; resolve `//host` → `https://host`.  
 - Block **private/loopback hosts** and **unsupported schemes** (`javascript:`, `data:`, `mailto:`).  
 - Strip fragments; cap URL length; record an **X-Request-ID** for logs/diagnostics.
2. **Fetch the page** (GET, with user-agent & timeout). If robots cannot be fetched, show a *“robots unknown”* chip in meta.
3. **Extract targets**  
 - Parse anchors (+ assets if enabled), resolve relatives to absolute, **dedupe**, respect **scope**, **cap** to ~200 links for preview.
4. **Check each target**  
 - Request flow: **HEAD → GET**; follow redirects (≤5).  
 - Retry once on **429/5xx**; if enabled and safe (no HSTS/“hard TLD”), attempt **HTTP fallback** and mark `note: http_fallback_used`.  
 - Special notes: `unsupported_scheme`, `blocked_private_host`, `bad_redirect`, `redirect_loop`, `gone` (410).
5. **Output**  
 - **Table columns**: `# | URL | Status | OK? | Final URL | Wayback | Replaced | Note | Chain`.  
 - **CSV/JSON exports** include a `meta` block (timestamp, mode, scope, robots, assets, concurrency, timeout, totals).  
 - **CSV hardening**: prefix cells starting with `= + - @` with `'` to prevent formula injection.

#### UI/UX
- **Sticky table header** while scrolling.
- **Keyboard shortcuts**: **require Cmd/Ctrl** and **never fire while typing** in inputs/textarea.  
- Cmd/Ctrl+Enter = Run · Cmd/Ctrl+E = Export CSV · Cmd/Ctrl+C = Copy CSV
- Share-state (optional): restore settings via hash; malformed hash resets with a toast.

#### Success criteria / examples
- Paste `facebook.com` → tool coerces to `https://facebook.com` and crawls the page; it lists links found **on that page** and their statuses.  
- If HTTPS fails and HSTS is **not** present, HTTP fallback may be attempted; otherwise `note: hsts` / `tld_guard`.

#### Non-goals
- Not a whole-site crawler (only the single page unless user provides a list in Advanced mode).
- Not a sitemap comparison tool (that’s **Sitemap Delta**).

#### Human-readable description
Type or paste one page URL. The tool opens that page, grabs every link it finds (optionally image/script/style assets), and pings each one to see whether it’s alive, redirected, or broken. You get a table you can sort/filter and export. Use “Internal only” to focus on your own domain; flip to “All links” to also check outbound links. If HTTPS fails and the site allows it, it can try HTTP once (marked in “Note”).

---

### Major changes — 2025-10-08 21:05 CEST (UTC+02:00)

**Added**
• Request telemetry (`requestId`, `stage`) returned by the API and surfaced alongside results in the UI meta line.
• Client-side abort guard (40 s) to stop long-running checks from leaving the UI stuck on “Running…”.

**Removed**
• None

**Modified**
• Edge API now emits JSON for every outcome with structured error codes, stage breadcrumbs, and consistent telemetry metadata.
• Robots.txt handling uses safe globbing, downgrades gracefully on parse/fetch issues (`robotsStatus` set to `unknown`), and enforces stricter 15 s page / 8 s link timeouts.
• Front-end inspects `content-type`, reads `rows` instead of `results`, and shows readable error prompts including request IDs and stages.

**Human-readable summary**
Errors now come back as tidy JSON with the same telemetry as successful runs, robots parsing can’t crash the checker, and the UI times out politely while showing you the request ID + stage for every run. If something goes wrong you get a clear message instead of a stuck spinner.

**Impact**
• API consumers must read `rows` + `meta` and check `ok` instead of assuming success payloads.
• Any integrations relying on plain-text errors need to handle structured JSON responses (with request IDs and stages).
• Robots-aware workflows now see `robotsStatus` updates and should expect disallowed links to be skipped before network fetches.

---
