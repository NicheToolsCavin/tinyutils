# Bulk Find & Replace: Enhancement Plan

**Date:** 2025-11-27
**Author:** Claude (claude-sonnet-4-5)
**Context:** Review of `/Users/cav/dev/TinyUtils/New ideas/NEW TOOL bulk find and replace.md`

---

## Executive Summary

The Bulk Find & Replace tool is **absolutely worth building**. Gap Score 10 is accurate - no free web tool offers ZIP upload + visual diffs + multi-file editing. The MVP (no AI) version is stronger than the AI version because regex is more precise.

**Key Stats:**
- SEO potential: ~6,000 monthly searches
- Target users: Webmasters, developers, data analysts
- Cost: $0 (pure Python stdlib)
- Risk: Low (well-scoped, proven patterns)

---

## Critical Fixes Required

### 1. Security Hardening

**Zip Bomb Protection:**
```python
# Add before processing
MAX_UNCOMPRESSED_RATIO = 10  # Max 10x compression
total_uncompressed = sum(f.file_size for f in input_zip.infolist())
if total_uncompressed > MAX_FILE_SIZE_BYTES * MAX_UNCOMPRESSED_RATIO:
    raise ValueError("Suspicious ZIP file (compression ratio too high)")
```

**Path Traversal Protection:**
```python
# Sanitize file paths
import os.path

def is_safe_path(path):
    """Reject absolute paths and parent directory references."""
    return not os.path.isabs(path) and '..' not in path.split(os.sep)

# In processing loop:
if not is_safe_path(file_info.filename):
    continue  # Skip dangerous paths
```

**ReDoS Timeout:**
```python
import signal
import contextlib

@contextlib.contextmanager
def timeout(seconds):
    def timeout_handler(signum, frame):
        raise TimeoutError("Regex operation timed out")

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)

# Wrap regex operations:
try:
    with timeout(5):  # 5 second timeout
        new_text = re.sub(pattern, replace_raw, original_text, flags=regex_flags)
except TimeoutError:
    return error("Regex too complex (possible ReDoS pattern)")
```

### 2. TinyUtils Envelope Format

**Replace basic JSON with standard envelope:**
```python
import time
import uuid

def _send_success(self, data, request_id):
    """Send TinyUtils-standard success response."""
    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.send_header('X-Request-ID', request_id)
    self.end_headers()

    response = {
        "ok": True,
        "data": data,
        "meta": {
            "runTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "requestId": request_id,
            "mode": "bulk-replace"
        }
    }
    self.wfile.write(json.dumps(response).encode('utf-8'))

def _send_error(self, code, message, request_id=None):
    """Send TinyUtils-standard error response."""
    if not request_id:
        request_id = str(uuid.uuid4())

    self.send_response(code)
    self.send_header('Content-Type', 'application/json')
    self.send_header('X-Request-ID', request_id)
    self.end_headers()

    response = {
        "ok": False,
        "message": message,
        "code": code,
        "requestId": request_id
    }
    self.wfile.write(json.dumps(response).encode('utf-8'))
```

### 3. Better Encoding Detection

**Replace errors='ignore' with chardet:**
```python
import chardet

def detect_and_decode(raw_bytes):
    """Auto-detect encoding and decode safely."""
    # Try UTF-8 first (most common)
    try:
        return raw_bytes.decode('utf-8'), 'utf-8'
    except UnicodeDecodeError:
        pass

    # Fall back to chardet
    detection = chardet.detect(raw_bytes)
    encoding = detection['encoding'] or 'latin-1'
    confidence = detection['confidence']

    if confidence < 0.7:
        # Low confidence, try common encodings
        for enc in ['latin-1', 'cp1252', 'iso-8859-1']:
            try:
                return raw_bytes.decode(enc), enc
            except:
                continue

    return raw_bytes.decode(encoding, errors='replace'), encoding

# In processing loop:
original_text, detected_encoding = detect_and_decode(raw_data)
# Track encoding in metadata for user transparency
```

