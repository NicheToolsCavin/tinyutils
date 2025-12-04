# Workstream 2: Test Matrix & Silent-Failure Guards
**Execution-Ready Proposal for Converter Fidelity & Quality Assurance**

---

## 1. Current State Inventory

### Existing Fixtures (tests/fixtures/converter/)
```
✓ blog_post.docx          14KB    Rich blog content with code/lists
✓ blog_post.md             4KB    Markdown source
✓ docx_report_sample.docx 11KB    Executive summary report
✓ images.docx             11KB    Multiple embedded images
✓ images_source.md        481B    Image markdown source
✓ lists.docx              11KB    Deep/mixed ordered and unordered lists
✓ lists_source.md         501B    List markdown source
✓ November 16-30.odt      24KB    Multi-page newsletter (critical ODT fixture)
✓ odt_invoice_sample.odt   7KB    Invoice document
✓ odt_report_sample.odt    7KB    Executive summary report (ODT)
✓ tech_doc.docx           13KB    Technical doc with code/tables/lists
✓ tech_doc.md              2KB    Technical markdown source
✓ html_input.html          1KB    HTML with code blocks and data URLs
✓ malformed_data_url.html 597B    Edge case HTML
✓ sample.csv              573B    Tabular data
✓ sample.json             875B    JSON structured data
✓ sample.tex              975B    LaTeX document
✓ sample.txt               1KB    Plain text
✓ zero_width_chars.md     326B    Unicode edge case
✓ invalid_chars.md        680B    Character encoding edge case
✓ large_file.txt          305KB   Large file stress test
```

### Existing Golden Metrics (tests/golden/converter/)
```
✓ blog_post_docx.metrics.json
✓ html_input.metrics.json
✓ images_docx.metrics.json
✓ lists_docx.metrics.json
✓ november_16_30_odt.metrics.json
✓ report_2025_annual_docx.metrics.json
✓ tech_doc_docx.metrics.json
```

### Existing Tests
- **converter_fidelity.mjs**: 7 tests validating metrics stability (DOCX→MD, HTML→MD, ODT→MD)
- **test_convert_backend_odt_docx.py**: 6 tests for ODT→DOCX/MD pipeline with blank-output guards
- **converter_edge_cases.test.mjs**: Edge case handling
- **test_converter_enhancements.py**: Enhancement validation

---

## 2. Proposed Test Matrix (6–10 High-Value Combos)

### Priority 1: Rich Format Roundtrips (Already Partially Covered)
1. **ODT → DOCX** ✓ (CRITICAL - blank output bug fixed, tests exist)
   - Fixture: `November 16-30.odt`, `odt_invoice_sample.odt`, `odt_report_sample.odt`
   - Guards: `suspected_blank_output=docx`, `stage_docx_bytes`
   - Assert: min_output_bytes > 5KB for 24KB ODT input

2. **ODT → MD** ✓ (Currently tested in converter_fidelity.mjs:123-143)
   - Fixture: `November 16-30.odt`
   - Guards: `min_output_bytes >= 2000`, verify non-blank
   - Assert: Output size >= golden threshold

3. **DOCX → DOCX** ✓ (Roundtrip test exists in test_convert_backend_odt_docx.py:182-211)
   - Fixture: `docx_report_sample.docx`
   - Guards: Should extend blank-output detection to DOCX→DOCX
   - Assert: Output ≈ input size ± 20%, preserve "EXECUTIVE SUMMARY" marker

### Priority 2: HTML Pipeline (Needs Extension)
4. **HTML → DOCX** (NEW - extend direct path logic)
   - Fixture: `html_input.html`
   - Guards: **NEW** `suspected_blank_output=docx` for HTML→DOCX
   - Assert: Preserve table structure, code blocks, non-blank output
   - Implementation: Line 759 in convert_service.py should add `"html"` to `from_format in {"odt", "docx", "html"}`

5. **HTML → MD** ✓ (Tested in converter_fidelity.mjs:105-121)
   - Fixture: `html_input.html`
   - Guards: Already validates metrics stability
   - Assert: Preserve code blocks, lists, sanitize data URLs

### Priority 3: Fidelity-Critical Formats (Extend Guards)
6. **DOCX → MD** (NEW - extend metrics validation)
   - Fixture: `blog_post.docx`, `tech_doc.docx`, `report_2025_annual.docx`
   - Guards: **NEW** Check if cleaned_md size < (input_bytes * 0.1) → `suspected_content_loss=md`
   - Assert: Lists, code blocks, headings preserved per golden metrics

