# Converter Fidelity Regression Test Plan (Scaffold)

This note sketches how to turn the existing converter fixtures and
baselines into repeatable regression tests. It does not introduce any
new frameworks: everything builds on Node's built‑in test runner plus
small Python helpers and `pandoc`.

## Goals

- Catch regressions in:
  - Ordered / unordered / nested lists.
  - Fenced code blocks and language tags.
  - Embedded DOCX images and media metadata.
  - HTML → Markdown behavior for `data:` URLs.
- Reuse existing assets:
  - Fixtures: `tests/fixtures/converter/*`.
  - Baselines: `artifacts/converter-fidelity/20251119/baseline/`.

## Pieces to add (high level)

- **Python helper:** `tests/converter/fixture_runner.py`
  - Calls the library converter (`convert.service.convert_one`).
  - Later will emit `pandoc --to=json` AST and derived metrics for
    lists / code / images.

- **Node tests:**
  - `tests/converter_fidelity.mjs`
    - Orchestrates fixture runs via the Python helper.
    - Asserts structural invariants for each fixture (eventually using
      AST metrics).
  - `tests/converter_api_smoke.mjs`
    - Basic `/api/convert` smokes using representative payloads.
    - Ensures the Edge API envelope stays stable and broadly matches
      service‑level behavior.

- **Goldens:**
  - Derived from the baseline harness
    (`scripts/run_converter_baseline.py`) and, later, from AST metrics.
  - Stored under `tests/golden/converter/` in a compact JSON form so
    tests compare structure rather than full text.

The rest of the work will implement these files in small, testable
steps, using the existing `npm test` / `node --test` flow.

