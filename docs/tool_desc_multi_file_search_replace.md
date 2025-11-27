# Bulk Find & Replace - Multi-File Search and Replace Tool

**Status:** Production
**Route:** `/tools/multi-file-search-replace/`
**Category:** Developer Tools
**Tags:** Batch Editing, Regex, Text Processing, Files, Productivity
**Icon:** 🔍
**Gap Score:** 10/10

## Overview

Bulk Find & Replace is a browser-based tool for finding and replacing text across hundreds of files at once. Users upload a ZIP file, define search and replacement patterns (literal text or regex), preview changes with visual diffs, and download the modified ZIP.

**Core Value Proposition:**
- No command-line knowledge required
- Visual diff preview before downloading
- Handles 500 files at once (max 50MB)
- Privacy-first: Files processed in memory, never stored
- Zero installation required

## Features

### Search Modes
1. **Simple Text Mode**
   - Literal string matching
   - Case sensitivity toggle
   - Escape special characters automatically
   - Perfect for non-technical users

2. **Advanced Regex Mode**
   - Full Python regex support (`re` module)
   - Multiline matching enabled
   - Capture groups and backreferences
   - Quick example patterns built-in

### Processing
- **File Type Support:** 40+ text file extensions (HTML, CSS, JS, JSON, MD, Python, PHP, etc.)
- **Binary Safety:** Automatically skips images, PDFs, and binary files
- **Encoding Detection:** Auto-detects file encodings (UTF-8, Latin-1, etc.) using chardet
- **Statistics:** Files scanned, modified, skipped, total replacements
- **Batch Limits:** Max 50MB ZIP, 500 files

### Security
- **Zip Bomb Protection:** Rejects ZIPs with suspicious compression ratios
- **Path Traversal Prevention:** Blocks `../` and absolute paths
- **ReDoS Timeout:** 5-second timeout on regex operations to prevent catastrophic backtracking
- **Request ID Tracking:** Every request gets a unique ID for debugging

### Export Options
- **Modified ZIP:** Download all files with replacements applied
- **CSV Report:** Export list of changed files with match counts
- **Visual Diffs:** Unified diff format with syntax highlighting

### User Experience
- **Drag-Drop Upload:** No clicking required
- **URL Hash State:** Share regex patterns via URL
- **Keyboard Shortcuts:**
  - `Cmd/Ctrl + Enter`: Preview changes
  - `Cmd/Ctrl + D`: Download ZIP
  - `Cmd/Ctrl + E`: Export CSV
- **Regex Examples:** One-click apply common patterns

## Use Cases

1. **Webmasters:**
   - Update copyright years across entire website
   - Change footer text on 100+ HTML pages
   - Fix broken links site-wide
   - Update analytics tracking codes

2. **Developers:**
   - Refactor variable names across codebase
   - Update API endpoints after migration
   - Change import paths after restructuring
   - Batch rename functions or classes

3. **Data Analysts:**
   - Clean CSV/JSON data dumps
   - Standardize date formats
   - Remove PII (emails, phone numbers)
   - Fix encoding issues in bulk

4. **Content Creators:**
   - Update brand names across documentation
   - Fix typos in multiple markdown files
   - Standardize formatting across posts

## Technical Architecture

### Backend (`api/bulk-replace.py`)
- **Runtime:** Python (Vercel serverless)
- **Dependencies:** `chardet` (encoding detection)
- **Response Format:** TinyUtils standard envelope `{ok, data, meta, requestId}`
- **Processing:**
  1. Parse multipart form data (ZIP + parameters)
  2. Validate file size and compression ratio
  3. Iterate through ZIP entries
  4. Detect encoding per-file
  5. Apply regex/text replacement with timeout
  6. Generate unified diffs
  7. Return preview JSON or modified ZIP