7. **PDF → MD** (NEW - validate layout-aware extraction)
   - Fixture: **MISSING** - need to add `sample.pdf` (technical doc with headings/lists)
   - Guards: **NEW** `pdf_degraded=timeout|too_short_or_single_line`, `pdf_extraction_strategy=layout_aware|fallback_legacy`
   - Assert: `pdf_headings > 0`, `pdf_lists > 0`, `pdf_pages > 0`

8. **PDF → TXT** (NEW - plain text fidelity)
   - Fixture: Same `sample.pdf`
   - Guards: **NEW** Check txt_bytes < (pdf_input_bytes * 0.05) → `suspected_extraction_failure=pdf_to_txt`
   - Assert: Non-blank, preserve paragraph structure

### Priority 4: Edge Cases (Minimal Extensions)
9. **HTML → TXT** (Direct path already implemented, needs test)
   - Fixture: `html_input.html`
   - Guards: Validate direct-path logic doesn't truncate (already fixed in convert_service.py:919-971)
   - Assert: Output size > 500 bytes, no stray code blocks

10. **DOCX → PDF** (Reportlab fallback validation)
    - Fixture: `tech_doc.docx`
    - Guards: **NEW** `pdf_engine=reportlab|external`, validate fallback doesn't crash
    - Assert: PDF size > 8KB, `pdf_engine` logged

---

## 3. Extended Silent-Failure Heuristics

### 3A. Current Implementation (ODT→DOCX only)
**Location**: `convert_service.py:752-768`
```python
# DOCX stage size + suspected-blank guard for ODT/DOCX inputs.
for art in outputs:
    if art.target == "docx":
        docx_bytes = len(art.data or b"")
        logs.append(f"stage_docx_bytes={docx_bytes}")
        if (
            from_format in {"odt", "docx"}  # ← Current scope
            and approx_bytes > BLANK_OUTPUT_INPUT_THRESHOLD_BYTES  # 4KB
            and docx_bytes < BLANK_OUTPUT_OUTPUT_THRESHOLD_BYTES   # 1KB
        ):
            logs.append("suspected_blank_output=docx")
```

### 3B. Proposed Extensions (Passive Logging Only)

#### Extension 1: HTML → DOCX (Line 759)
```python
from_format in {"odt", "docx", "html"}  # Add "html" to existing check
```
**Rationale**: HTML tables/semantic content can also produce blank DOCX if direct path fails silently.

#### Extension 2: Markdown Content Loss Guard (After line 722)
```python
# After normalise_markdown call, before building artifacts
cleaned_bytes = len(cleaned_text.encode('utf-8'))
if from_format in {"docx", "odt", "rtf", "html"} and approx_bytes > 4096:
    if cleaned_bytes < (approx_bytes * 0.1):  # Cleaned MD < 10% of input
        logs.append(f"suspected_content_loss=md ratio={cleaned_bytes}/{approx_bytes}")
```
**Rationale**: Rich formats losing 90%+ content signals Pandoc extraction failure or encoding issues.

#### Extension 3: PDF Extraction Quality (Already exists - validate logging)
**Location**: Lines 618-643
```python
logs.append(f"pdf_engine=pdfminer_six")
logs.append(f"pdf_pages={meta.get('pages_count')}")
logs.append(f"pdf_headings={meta.get('headings_detected')}")
if meta.get('degraded_reason'):
    logs.append(f"pdf_degraded={meta['degraded_reason']}")  # ✓ Already exists
```
**Action**: Add test assertions that validate these logs appear in expected scenarios.

#### Extension 4: Plain Text Extraction Guard (NEW - after direct HTML path)
```python
# For HTML→TXT and similar conversions, after line 956
if target == "txt":
    txt_bytes = len(data)
    logs.append(f"stage_txt_bytes={txt_bytes}")
    if from_format == "html" and approx_bytes > 2048 and txt_bytes < 200:
        logs.append("suspected_truncation=html_to_txt")
```
**Rationale**: HTML→TXT truncation was a known issue (fixed by direct path); guard ensures it doesn't regress.

