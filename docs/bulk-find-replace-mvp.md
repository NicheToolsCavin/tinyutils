# Implementation Plan: Bulk Find & Replace (MVP)

**Tool Name:** Bulk Find & Replace
**Route:** `/tools/multi-file-search-replace/`
**Status:** Planning
**Target Launch:** 2 weeks from start
**Build Priority:** HIGH (Gap Score 10, ~6K monthly searches)

---

## Overview

A browser-based tool for finding and replacing text across hundreds of files at once. Users upload a ZIP, preview changes with visual diffs, then download the modified ZIP.

**Key Features:**
- ZIP upload (max 50MB, 500 files)
- Two modes: Simple text matching + Advanced regex
- Visual diff preview (unified diff format)
- CSV export of changes
- Zero cost (pure Python stdlib + chardet)

---

## Architecture

### Backend: Python Serverless Function
- **File:** `api/bulk-replace.py`
- **Runtime:** Vercel Python
- **Dependencies:** `chardet` (encoding detection)
- **Response Format:** TinyUtils standard envelope `{ok, data, meta, requestId}`

### Frontend: SvelteKit Page
- **File:** `src/routes/tools/multi-file-search-replace/+page.svelte`
- **State:** Inline reactive (no stores)
- **Features:** Drag-drop upload, regex examples, diff display, CSV export

### Configuration
- **File:** `vercel.json` (add rewrite rule)
- **Security Headers:** CSP, X-Robots-Tag (noindex for beta)
- **Route:** `/api/bulk-replace` → `/api/bulk-replace.py`

---

## File Structure

```
tinyutils/
├── api/
│   └── bulk-replace.py          # New: Backend logic
├── src/
│   └── routes/
│       └── tools/
│           └── multi-file-search-replace/
│               └── +page.svelte  # New: Frontend UI
├── docs/
│   └── tool_desc_multi_file_search_replace.md  # New: Spec
├── vercel.json                   # Modified: Add rewrite
└── requirements.txt              # Modified: Add chardet
```

---

## Implementation Steps

### Step 1: Backend (`api/bulk-replace.py`)

**Core functionality:**
1. Accept multipart/form-data with ZIP + params
2. Validate file size (<50MB), count (<500 files)
3. Detect and prevent zip bombs (compression ratio check)
4. Process each text file:
   - Auto-detect encoding (chardet)
   - Apply regex/text replacement
   - Generate unified diff
5. Return preview JSON or download ZIP

**Security checks:**
- ✅ Zip bomb protection (max 10x compression ratio)
- ✅ Path traversal prevention (reject `..` and absolute paths)
- ✅ ReDoS timeout (5 second limit per regex operation)
- ✅ Binary file detection (skip files with null bytes)

**Error handling:**
- 400: Invalid input (no file, empty pattern)
- 413: File too large (>50MB)
- 422: Processing error (bad regex, corrupt ZIP, encoding failure)
- 500: Server error (unexpected exception)

