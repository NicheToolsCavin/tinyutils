# Pandoc Vendor Implementation Summary

Based on the chat transcript from November 8, 2025, the following changes were implemented to create a vendor script strategy for pandoc that works locally (macOS dev) and on Vercel preview/serverless.

## Changes Made

### 1. scripts/vendor_pandoc.py
- Added a script to download Linux pandoc binary from upstream release
- Script downloads, verifies (if available) and extracts the binary
- Places binary at `tinyutils/api/_vendor/pandoc/pandoc` with 0755 mode
- Intentionally does not touch macOS binaries to keep repo thin

### 2. tinyutils/api/_lib/pandoc_runner.py
- Implemented vendoring strategy with a fallback chain:
  1. First preference: honor `os.environ.get("PYPANDOC_PANDOC")`
  2. If unset, check for vendored path at `api/_vendor/pandoc/pandoc`
  3. If neither exists, fall back to current behavior (system pandoc)
- The runner automatically picks up the vendored binary when available

### 3. tinyutils/api/convert/index.py
- API endpoint properly handles and echoes `x-request-id` header
- Includes proper response envelope with toolVersions, logs, errors fields
- Uses FastAPI with proper return types and error handling

### 4. tinyutils/convert/service.py
- Service layer uses the runner's resolved path
- No hard-coded references elsewhere
- Includes comments explaining Vercel uses the vendored binary

## Behavior Differences

### Local macOS development:
- Normal workflow continues
- `PYPANDOC_PANDOC` remains optional
- Developers can run the vendor script to update Linux binary but don't need it for day-to-day work

### Vercel preview/serverless:
- Deploy artifact includes `tinyutils/api/_vendor/pandoc/pandoc`
- Runner automatically picks up the vendored binary
- No extra environment configuration required in Vercel

## Testing
- Added/adjusted lightweight tests to mock pandoc_runner resolution
- Tests confirm it prefers env var, then vendored path, then default
- Uses tmp_path or monkeypatch Path.exists to simulate presence/absence