### Frontend (`src/routes/tools/multi-file-search-replace/+page.svelte`)
- **Framework:** SvelteKit
- **State Management:** Reactive inline state (no stores)
- **Features:**
  - Drag-drop file upload
  - Mode switcher (Simple/Regex)
  - Regex examples dropdown
  - Diff display with color coding
  - CSV export client-side
  - URL hash persistence
  - Keyboard shortcuts

### Security Features
```python
# Zip bomb check
total_uncompressed = sum(f.file_size for f in zip.infolist())
if total_uncompressed > file_size * 10:
    raise Error("Suspicious compression ratio")

# Path traversal check
if '..' in path or os.path.isabs(path):
    skip_file()

# ReDoS timeout
with timeout(5):
    re.sub(pattern, replacement, text)
```

## SEO Strategy

### Target Keywords
- "bulk find and replace" (2,900/mo)
- "multi file find and replace online" (720/mo)
- "batch text replacement tool" (480/mo)
- "find and replace in multiple files" (1,600/mo)
- "regex replace multiple files" (390/mo)

**Total addressable:** ~6,000 monthly searches

### Content Strategy
1. **Landing pages:**
   - Main tool: `/tools/multi-file-search-replace/`
   - Alt route: `/tools/batch-text-editor/`
   - Power user: `/tools/regex-file-replacer/`

2. **Blog content:**
   - "How to update copyright year across 100 HTML files in 30 seconds"
   - "Regex cheat sheet for webmasters"
   - "5 ways to refactor code without an IDE"
   - "Bulk Find & Replace vs Command Line Tools"

3. **Schema.org markup:**
   ```json
   {
     "@context": "https://schema.org",
     "@type": "SoftwareApplication",
     "name": "Bulk Find & Replace",
     "applicationCategory": "DeveloperApplication",
     "offers": {
       "@type": "Offer",
       "price": "0"
     }
   }
   ```

## API Documentation

### Endpoint
```
POST /api/bulk-replace
```

### Request
```
Content-Type: multipart/form-data

file: <binary ZIP data>
mode: "simple" | "regex"
action: "preview" | "download"
find: <search pattern>
replace: <replacement text>
case_sensitive: "true" | "false"
```

### Response (Preview)
```json
{
  "ok": true,
  "data": {
    "diffs": [
      {
        "filename": "index.html",
        "diff": "--- index.html\n+++ index.html\n@@ -1,3 +1,3 @@\n-Copyright 2023\n+Copyright 2025",
        "matchCount": 1
      }
    ],
    "stats": {
      "filesScanned": 150,
      "filesModified": 23,
      "filesSkipped": 5,
      "totalReplacements": 47,
      "encodingIssues": ["file.txt: latin-1"],
      "skippedFiles": ["image.png: binary file"]
    }
  },
  "meta": {
    "runTimestamp": "2025-11-27T02:00:00Z",
    "requestId": "uuid-here",
    "processingTimeMs": 1234,
    "mode": "bulk-replace",
    "chardetAvailable": true
  }
}
```

### Response (Download)
```
Content-Type: application/zip
Content-Disposition: attachment; filename="tinyutils_processed.zip"
X-Request-ID: uuid-here

<binary ZIP data>
```

### Error Response
```json
{
  "ok": false,
  "message": "Regex too complex (timeout after 5 seconds)",
  "code": 422,
  "requestId": "uuid-here"
}
```

## Error Codes

- **400:** Invalid input (no file, empty pattern, bad parameters)
- **413:** File too large (>50MB)
- **422:** Processing error (invalid regex, corrupt ZIP, encoding failure, ReDoS timeout)
- **500:** Server error (unexpected exception)

## Supported File Extensions

```
.txt, .md, .markdown, .html, .htm, .css, .js, .jsx, .ts, .tsx, .json, .csv,
.xml, .py, .rb, .php, .java, .c, .cpp, .h, .hpp, .sql, .yaml, .yml, .ini,
.env, .svelte, .vue, .toml, .go, .rs, .rust, .swift, .kt, .sh, .bash, .zsh,
.fish, .r, .scala, .clj, .ex, .exs
```

