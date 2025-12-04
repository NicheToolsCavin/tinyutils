# Santa's Master Plan – Implementation Summary

Branch: `feat/converter-test-coverage-100pct`  
Date: 2025-12-04

## Scope

- Phases 1–5: Converter backend coverage, LibreOffice integration, extractors, page-break/comments polish, and local E2E tests.  
- Phase 6: Preview/tiny-reactive harnesses for converter and Bulk Find & Replace (Bulk Replace) on the current Vercel preview.

## Phases 1–5 – Backend & Local Tests

- **Phase 1 – Test coverage**  
  - Added DOCX fixtures and tests for cross-references and text boxes/shapes (10 tests total).  
  - Files: `scripts/create_cross_references_fixture.py`, `scripts/create_textboxes_shapes_fixture.py`, `tests/fixtures/converter/*_sample.docx`, `tests/test_convert_backend_cross_references.py`, `tests/test_convert_backend_textboxes_shapes.py`.

- **Phase 2 – GCloud/infra stubs**  
  - Added non-live stubs for GCloud/LibreOffice deployment: `gcloud/config.yaml`, `gcloud/libreoffice/Dockerfile`, `gcloud/libreoffice/main.py`, `gcloud/deploy.sh`, `convert_backend/gcloud_storage.py`.  
  - These are clearly marked as stubs; no production deploy performed.

- **Phase 3 – LibreOffice + color/alignment**  
  - Extended `ConversionOptions` with `use_libreoffice`, `preserve_colors`, `preserve_alignment`.  
  - Implemented `convert_backend/libreoffice_converter.py` and optional HTML pre-processing path for DOCX/ODT/RTF when LibreOffice is available.  
  - Tests: `tests/test_convert_backend_color_preservation.py` (cleanly skipped when `soffice` is absent).

- **Phase 4 – Extractor helpers**  
  - Added helpers and unit tests:
    - `paragraph_extractor.py` / `tests/test_paragraph_extractor_unit.py`  
    - `field_extractor.py` / `tests/test_field_extractor_unit.py`  
    - `bookmark_converter.py` / `tests/test_bookmark_converter_unit.py`  
    - `page_break_marker.py` / `tests/test_page_break_marker_unit.py`

- **Phase 5 – Page-break markers & comments + local E2E**  
  - New flags in `convert_backend/convert_types.py`: `insert_page_break_markers`, `extract_comments`.  
  - Integrated in `convert_backend/convert_service.py` (DOCX-only, opt-in) using `page_break_marker` and `comments_extractor`.  
  - Tests: `tests/test_convert_backend_page_breaks.py`, `tests/test_convert_backend_comments.py`.  
  - Local non-preview E2E harness: `tests/e2e/converter-phase5-local.test.mjs` (hits local `/api/convert`).

### Backend test status

- Environment: `.venv-convert`  
- Command: `.venv-convert/bin/python -m pytest tests/test_convert_backend*.py -v`  
- Result: **187 collected, 181 passed, 6 skipped, 0 failed** (skips are LibreOffice/ODT-dependent tests).  
- Extractor unit tests: `tests/test_paragraph_extractor_unit.py`, `tests/test_field_extractor_unit.py`, `tests/test_bookmark_converter_unit.py`, `tests/test_page_break_marker_unit.py` all pass.

## Phase 6 – Preview / Tiny-Reactive Harnesses

### Converter preview harnesses (PASS)

- **Color/alignment markers**  
  - File: `tests/e2e/converter-color-alignment-tiny-reactive-harness.mjs`.  
  - Behaviour: drives `/tools/text-converter/` on the Vercel preview via tiny-reactive, fills synthetic content with color/alignment markers, runs Convert, fetches the first download, and asserts markers are present.  
  - Artifacts: `artifacts/ui/converter/20251204/converter-color-alignment.{json,png}`.  
  - Status: **PASS**.

- **Page-break markers**  
  - File: `tests/e2e/converter-page-break-tiny-reactive-harness.mjs`.  
  - Behaviour: similar flow with page/section break markers; asserts BEFORE/AFTER + section markers and ordering in the downloaded content.  
  - Artifacts: `artifacts/ui/converter/20251204/converter-page-break.{json,png}`.  
  - Status: **PASS**.

### Bulk Replace preview harnesses

- **UI harness**  
  - File: `tests/e2e/bulk-replace-tiny-reactive-harness.mjs` (via `tools.bulkFindReplace` → `/tools/multi-file-search-replace/`).  
  - Behaviour: opens Bulk Find & Replace tool, waits for upload + find/replace controls, fills fields, and captures a screenshot + JSON summary.  
  - Artifacts: `artifacts/ui/bulk-find-replace/20251204/bulk-replace-smoke.{json,png}`.  
  - Status: **PASS** (UI reachable; inputs present).

- **API smoke (env-blocked)**  
  - File: `tests/e2e/bulk-replace-api-smoke.mjs` (ESM minimal GET smoke).  
  - Behaviour: performs a GET to `${PREVIEW_URL}/api/bulk-replace` with bypass headers and records status/body under `artifacts/api/bulk-find-replace/<date>/`.  
  - Result in this environment: `fetch failed` in the harness, and direct curl diagnostics show a Vercel-level 307 redirect loop:
    - `HTTP/2 307` with `content-type: text/plain`, body `Redirecting…`, `Location: /api/bulk-replace`, repeated `_vercel_jwt` cookies.  
    - Follow-up `curl -L` hits the 307 loop and exits with `curl: (47) Maximum (50) redirects followed`.  
  - Artifacts: `artifacts/api/bulk-find-replace/20251204/` (status, headers, body, curl stderr).  
  - Classification: **env-blocked by Vercel redirect loop**, not a confirmed app/JSON contract failure.

## Owner Follow-Up (Bulk Replace API)

- **Task:** Fix `/api/bulk-replace` redirect loop on the TinyUtils Vercel project so that preview requests reach the Python handler.  
- **Current behaviour:**  
  - Endpoint exists but responds with a 307 text/plain "Redirecting…" loop back to `/api/bulk-replace`, even with automation bypass headers and preview secret.  
  - Bulk Replace UI preview is healthy; only the API is blocked at the edge layer.  
- **Where it’s documented:**  
  - `USER_CHECKLIST.md` → Workstream 2: Bulk Replace API (note about the 307 loop and preview URL).  
  - `docs/AGENT_RUN_LOG.md` and OpenMemory entries for Santa Phase 6 diagnostics.  
- **After fix:** re-run `tests/e2e/bulk-replace-api-smoke.mjs` and, optionally, a dedicated preview smoke (e.g., `scripts/smoke_bulk_replace_preview.mjs`) to confirm a 200/400 JSON response and update checklist/logs accordingly.