**Add to requirements.txt:**
```
chardet>=5.0,<6.0
```

---

## Must-Have Enhancements (MVP)

### 1. Request ID Tracking
- Generate UUID per request
- Include in all responses
- Log with request ID for debugging

### 2. Statistics Summary
```python
stats = {
    "filesScanned": 150,
    "filesModified": 23,
    "filesSkipped": 5,  # Binary or encoding errors
    "totalReplacements": 47,  # Total number of matches replaced
    "encodingIssues": ["file1.txt: detected as latin-1", ...],
    "skippedFiles": ["image.png: binary file", ...]
}
```

### 3. CSV Export
Allow users to download a CSV report of changes:
```csv
filename,matches_found,replacements_made,encoding,status
index.html,3,3,utf-8,success
style.css,0,0,utf-8,no_matches
data.txt,5,5,latin-1,success
```

### 4. File Type Filtering
Add UI control to select which extensions to process:
```html
<label>
  <input type="checkbox" checked> HTML/XML (.html, .xml)
</label>
<label>
  <input type="checkbox" checked> Stylesheets (.css, .scss)
</label>
<label>
  <input type="checkbox" checked> JavaScript (.js, .jsx, .ts)
</label>
<label>
  <input type="checkbox"> All text files
</label>
```

### 5. URL Hash State Persistence
Save regex patterns in URL for sharing:
```javascript
// Encode state to URL hash
function saveToHash() {
  const state = {
    mode,
    find: findText,
    replace: replaceText,
    case: isCaseSensitive
  };
  window.location.hash = btoa(JSON.stringify(state));
}

// Restore from hash on load
function loadFromHash() {
  try {
    const state = JSON.parse(atob(window.location.hash.slice(1)));
    mode = state.mode;
    findText = state.find;
    replaceText = state.replace;
    isCaseSensitive = state.case;
  } catch {}
}
```

### 6. Regex Examples Dropdown
Help users with common patterns:
```javascript
const REGEX_EXAMPLES = [
  {
    name: "US Date → ISO Date",
    find: "(\\d{2})/(\\d{2})/(\\d{4})",
    replace: "\\3-\\1-\\2",
    desc: "12/25/2024 → 2024-12-25"
  },
  {
    name: "Copyright Year",
    find: "Copyright \\d{4}",
    replace: "Copyright 2025",
    desc: "Update copyright to current year"
  },
  {
    name: "Remove Multiple Spaces",
    find: " {2,}",
    replace: " ",
    desc: "Collapse multiple spaces to single"
  },
  {
    name: "Email Extraction",
    find: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    replace: "[EMAIL]",
    desc: "Redact email addresses"
  }
];
```

---

## Nice-to-Have Enhancements (Phase 2)

### 1. Keyboard Shortcuts
- `Cmd/Ctrl + Enter`: Preview changes
- `Cmd/Ctrl + D`: Download ZIP
- `Cmd/Ctrl + E`: Export CSV

### 2. Diff Context Slider
Allow user to adjust context lines (currently hardcoded to n=2):
```html
<label>
  Context lines: <input type="range" min="0" max="10" bind:value={contextLines}>
  <span>{contextLines}</span>
</label>
```

### 3. Export Diff as Patch
Download unified diff as `.patch` file for `git apply`:
```javascript
function exportPatch() {
  const patch = previewData.diffs.map(d => d.diff).join('\n\n');
  const blob = new Blob([patch], { type: 'text/plain' });
  downloadBlob(blob, 'changes.patch');
}
```

### 4. Dry Run Mode (Client-Side)
For simple patterns, test regex in browser before uploading:
```javascript
function testRegex() {
  const testInput = "Sample text: Copyright 2023\nAnother line 2023";
  try {
    const result = testInput.replace(new RegExp(findText, 'g'), replaceText);
    return { ok: true, preview: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
```

