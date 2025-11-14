# PR Fix Plan — 2025-11-14

## Summary

Plan to address issues found in open PRs based on Claude bot code reviews.

## Open PRs Status

### PR #29: Preview boot: minimal doc artifact
**Status:** ✅ Ready for owner approval (Preview GREEN)
**Action:** None needed, just needs merge

### PR #26: feat(tools): add Text File Converter page
**Status:** ✅ No issues found
**Action:** None needed, appears ready for merge

### PR #28: fix(converter): LaTeX auto-detect + UI option + smoke
**Status:** ⚠️ Has critical issues that must be fixed before merge
**Action:** Fix 6 issues listed below

---

## PR #28 Issues to Fix

### CRITICAL ISSUES (Must fix before merge)

#### 1. Cache Key Missing md_dialect Parameter
**Location:** `api/convert/convert_service.py:646-666`

**Problem:**
The `_build_cache_key()` function doesn't include `md_dialect` in the cache hash. This means:
- User requests GFM markdown → cached
- User requests CommonMark → gets GFM result from cache (WRONG!)

**Impact:** HIGH - Users get incorrect output formats

**Fix:**
```python
# In _build_cache_key() function, add md_dialect to hash input
def _build_cache_key(
    *,
    name: str,
    from_format: Optional[str],
    targets: Sequence[str],
    options: ConversionOptions,
) -> str:
    # ... existing code ...

    # ADD THIS:
    if options.md_dialect:
        parts.append(f"md_dialect={options.md_dialect}")

    # ... rest of function ...
```

**Testing:**
```bash
# Should produce different outputs
curl -X POST /api/convert -d '{"inputs":[...], "to":["md"], "options":{"mdDialect":"gfm"}}'
curl -X POST /api/convert -d '{"inputs":[...], "to":["md"], "options":{"mdDialect":"commonmark"}}'
```

---

#### 2. LaTeX Detection Regex Escaping Error
**Location:** `api/convert/convert_service.py:86`

**Problem:**
Current code: `re.search(r"\\\\(documentclass|begin|usepackage)", content)`
This looks for FOUR backslashes (`\\\\`) instead of TWO (actual LaTeX syntax `\\documentclass`)

**Impact:** MEDIUM - LaTeX files won't be auto-detected correctly

**Fix:**
```python
# Line 86 - WRONG:
if re.search(r"\\\\(documentclass|begin|usepackage)", content):

# Line 86 - CORRECT:
if re.search(r"\\(documentclass|begin|usepackage)", content):
```

**Testing:**
```python
# Should match:
test_content = "\\documentclass{article}\n\\begin{document}"
assert re.search(r"\\(documentclass|begin|usepackage)", test_content)
```

---

#### 3. Client-Server LaTeX Detection Inconsistency
**Location:** `tools/text-converter/index.html:330-333`

**Problem:**
- Server checks BOTH file content AND filename for .tex extension
- Client only checks file content, ignores filename
- Result: User uploads `document.tex` → client sends `from=auto` → server might not detect LaTeX

**Impact:** MEDIUM - .tex files might not auto-detect in UI

**Fix:**
```javascript
// In tools/text-converter/index.html, update inferFormat() function:

function inferFormat(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'txt') return 'text';
  if (ext === 'htm' || ext === 'html') return 'html';
  if (ext === 'docx') return 'docx';
  if (ext === 'odt') return 'odt';
  if (ext === 'rtf') return 'rtf';
  if (ext === 'tex') return 'latex';  // ADD THIS LINE
  return 'markdown';
}

// Also update the pasted content detection around line 330:
// Add filename check to the LaTeX auto-detection
```

**Testing:**
- Upload `document.tex` file → should auto-select LaTeX format
- Paste LaTeX content → should auto-detect as LaTeX

---

### SECURITY ISSUES (Must fix)

#### 4. Missing Input Validation on md_dialect
**Location:** `api/convert/app.py:241` and `convert_service.py:381`

**Problem:**
`md_dialect` parameter is passed directly to pandoc without validation. Malicious users could potentially inject arbitrary format strings.

**Impact:** HIGH - Potential security vulnerability

**Fix:**
```python
# In api/convert/convert_types.py, add validation:

ALLOWED_MD_DIALECTS = frozenset(["gfm", "commonmark", "markdown_strict"])

class ConversionOptions(BaseModel):
    # ... existing fields ...
    md_dialect: Optional[str] = None

    @validator('md_dialect')
    def validate_md_dialect(cls, v):
        if v is not None and v not in ALLOWED_MD_DIALECTS:
            raise ValueError(f"md_dialect must be one of: {', '.join(ALLOWED_MD_DIALECTS)}")
        return v
```

**Testing:**
```bash
# Should succeed:
curl -X POST /api/convert -d '{"options":{"mdDialect":"gfm"}}'
curl -X POST /api/convert -d '{"options":{"mdDialect":"commonmark"}}'

# Should fail with validation error:
curl -X POST /api/convert -d '{"options":{"mdDialect":"malicious-format"}}'
```

---

### CODE QUALITY ISSUES (Should fix)

#### 5. Unused Variable in pandoc_runner.py:111
**Location:** `api/_lib/pandoc_runner.py:111`

**Problem:**
Line creates a list that's never used - dead code

**Impact:** LOW - Code cleanliness

**Fix:**
Review line 111 and either:
- Use the variable if it was meant to be used
- Remove it if it's truly unused

---

#### 6. Inconsistent Magic String Reference
**Location:** `convert_service.py:382`

**Problem:**
Hard-coded string `"gfm"` should reference `pandoc_runner.DEFAULT_OUTPUT_FORMAT` constant

**Impact:** LOW - Maintainability

**Fix:**
```python
# Line 382 - BEFORE:
format="gfm",

# Line 382 - AFTER:
format=pandoc_runner.DEFAULT_OUTPUT_FORMAT.split('+')[0],
```

---

## Implementation Plan

### Phase 1: Critical Fixes (Do First)
1. Fix cache key missing md_dialect (Issue #1)
2. Fix LaTeX regex escaping (Issue #2)
3. Fix client-server LaTeX detection (Issue #3)
4. Add md_dialect input validation (Issue #4)

### Phase 2: Code Quality (Do After Critical)
5. Remove unused variable (Issue #5)
6. Fix magic string reference (Issue #6)

### Phase 3: Testing
- Run converter smoke tests
- Test LaTeX upload and paste
- Test md_dialect with different values
- Test cache key differentiation
- Test security validation

### Phase 4: Documentation
- [ ] Run `python scripts/log_run_entry.py` with all fixes
- [ ] Run `python scripts/add_task_checklist_entry.py`
- [ ] Update `tool_desc_converter.md` with fixes
- [ ] Commit and push all changes
- [ ] Comment on PR #28 with "Fixed all issues from review"

---

## Verification Checklist

Before considering PR #28 ready to merge:

- [ ] Cache key includes md_dialect
- [ ] LaTeX regex uses single backslash
- [ ] Client detects .tex extension
- [ ] md_dialect validates against allowlist
- [ ] Unused variable removed
- [ ] Magic string uses constant
- [ ] All converter smoke tests pass
- [ ] LaTeX conversion tested (upload + paste)
- [ ] Markdown dialect switching tested
- [ ] Security validation tested
- [ ] Documentation updated (run log, checklist, tool desc)
- [ ] All changes committed and pushed

---

## Notes

- PR #29 and PR #26 appear ready to merge once owner approves
- All fixes for PR #28 are straightforward and well-documented
- Estimated time: 1-2 hours for all fixes + testing + documentation
- Priority: Critical issues first, then code quality