Binary files (images, PDFs, executables) are automatically skipped.

## Regex Examples

Built-in examples in the UI:

1. **Copyright Year:** `Copyright \d{4}` → `Copyright 2025`
2. **US Date → ISO:** `(\d{2})/(\d{2})/(\d{4})` → `\3-\1-\2`
3. **Remove Multiple Spaces:** ` {2,}` → ` ` (single space)
4. **Email Redaction:** `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` → `[EMAIL]`
5. **HTTP → HTTPS:** `http://` → `https://`

## Testing

### Unit Tests
- Zip bomb detection
- Path traversal prevention
- ReDoS timeout enforcement
- Encoding detection (UTF-8, Latin-1, mixed)
- Binary file skipping

### Integration Tests
- Small ZIP (3 files, <1MB) - happy path
- Large ZIP (100 files, 40MB) - performance
- Empty/corrupt ZIP - error handling
- No matches found - UX message
- Invalid regex - error display

### UI Tests
- Drag-drop upload
- Regex examples apply correctly
- Case sensitivity toggles
- Diff display renders
- CSV export downloads
- URL hash saves/restores state

## Deployment

- **No build step required** for API (Python runtime)
- **SvelteKit build** generates static frontend
- **Automatic routing:** Vercel detects `api/bulk-replace.py` → `/api/bulk-replace`
- **Security headers:** Configured in `vercel.json` (HSTS, CSP, X-Robots-Tag)

## Metrics & Success Criteria

### Week 1
- 50+ unique users
- <5% error rate
- Average processing time <10s

### Month 1
- 500+ unique users
- $5-10 AdSense revenue
- Top 10 Google result for target keywords

### Month 3
- 2,000+ unique users
- $20-30 AdSense revenue
- Top 3 Google result for "bulk find replace online"

## Future Enhancements

### Phase 2 (Polish)
- [ ] Syntax highlighting in diffs
- [ ] File type filtering (process only .html, etc.)
- [ ] Diff context slider (adjust lines shown)
- [ ] Export diff as `.patch` file
- [ ] Client-side processing for small ZIPs (<5MB)

### Phase 3 (Premium)
- [ ] 100MB file limit (vs 50MB free)
- [ ] 1000 files (vs 500 free)
- [ ] Priority processing queue
- [ ] API access
- [ ] No ads

### Phase 4 (AI Mode)
- [ ] Natural language to regex conversion
- [ ] AI-powered pattern suggestions
- [ ] Smart encoding detection hints
- [ ] $5/month or $0.50 per job

## Competitive Analysis

**Alternatives:**
1. Command line (`sed`, `awk`, `find`) - Requires terminal knowledge
2. IDE multi-file search (VSCode, Sublime) - Requires installation
3. Online regex testers (regex101) - Single file only
4. Text processing sites (TextMechanic) - Copy-paste only

**Our Advantages:**
- ✅ No installation (browser-based)
- ✅ Visual diff preview (no blind replacement)
- ✅ Bulk file support (500 files)
- ✅ ZIP upload/download (preserves structure)
- ✅ Privacy-first (files never stored)
- ✅ Free forever (zero marginal cost)

**Gap Score: 10/10** - No direct competitor offers all these features.

## Revenue Model

- **Free Tier:** 50MB, 500 files, 2 AdSense slots
- **Premium Tier (Future):** $5/month for 100MB, 1000 files, no ads, API access
- **Estimated Revenue:** $300+/month at scale

## References

- Backend code: `api/bulk-replace.py`
- Frontend code: `src/routes/tools/multi-file-search-replace/+page.svelte`
- Implementation plan: `docs/bulk-find-replace-mvp.md`
- Enhancement plan: `recs/claude/nov/bulk-find-replace-enhancements.md`
- Original spec: `/Users/cav/dev/TinyUtils/New ideas/NEW TOOL bulk find and replace.md`