**Code template:**
```python
from http.server import BaseHTTPRequestHandler
import cgi, json, zipfile, io, re, difflib, os, time, uuid, signal, contextlib
import chardet

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
MAX_FILES_COUNT = 500
MAX_COMPRESSION_RATIO = 10
REGEX_TIMEOUT_SECONDS = 5

ALLOWED_TEXT_EXTENSIONS = {
    '.txt', '.md', '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx',
    '.json', '.csv', '.xml', '.py', '.rb', '.php', '.java', '.c', '.cpp',
    '.h', '.sql', '.yaml', '.yml', '.ini', '.env', '.svelte', '.vue', '.toml',
    '.go', '.rs', '.swift', '.kt', '.sh', '.bash'
}

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        request_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            # 1. Parse multipart form
            content_type, pdict = cgi.parse_header(self.headers.get('content-type'))
            if content_type != 'multipart/form-data':
                return self._send_error(400, "Content-Type must be multipart/form-data", request_id)

            pdict['boundary'] = bytes(pdict['boundary'], "utf-8")
            form = cgi.parse_multipart(self.rfile, pdict)

            # 2. Extract parameters
            mode = form.get('mode', ['simple'])[0]
            find_raw = form.get('find', [''])[0]
            replace_raw = form.get('replace', [''])[0]
            action = form.get('action', ['preview'])[0]
            is_case_sensitive = form.get('case_sensitive', ['false'])[0] == 'true'
            file_types_filter = form.get('file_types', ['all'])[0].split(',')

            uploaded_files = form.get('file')
            if not uploaded_files or len(uploaded_files) == 0:
                return self._send_error(400, "No file uploaded", request_id)

            file_bytes = uploaded_files[0]

            # 3. Size validation
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                return self._send_error(413, f"File too large (max {MAX_FILE_SIZE_BYTES/1024/1024:.0f}MB)", request_id)

            # 4. Zip bomb check
            input_zip = zipfile.ZipFile(io.BytesIO(file_bytes), 'r')
            total_uncompressed = sum(f.file_size for f in input_zip.infolist() if not f.is_dir())
            if total_uncompressed > len(file_bytes) * MAX_COMPRESSION_RATIO:
                return self._send_error(422, "Suspicious ZIP file (compression ratio too high)", request_id)

            # 5. Prepare regex
            regex_flags = re.MULTILINE
            if not is_case_sensitive:
                regex_flags |= re.IGNORECASE

            if mode == 'regex':
                find_pattern = find_raw
            else:
                find_pattern = re.escape(find_raw)

            if not find_pattern:
                return self._send_error(400, "Search pattern cannot be empty", request_id)

            # 6. Process files
            output_io = io.BytesIO()
            output_zip = zipfile.ZipFile(output_io, 'w', zipfile.ZIP_DEFLATED)

            diff_results = []
            stats = {
                "filesScanned": 0,
                "filesModified": 0,
                "filesSkipped": 0,
                "totalReplacements": 0,
                "encodingIssues": [],
                "skippedFiles": []
            }

            for file_info in input_zip.infolist():
                if file_info.is_dir():
                    continue

                # Path traversal check
                if not self._is_safe_path(file_info.filename):
                    stats["skippedFiles"].append(f"{file_info.filename}: unsafe path")
                    continue

                raw_data = input_zip.read(file_info)
                _, ext = os.path.splitext(file_info.filename)

                # Binary safety check
                if ext.lower() not in ALLOWED_TEXT_EXTENSIONS or self._is_likely_binary(raw_data):
                    output_zip.writestr(file_info, raw_data)
                    stats["skippedFiles"].append(f"{file_info.filename}: binary file")
                    continue

                # Encoding detection
                original_text, detected_encoding = self._detect_and_decode(raw_data)
                if detected_encoding != 'utf-8':
                    stats["encodingIssues"].append(f"{file_info.filename}: {detected_encoding}")

                # Apply replacement with timeout
                try:
                    with self._timeout(REGEX_TIMEOUT_SECONDS):
                        new_text = re.sub(find_pattern, replace_raw, original_text, flags=regex_flags)
                        match_count = len(re.findall(find_pattern, original_text, flags=regex_flags))
                except TimeoutError:
                    return self._send_error(422, "Regex too complex (timeout after 5s)", request_id)
                except re.error as e:
                    return self._send_error(422, f"Invalid regex: {str(e)}", request_id)

                # Track changes
                is_changed = new_text != original_text
                stats["filesScanned"] += 1

                if is_changed:
                    stats["filesModified"] += 1
                    stats["totalReplacements"] += match_count

                if action == 'preview':
                    if is_changed:
                        diff = difflib.unified_diff(
                            original_text.splitlines(),
                            new_text.splitlines(),
                            fromfile=file_info.filename,
                            tofile=file_info.filename,
                            n=2,
                            lineterm=''
                        )
                        diff_results.append({
                            'filename': file_info.filename,
                            'diff': '\n'.join(list(diff)),
                            'matchCount': match_count
                        })
                elif action == 'download':
                    output_zip.writestr(file_info.filename, new_text)

                if stats["filesScanned"] >= MAX_FILES_COUNT:
                    break

            output_zip.close()

            # 7. Response
            processing_time_ms = int((time.time() - start_time) * 1000)

            if action == 'download':
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', 'attachment; filename="tinyutils_processed.zip"')
                self.send_header('X-Request-ID', request_id)
                self.end_headers()
                output_io.seek(0)
                self.wfile.write(output_io.getvalue())
            else:
                self._send_success({
                    "diffs": diff_results,
                    "stats": stats
                }, request_id, processing_time_ms)

        except Exception as e:
            import traceback
            traceback.print_exc()
            self._send_error(500, f"Server error: {str(e)}", request_id)

    def _is_safe_path(self, path):
        """Reject absolute paths and parent directory references."""
        return not os.path.isabs(path) and '..' not in path.split(os.sep)

    def _is_likely_binary(self, data_bytes):
        """Detect binary files to avoid corrupting images/PDFs."""
        return b'\0' in data_bytes[:1024]

    def _detect_and_decode(self, raw_bytes):
        """Auto-detect encoding and decode safely."""
        try:
            return raw_bytes.decode('utf-8'), 'utf-8'
        except UnicodeDecodeError:
            pass

        detection = chardet.detect(raw_bytes)
        encoding = detection['encoding'] or 'latin-1'
        return raw_bytes.decode(encoding, errors='replace'), encoding

    @contextlib.contextmanager
    def _timeout(self, seconds):
        """Timeout context manager for regex operations."""
        def timeout_handler(signum, frame):
            raise TimeoutError("Operation timed out")

        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(seconds)
        try:
            yield
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)

    def _send_success(self, data, request_id, processing_time_ms):
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
                "processingTimeMs": processing_time_ms,
                "mode": "bulk-replace"
            }
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def _send_error(self, code, message, request_id):
        """Send TinyUtils-standard error response."""
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

---

### Step 2: Frontend (`src/routes/tools/multi-file-search-replace/+page.svelte`)

**Features:**
- Drag-drop ZIP upload
- Mode switcher (Simple / Regex)
- Case sensitivity toggle
- Regex examples dropdown
- Visual diff display
- Download buttons (ZIP + CSV)
- URL hash persistence

**Layout:**
1. Hero section (title + description)
2. Upload area (drag-drop with file info)
3. Configuration panel:
   - Mode tabs
   - Find/replace inputs
   - Regex examples dropdown
   - Case sensitivity checkbox
4. Action buttons (Preview / Download)
5. Results panel:
   - Statistics cards
   - File diffs (syntax-highlighted)
   - CSV export button

(Frontend code is large - see original spec for reference, add enhancements from recommendation doc)

---

### Step 3: Configuration Updates

**`vercel.json`** - Add rewrite rule:
```json
{
  "rewrites": [
    ...existing rewrites,
    { "source": "/api/bulk-replace", "destination": "/api/bulk-replace.py" }
  ]
}
```

**`requirements.txt`** - Add chardet:
```
chardet>=5.0,<6.0
```

---

### Step 4: Documentation

**`docs/tool_desc_multi_file_search_replace.md`:**
```markdown
---
title: Bulk Find & Replace
slug: multi-file-search-replace
description: Find and replace text across hundreds of files at once. Upload a ZIP, preview diffs, download results.
icon: 🔍
category: Developer Tools
tags: [Batch, Regex, Text, Files, Productivity]
status: new
gap_score: 10
---