#### Extension 5: DOCX Roundtrip Fidelity (NEW - extend line 759 block)
```python
# DOCX→DOCX roundtrip should preserve approximate size
if from_format == "docx" and target == "docx":
    size_ratio = docx_bytes / max(approx_bytes, 1)
    if size_ratio < 0.5 or size_ratio > 2.0:
        logs.append(f"suspected_roundtrip_degradation=docx ratio={size_ratio:.2f}")
```
**Rationale**: DOCX roundtrip shouldn't lose 50%+ content or balloon 2x+ without media changes.

---

## 4. Implementation Plan (Execution-Ready)

### Phase 1: Add Missing Fixtures (1 file)
- [ ] Create `tests/fixtures/converter/sample.pdf`
  - Content: 2-page technical doc with headings, lists, code blocks, table
  - Purpose: Validate PDF→MD/TXT layout-aware extraction
  - Size: ~50KB (small enough for CI, large enough to validate extraction)

### Phase 2: Extend Silent-Failure Guards (convert_service.py)
```python
# Line 759: Add HTML to blank-output check
- from_format in {"odt", "docx"}
+ from_format in {"odt", "docx", "html"}

# After line 722: Add markdown content-loss guard
cleaned_bytes = len(cleaned_text.encode('utf-8'))
if from_format in {"docx", "odt", "rtf", "html"} and approx_bytes > 4096:
    if cleaned_bytes < (approx_bytes * 0.1):
        logs.append(f"suspected_content_loss=md ratio={cleaned_bytes}/{approx_bytes}")

# After line 956: Add TXT truncation guard
if target == "txt":
    txt_bytes = len(data)
    logs.append(f"stage_txt_bytes={txt_bytes}")
    if from_format == "html" and approx_bytes > 2048 and txt_bytes < 200:
        logs.append("suspected_truncation=html_to_txt")

# Inside line 754-765 block: Add DOCX roundtrip guard
if from_format == "docx" and target == "docx":
    size_ratio = docx_bytes / max(approx_bytes, 1)
    if size_ratio < 0.5 or size_ratio > 2.0:
        logs.append(f"suspected_roundtrip_degradation=docx ratio={size_ratio:.2f}")
```

### Phase 3: Add Golden Metrics (5 files)
- [ ] `tests/golden/converter/html_input_docx.metrics.json`
- [ ] `tests/golden/converter/sample_pdf_md.metrics.json`
- [ ] `tests/golden/converter/sample_pdf_txt.metrics.json`
- [ ] `tests/golden/converter/docx_report_sample_docx_roundtrip.metrics.json` (if needed)
- [ ] `tests/golden/converter/tech_doc_pdf.metrics.json`

### Phase 4: Add Test Cases
#### Python Tests (test_convert_backend_odt_docx.py)
```python
@pytest.mark.skipif(not HTML_FIXTURE.exists(), reason="HTML fixture missing")
def test_html_to_docx_not_blank_preserves_tables() -> None:
    """HTML→DOCX should preserve table structure and not produce blank output."""
    # Similar structure to existing ODT tests
    # Assert: stage_docx_bytes > threshold, no suspected_blank_output

def test_pdf_to_markdown_layout_aware() -> None:
    """PDF→MD should use layout-aware extraction and detect structure."""
    # Assert: pdf_engine=pdfminer_six, pdf_headings > 0, pdf_lists > 0

def test_docx_roundtrip_no_degradation() -> None:
    """DOCX→DOCX roundtrip should preserve content without suspected degradation."""
    # Assert: no suspected_roundtrip_degradation in logs
```

#### JavaScript Tests (converter_fidelity.mjs)
```javascript
test('converter fidelity – html_input.html → DOCX metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'html_input.html');
  const summary = await runFixture({ input: fixture, fromFormat: 'html', targets: ['docx'] });

  const golden = loadGoldenMetrics('html_input_docx.metrics.json');
  assert.ok(summary.outputs[0].size > golden.min_output_bytes);
  assert.ok(!summary.logs.some(log => log.includes('suspected_blank_output=docx')));
});
```

---

## 5. Test Assertion Strategy (Non-Invasive)

