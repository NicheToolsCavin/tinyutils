# Tiny-reactive UI E2E harness

This directory contains tiny-reactive driven end-to-end UI flows for TinyUtils.

## Prerequisites

- A Vercel preview (or production) URL for the site.
- A running tiny-reactive HTTP server that allows this repo as an origin.

Example tiny-reactive command (adjust path/port/token as needed):

```bash
HTTP_API_ENABLED=true \
HTTP_API_TOKEN=dev123 \
node dist/src/cli/tiny-reactive.js serve --host 127.0.0.1 --port 5566 --headful --debug
```

## Environment variables

The E2E scripts expect these variables to be set:

- `PREVIEW_URL` – base URL for the TinyUtils site (e.g. `https://tinyutils.net` or a Vercel preview URL).
- `TINY_REACTIVE_BASE_URL` – base URL for the tiny-reactive HTTP API (e.g. `http://localhost:5566`).
- `TINY_REACTIVE_TOKEN` – bearer token that tiny-reactive expects for HTTP API requests.

If any of these are missing, the scripts will fail fast with a non-zero exit code.

## Running the converter exemplar

The first flow exercises the text converter preview path:

```bash
node tests/e2e/tiny-reactive-harness.mjs
```

On success it will:

- Navigate to `/tools/text-converter/`.
- Type a small Markdown snippet.
- Trigger the Preview action.
- Wait for the preview iframe to receive content.
- Capture a screenshot and JSON summary under `artifacts/ui/converter/<YYYYMMDD>/`.

## Running all E2E flows

As more tool-specific flows are added, use the aggregator script:

```bash
node tests/e2e/run-all.mjs
```

For now this invokes the converter, Dead Link Finder, Sitemap Delta, Wayback Fixer, Encoding Doctor, Keyword Density, and Meta Preview flows and emits a small aggregated JSON summary alongside the per-tool artifacts.
