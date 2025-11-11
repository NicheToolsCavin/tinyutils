# Converter API Contract

Snapshot of the `/api/convert` FastAPI endpoint on branch `feature/universal-converter-backend` (generated 2025-11-08, CET).

## Endpoint
- **Method:** `POST`
- **Path:** `/api/convert`
- **Auth:** preview fence (401 until `PREVIEW_SECRET` accepted) still applies to preview deployments.

## Required Headers
| Header | Value | Notes |
| --- | --- | --- |
| `content-type` | `application/json` | All requests are JSON.
| `x-request-id` (optional) | caller-supplied ID | If omitted, backend generates a UUID and echoes it back. |

## Request Body
```json
{
  "inputs": [
    { "blobUrl": "data:…" , "name": "doc.docx" }
  ],
  "from": "markdown",      // optional source format override
  "to": ["md", "html"],     // string or non-empty array, defaults to ["md"]
  "options": {
    "acceptTrackedChanges": true,
    "extractMedia": false,
    "removeZeroWidth": true
  }
}
```

## Successful Response (200)
- **Headers:**
  - `content-type: application/json; charset=utf-8`
  - `cache-control: no-store`
  - `x-request-id: <same as request>`
- **Body:**
```json
{
  "jobId": "8e1a…",
  "toolVersions": { "pandoc": "3.1.11" },
  "logs": ["job_id=…", "input.docx:targets=md"],
  "outputs": [
    { "name": "doc.md", "size": 1234, "blobUrl": "https://…", "target": "md" },
    { "name": "doc-media.zip", "size": 2048, "blobUrl": "https://…", "target": "media" }
  ],
  "preview": {
    "headings": ["# Title"],
    "snippets": [{"before": "…", "after": "…"}],
    "images": [{"src": "media/image001.png", "alt": "Figure 1" }]
  },
  "errors": []
}
```

### Media Outputs
- When `options.extractMedia=true` and pandoc extracts assets, a `*-media.zip` bundle is appended to `outputs` with `target: "media"`.
- ZIP contains the raw files plus pandoc-created folder structure (no manifest yet).

### Logs Array
- Aggregated from batch + per-input logs (e.g., `job_id`, `targets`, cleanup stats, cache hits).
- Always returned so clients can surface server-side events.

## Partial Success
- Each input is converted independently.
- `outputs` only contains successful artifacts.
- `errors` lists failed inputs: `{ "input": "bad.docx", "message": "boom", "kind": "RuntimeError" }`.
- `logs` still includes entries for both successes and failures.

## Error Responses
| HTTP | Detail | Notes |
| --- | --- | --- |
| 400 | Validation failures (empty inputs, bad `to`, blob download failure) | Same headers (`x-request-id`, `no-store`). |
| 500 | Unexpected converter failure | Message: `"Internal server error during conversion"`. |

Both error cases return the FastAPI default envelope: `{ "detail": "…" }` with the appropriate headers.

## Blob URLs
- Responses always populate `outputs[].blobUrl` / media `blobUrl` by calling `tinyutils.api._lib.blob.upload_bytes`.
- When `BLOB_READ_WRITE_TOKEN` is configured, URLs will be Vercel Blob HTTPS URLs; otherwise the helper falls back to `data:` URIs for local/testing scenarios.
- Env vars:
  - `BLOB_READ_WRITE_TOKEN` — required for preview/prod deploys so uploads land in Vercel Blob. Store it in `.env.preview.local` / Vercel project settings before running `scripts/smoke_convert_preview.mjs`.
  - `VERCEL_BLOB_API_URL` — optional override for staging Blob endpoints; defaults to `https://api.vercel.com/v2/blob/upload`.
- When the token is missing or `_upload_to_vercel_blob` raises, the helper never retries network calls; it emits inline `data:` URLs (base64-encoded payload) so preview lambdas still succeed.
- Evidence expectations: capture both blob-backed and data-URL responses under `tinyutils/artifacts/convert/<date>/blob-ready/` whenever the token changes.

## Pandoc availability
- Startup logs include `pandoc availability status=…` so preview smoke evidence captures whether the vendored binary loaded.
- Resolution order: `PYPANDOC_PANDOC` override → vendored binary at `tinyutils/api/_vendor/pandoc/pandoc` → system `pandoc` on `PATH` (local dev only).
- If no binary is found, the API short-circuits to the passthrough fallback (same 200 response, `fallback=1` in logs) instead of erroring or attempting runtime downloads.

## Notes
- Per-file limit: 100 MB (enforced during download). Batch limit: 1 GB.
- Jobs run in ephemeral `/tmp`; artifacts are only persisted via blob uploads.
- Caching: `convert_batch` reuses single-file cache entries so repeated payloads stay fast, but cache hits are transparent to clients (only reflected in `logs`).