### How Tests Should Assert Silent-Failure Logs
```python
# ✓ GOOD: Assert absence of warning flags (passive validation)
assert "suspected_blank_output=docx" not in " ".join(result.logs)

# ✓ GOOD: Assert presence of telemetry when expected
logs_str = " ".join(result.logs)
assert "stage_docx_bytes=" in logs_str
assert "pdf_engine=pdfminer_six" in logs_str

# ✓ GOOD: Assert metrics match golden thresholds
assert len(docx_bytes) >= golden["min_output_bytes"]

# ✗ BAD: Don't change error behavior
# Never: raise Exception if suspected_blank_output detected
# The logs are for monitoring/debugging, not for failing conversions
```

### Key Principle: Passive Logging Only
- Guards **log warnings** but **never change API semantics**
- Tests **validate logs** and **assert output quality**
- Conversions **continue** even if guards detect issues
- Backend telemetry allows post-hoc analysis without breaking clients

---

## 6. Success Criteria

### Quantitative Metrics
- [ ] 10 format combinations covered by tests (currently ~7)
- [ ] 5 silent-failure heuristics implemented (currently 1)
- [ ] 100% of rich-format conversions have size telemetry logged
- [ ] 0 false positives in CI (guards tuned to avoid noise)

### Qualitative Goals
- [ ] ODT→DOCX blank bug regression caught by CI
- [ ] HTML→DOCX table loss detected by size guard
- [ ] PDF extraction failures visible in logs (`pdf_degraded=`)
- [ ] DOCX roundtrip degradation logged (doesn't fail API)

---

## 7. Risk Mitigation

### False Positives
**Risk**: Legitimate conversions trigger `suspected_*` warnings.
**Mitigation**: Tune thresholds based on fixture analysis. Current 4KB/1KB thresholds are conservative.

### Performance Impact
**Risk**: Extra size logging adds latency.
**Mitigation**: All guards are O(1) length checks on already-computed data. Zero measurable impact.

### Maintenance Burden
**Risk**: Too many golden metrics files to maintain.
**Mitigation**: Focus on 6-10 critical combos. Golden metrics auto-update on explicit fixture changes.

### API Contract
**Risk**: Logging changes might break client expectations.
**Mitigation**: Logs are append-only. No existing log keys removed. Pure addition of telemetry.

---

## 8. Next Steps (Ordered by Priority)

1. **Implement Phase 2 guards** (30 min) — Lines 759, 722, 956 in convert_service.py
2. **Add missing PDF fixture** (20 min) — Create sample.pdf with test content
3. **Extend Python tests** (1 hour) — Add 3 new test functions to test_convert_backend_odt_docx.py
4. **Create golden metrics** (30 min) — Add 5 JSON files with thresholds from existing fixtures
5. **Run CI and tune thresholds** (20 min) — Adjust BLANK_OUTPUT thresholds if false positives occur
6. **Document in AGENTS.md** (10 min) — Update agent context with new guard locations

**Total Estimated Effort**: ~3 hours for complete implementation.

---

## Appendix A: Quick Reference

### Blank Output Thresholds
```python
BLANK_OUTPUT_INPUT_THRESHOLD_BYTES = 4096   # Minimum input to check
BLANK_OUTPUT_OUTPUT_THRESHOLD_BYTES = 1024  # Maximum output before warning
```

### Key Telemetry Log Keys
```
stage_docx_bytes=<N>                     # DOCX output size
stage_raw_md_bytes=<N>                   # Markdown pre-cleanup size
stage_filtered_md_bytes=<N>              # Markdown post-Lua-filters size
stage_cleaned_md_bytes=<N>               # Markdown post-normalization size
stage_txt_bytes=<N>                      # TXT output size (proposed)
suspected_blank_output=docx              # Blank DOCX warning
suspected_content_loss=md ratio=<X>/<Y>  # Markdown content loss warning (proposed)
suspected_truncation=html_to_txt         # HTML→TXT truncation warning (proposed)
suspected_roundtrip_degradation=docx     # DOCX roundtrip size mismatch (proposed)
pdf_engine=pdfminer_six|reportlab        # PDF rendering engine
pdf_degraded=timeout|too_short           # PDF extraction quality warning
```

### Test File Locations
```
tests/fixtures/converter/              # Input fixtures
tests/golden/converter/                # Golden metrics (expected outputs)
tests/converter_fidelity.mjs           # JavaScript metrics validation tests
tests/test_convert_backend_odt_docx.py # Python integration tests
convert_backend/convert_service.py     # Core conversion logic with guards
```

---

**End of Proposal. Ready for implementation.**