### 5. Progressive Preview (Streaming)
For large ZIPs, stream diff results as they're generated:
```python
# Backend: Use Server-Sent Events
def do_POST(self):
    self.send_response(200)
    self.send_header('Content-Type', 'text/event-stream')
    self.send_header('Cache-Control', 'no-cache')
    self.end_headers()

    for file_info in input_zip.infolist():
        # Process file
        diff_result = process_file(file_info)

        # Stream result
        self.wfile.write(f"data: {json.dumps(diff_result)}\n\n".encode())
        self.wfile.flush()

    self.wfile.write(b"data: {\"done\": true}\n\n")
```

### 6. Syntax Highlighting in Diff
Color code based on file type (HTML, CSS, JS):
```javascript
import Prism from 'prismjs';

function highlightDiff(line, filename) {
  const ext = filename.split('.').pop();
  const language = LANG_MAP[ext] || 'text';
  return Prism.highlight(line, Prism.languages[language], language);
}
```

---

## SEO & Marketing

### Landing Page Variants
1. `/tools/bulk-find-replace/` - Main tool
2. `/tools/batch-text-editor/` - SEO variant (2,900/mo searches)
3. `/tools/regex-file-replacer/` - Power user variant

### Content Opportunities
1. **Tutorial:** "How to update copyright year across 100 HTML files in 30 seconds"
2. **Cheat sheet:** "Regex patterns for webmasters (with examples)"
3. **Comparison:** "Bulk Find & Replace vs Command Line Tools"
4. **Use cases:** "5 ways to refactor code without an IDE"

### Schema.org Markup
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Bulk Find & Replace",
  "applicationCategory": "DeveloperApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "operatingSystem": "Web Browser",
  "description": "Upload a ZIP file and find/replace text across hundreds of files instantly. No installation required."
}
```

---

## Architecture Improvements (Future)

### 1. Client-Side Processing (Small ZIPs)
For ZIPs <5MB, do everything in browser:
```javascript
import JSZip from 'jszip';

async function processZipClientSide(file) {
  const zip = await JSZip.loadAsync(file);
  const results = [];

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const content = await zipEntry.async('text');
    const newContent = content.replace(new RegExp(findText, 'g'), replaceText);

    if (content !== newContent) {
      results.push({ path, diff: generateDiff(content, newContent) });
      zip.file(path, newContent);
    }
  }

  return { results, blob: await zip.generateAsync({ type: 'blob' }) };
}
```

Benefits:
- Instant preview (no server round-trip)
- Works offline
- No file size limits
- Zero server cost

### 2. Streaming ZIP Processing
For large ZIPs, stream instead of buffering:
```python
from streaming_form_data import StreamingFormDataParser
from streaming_form_data.targets import ValueTarget

# Process ZIP as it uploads, don't wait for complete upload
parser = StreamingFormDataParser(headers=self.headers)
zip_target = ValueTarget()
parser.register('file', zip_target)

# Stream chunks
while True:
    chunk = self.rfile.read(8192)
    if not chunk:
        break
    parser.data_received(chunk)
