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