# Bulk Find & Replace

Edit hundreds of files in seconds. Upload a ZIP, find & replace text (or use regex), preview the changes, and download.

## Why Use This?

- **No Command Line:** Works in your browser, no terminal required
- **Visual Preview:** See exactly what will change before downloading
- **Bulk Processing:** Handle 500 files at once (max 50MB)
- **Privacy-First:** Files processed in memory, never stored
- **Power User Mode:** Full Python regex support

## How It Works

1. Upload a ZIP containing your project files
2. Choose Simple (exact text) or Regex (pattern matching)
3. Preview the changes with side-by-side diffs
4. Download the modified ZIP

## Common Use Cases

- Update copyright years across a website
- Refactor variable names in code
- Clean up CSV/JSON data
- Batch edit configuration files
- Find and fix broken links

## Supported File Types

Text files only: HTML, CSS, JS, JSON, MD, TXT, CSV, XML, Python, PHP, and more.
Binary files (images, PDFs) are automatically skipped.
```

---

## Testing Checklist

### Unit Tests
- [ ] Zip bomb detection (high compression ratio)
- [ ] Path traversal prevention (`../../etc/passwd`)
- [ ] ReDoS timeout (catastrophic backtracking)
- [ ] Encoding detection (UTF-8, Latin-1, mixed)
- [ ] Binary file skipping (PNG, PDF, etc.)

### Integration Tests
- [ ] Small ZIP (3 files, <1MB) - happy path
- [ ] Large ZIP (100 files, 40MB) - performance
- [ ] Empty ZIP - error handling
- [ ] Corrupt ZIP - error handling
- [ ] No matches found - UX message
- [ ] Invalid regex - error display

### UI Tests
- [ ] Drag-drop upload works
- [ ] Regex examples apply correctly
- [ ] Case sensitivity toggles
- [ ] Diff display renders properly
- [ ] CSV export downloads
- [ ] URL hash saves/restores state

---

## Launch Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend builds without errors
- [ ] Security headers configured
- [ ] Tool description page published
- [ ] Added to tools hub (`/tools/`)
- [ ] Schema.org markup added
- [ ] Meta tags optimized
- [ ] AdSense slots placed (2)
- [ ] "Buy me a coffee" CTA added
- [ ] Analytics tracking enabled
- [ ] Smoke test on production
- [ ] Social media announcement prepared

---

## Success Metrics

**Week 1:**
- [ ] 50+ unique users
- [ ] <5% error rate
- [ ] Average processing time <10s

**Month 1:**
- [ ] 500+ unique users
- [ ] 10+ GitHub stars (if promoted)
- [ ] $5-10 AdSense revenue

**Month 3:**
- [ ] 2,000+ unique users
- [ ] Top 3 Google result for "bulk find replace online"
- [ ] $20-30 AdSense revenue

---

## Future Enhancements (Post-MVP)

- Client-side processing for small ZIPs (<5MB)
- Progressive preview with Server-Sent Events
- Syntax highlighting in diffs
- File type filtering (process only .html, etc.)
- AI mode (natural language to regex)
- Premium tier (100MB, 1000 files, API access)

---

## References

- Enhancement plan: `/Users/cav/dev/TinyUtils/recs/claude/nov/bulk-find-replace-enhancements.md`
- Original spec: `/Users/cav/dev/TinyUtils/New ideas/NEW TOOL bulk find and replace.md`
- TinyUtils patterns: `~/dev/TinyUtils/tinyutils/CLAUDE.md`