```

---

## Implementation Checklist

### Phase 1: MVP (Week 1)
- [ ] Core backend with security hardening
  - [ ] Zip bomb protection
  - [ ] Path traversal check
  - [ ] ReDoS timeout
  - [ ] Better encoding detection (chardet)
- [ ] TinyUtils envelope format
  - [ ] Request ID tracking
  - [ ] Standard error codes
  - [ ] Meta object with timestamps
- [ ] Frontend with drag-drop + preview
  - [ ] Simple + Regex modes
  - [ ] Case sensitivity toggle
  - [ ] Visual diff display
- [ ] CSV export of changes
- [ ] File type filtering UI
- [ ] URL hash state persistence
- [ ] Regex examples dropdown

### Phase 2: Polish (Week 2)
- [ ] Keyboard shortcuts (Cmd+Enter, Cmd+D)
- [ ] Statistics summary (files scanned, modified, skipped)
- [ ] Diff context slider
- [ ] Export patch file
- [ ] Syntax highlighting in diffs
- [ ] Better error messages (regex syntax help)

### Phase 3: SEO (Week 3)
- [ ] Tool description page (`tool_desc_multi_file_search_replace.md`)
- [ ] Schema.org markup
- [ ] Tutorial content (copyright year example)
- [ ] Regex cheat sheet page
- [ ] Meta tags optimization

### Phase 4: Future Enhancements
- [ ] Client-side processing for small ZIPs (<5MB)
- [ ] Progressive preview with SSE
- [ ] AI mode (natural language to regex)
- [ ] Premium tier (100MB limit, 1000 files)

---

## Risk Assessment

### Low Risk ✅
- Technology stack (Python stdlib, proven)
- Market fit (clear gap, strong search volume)
- Cost structure (zero marginal cost)
- Scope creep (well-defined MVP)

### Medium Risk ⚠️
- Performance (50MB ZIPs could timeout on Vercel Hobby)
- Encoding edge cases (mixed encodings in one ZIP)
- User education (regex syntax differences Python vs JS)

### Mitigations
1. **Timeout risk:** Add warning for large ZIPs, suggest Pro plan
2. **Encoding risk:** Auto-detect + report issues in metadata
3. **Education risk:** Add regex syntax help, link to Python re docs

---

## Competitive Analysis

### Alternatives
1. **Command line** (sed, awk, find)
   - Pros: Powerful, fast
   - Cons: Requires terminal knowledge, OS-specific
   - **Our edge:** No installation, visual preview, works on any OS

2. **IDE multi-file search/replace** (VSCode, Sublime)
   - Pros: Integrated, familiar
   - Cons: Requires IDE installation, not web-accessible
   - **Our edge:** Browser-based, no install, shareable URLs

3. **Online regex testers** (regex101, regexr)
   - Pros: Great for testing
   - Cons: Single-file only, no batch processing
   - **Our edge:** Multi-file, ZIP support, download results

4. **Text processing sites** (TextMechanic, OnlineTextTools)
   - Pros: Simple, free
   - Cons: Copy-paste only, no file handling
   - **Our edge:** Bulk file support, preserves structure

**Conclusion:** No direct competitor offers ZIP + visual diffs + bulk editing. Gap Score 10 confirmed.

---

## Monetization Strategy

### Free Tier
- 50MB max ZIP
- 500 files max
- 2 AdSense slots
- "Buy me a coffee" CTA after download

### Premium Tier (Future)
- 100MB max ZIP
- 1000 files max
- Priority processing (faster queue)
- No ads
- API access
- **Price:** $5/month or $0.50 per job

### Estimated Revenue
- **AdSense:** ~$2-5 RPM × 6,000 monthly searches = $12-30/month
- **Premium:** 1% conversion × 6,000 users × $5 = $300/month potential
- **Total:** $312-330/month at scale

---

## Final Recommendation

**BUILD THIS TOOL.**

The MVP is:
- ✅ Low risk (proven tech, zero cost)
- ✅ High value (genuine market gap)
- ✅ Strategic fit (TinyUtils brand alignment)
- ✅ SEO goldmine (~6K monthly searches)
- ✅ Monetizable (ads + premium tier)

Start with Phase 1 MVP (no AI), validate traction, then expand. The AI version can wait - regex mode is more valuable for the target audience.

**Estimated build time:**
- MVP: 3-5 days
- Polish: 2-3 days
- SEO content: 2 days
- **Total:** ~2 weeks to launch

---

## References

- Original spec: `/Users/cav/dev/TinyUtils/New ideas/NEW TOOL bulk find and replace.md`
- TinyUtils architecture: `/Users/cav/dev/TinyUtils/tinyutils/CLAUDE.md`
- API patterns: `/Users/cav/dev/TinyUtils/tinyutils/api/check.js`
- SEO research: Keyword volume estimates from Ahrefs/Semrush
