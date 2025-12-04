# TinyUtils Converter Pipeline (High-Level)

This summarizes how a request to `/api/convert` flows through the TinyUtils
converter stack today.

## 1. HTTP layer (FastAPI)

- Entry points:
  - `POST /api/convert` → `api/convert/app.py:convert_alias()` → `convert()`
  - `POST /` (internal/compat) → `convert()`
- Request model: `ConvertRequest` with
  - `inputs[]`: `InputItem { blobUrl | text, name }`
  - `from` → `source_format`
  - `to` → `targets[]` (normalized to `md|html|txt`)
  - `options`: `Options` (maps onto `ConversionOptions` in `convert/types.py`)

Key steps in `convert()`:

1. Assign/propagate `request_id` and log basic metadata.
2. `_ensure_convert_imports()` loads local `convert_service` and `convert_types`.
3. Resolve `_download_payloads_fn` and `convert_batch_fn` (preferring
   `tinyutils.api.convert.index` if present for enhanced behaviors).
4. Build a job workspace via `job_workspace()`.
5. Download/prepare inputs into that workspace via `_download_payloads()`.
6. Build `ConverterOptions` from `Options`, only including flags present in the
   `ConversionOptions` signature for forward/backward compatibility.
7. Ask the pandoc runner to `apply_lua_filters(converter_options, opts_dict)`
   on a best‑effort basis (no‑op if unsupported).
8. Call `convert_batch_fn(inputs, targets, from_format, options[, preview])`.
9. Serialize results (`_serialize_outputs`, `_select_preview`,
   `_serialize_errors`) into the JSON response.

## 2. Batch and per‑document conversion

File: `convert/service.py`

- `convert_batch()`
  - Validates non‑empty `inputs`.
  - Normalizes targets via `_normalize_targets()`.
  - Assigns a `job_id` (`generate_job_id()`), builds `batch_logs`.
  - Loops over `InputPayload` entries and calls `convert_one()` per payload.

- `convert_one()` (core path):
  1. Normalizes targets and computes a cache key using
     `ConversionOptions`, `from_format`, and pandoc version.
  2. Performs a cache lookup; on hit, returns a cloned `ConversionResult`.
  3. Ensures pandoc is available (`pandoc_runner.ensure_pandoc()`).
  4. Creates an isolated workspace via `job_workspace()`.
  5. Writes the input bytes to `<workspace>/<safe_name>`.
  6. Defines paths:
     - `raw.md`      – first pandoc pass output.
     - `filtered.md` – Lua‑filtered markdown.
     - `cleaned.md`  – post‑processed markdown.
     - `media/`      – optional extract‑media target.
  7. Calls `pandoc_runner.convert_to_markdown()` with
     `accept_tracked_changes`, optional `extract_media_dir`, and
     `from_format`.
  8. Runs `pandoc_runner.apply_lua_filters(raw_md, filtered_md)` to apply the
     Lua filter chain (soft breaks, empty spans, list normalization, etc.).
  9. Loads `raw.md` and `filtered.md` as text and passes the filtered text to
     `normalise_markdown()` (unicode/whitespace cleanup); writes `cleaned.md`.
 10. Builds target artifacts via `_build_target_artifacts()`:
     - `md`   → returns `cleaned_text` bytes.
     - `html`/`txt` → calls `_render_markdown_target()` which delegates to
       `pypandoc.convert_file()` (second pandoc leg, using cleaned markdown).
 11. Builds `PreviewData`:
     - `headings=collect_headings(cleaned_text)`
     - `snippets=build_snippets(before_text, cleaned_text)`
     - `images=media_manifest(extract_dir)`
 12. Optionally builds a ZIP `MediaArtifact` from `media/` via
     `_build_media_artifact()`.
 13. Returns `ConversionResult` and stores it in the in‑memory LRU cache.

- Fallback path: on pandoc errors, `_fallback_conversion()` returns
  pass‑through text/HTML versions with a basic `<pre>` wrapper and a
  `fallback=1` log entry.

## 3. Pandoc runner + Lua filters

File: `api/_lib/pandoc_runner.py`

- Uses `pypandoc` with:
  - `DEFAULT_OUTPUT_FORMAT = "gfm+pipe_tables+footnotes+tex_math_dollars"`
  - `BASE_ARGS = ["--wrap=none", "--reference-links"]`
  - Dynamic heading flag: `--markdown-headings=atx` (pandoc ≥3) or
    `--atx-headers` (older).

- `convert_to_markdown(source, destination, from_format, ...)`:
  - Builds args: heading flag + `BASE_ARGS` + `--track-changes=accept` (when
    `accept_tracked_changes=True`) + `--extract-media` (when requested).
  - For `from_format == "html"`, also adds HTML‑specific Lua filters:
    - `filters/figure_to_markdown.lua`.
  - Calls `pypandoc.convert_file(..., to=DEFAULT_OUTPUT_FORMAT, format=from_format)`
    to produce `raw.md`.

- `apply_lua_filters(source, destination)`:
  - Discovers Lua filters in `FILTER_DIR` (repo‑level `filters/` directory):
    - `softbreak_to_space.lua`
    - `strip_empty_spans.lua`
    - `normalize_lists.lua`
  - Runs `pypandoc.convert_file(..., to=DEFAULT_OUTPUT_FORMAT, format="gfm")`
    with `--lua-filter=<filter>` for each.

Pandoc binary resolution is handled via vendored artifacts and optional
decompression (`pandoc.xz`) when needed for environments like Vercel.

## 4. Markdown cleanup and manifests

- File: `api/_lib/text_clean.py`
  - `normalise_markdown(text, remove_zero_width=True)`:
    - NFC‑normalizes unicode.
    - Replaces non‑breaking spaces with regular spaces.
    - Optionally removes zero‑width characters.
    - Trims trailing whitespace on each line.
    - Collapses 3+ consecutive blank lines down to 2.
    - Returns `(normalised_text, CleanupStats)`.

- File: `api/_lib/manifests.py`
  - `collect_headings(markdown)`:
    - Scans lines beginning with `#` and collects up to
      `PREVIEW_HEADINGS_N` headings.
  - `build_snippets(before, after)`:
    - Uses a unified diff over `before` vs `after` and builds up to
      `PREVIEW_SNIPPETS_M` `{before, after}` snippet pairs.
  - `media_manifest(media_dir)`:
    - Walks extracted media directory and returns a list of `{file, size}`
      entries for preview/diagnostic use.

Together, these power the `preview` field returned by `/api/convert` while the
main textual outputs come from `cleaned.md` and, for non‑markdown targets,
`_render_markdown_target()`.

## 5. Format Coverage & Quality Policies (Updated 2025-12-03)

### Supported Input Formats

The converter now has comprehensive test coverage for all major rich-text formats:

**Office Formats:**
- **DOCX** (Word) — Full support with footnotes, headings, lists, tables, images
- **ODT** (LibreOffice) — Full support with footnotes, structure preservation
- **RTF** (Rich Text Format) — Headings, lists, tables, basic formatting

**Academic/Technical Formats:**
- **LaTeX** — Equations (display + inline), code blocks, sections, footnotes
- **PDF** — Layout-based text extraction (fuzzy, content-centric)

**Web Formats:**
- **HTML** — Full support with figure/image extraction
- **Markdown** — Native format (GFM with extensions)

All conversions support **100+ format pairs** via pandoc's universal document model.

### Quality Metrics & Testing

**Test Infrastructure:**
- `tests/converter/fixture_runner.py` — Tracks footnoteCount (Note nodes), headingCount (Header nodes)
- Golden metrics stored in `tests/golden/converter/*.metrics.json` for regression detection
- 42 total tests: 30 backend Python + 12 Node.js fidelity tests
- All tests verify **quality** (readability, structure, formatting) not just success

**Coverage:**
- Footnote preservation end-to-end (DOCX/ODT ↔ MD)
- LaTeX equations (display + inline) for STEM documents
- RTF structure and formatting fidelity
- PDF text extraction quality (readability, character ratios)
- Track changes acceptance (final text only)
- Comments dropping (pandoc default)

### Policies & Non-Goals

**Track Changes:** ALWAYS accepted (`--track-changes=accept` flag in `pandoc_runner.py`)
- Output contains final text only, no revision marks
- Configured via `ConversionOptions.accept_tracked_changes` (defaults to `True`)

**Comments:** ALWAYS dropped (pandoc default behavior)
- Word/ODT comments do not appear in outputs
- Documented as intentional limitation (clean output focus)

**Headers/Footers:** HIGH PRIORITY GOAL (pandoc limitation, GitHub #5211)
- Pandoc does NOT extract page headers/footers - this is a known limitation
- **Workaround implemented:** Use `python-docx` to extract headers/footers separately
- Tests in `test_convert_backend_headers_footers.py` document behavior and validate extraction
- Future: Integrate into main pipeline with `ConversionOptions.include_headers_footers` flag

**Page Layout:** NOT preserved
- Page size, margins, columns NOT maintained
- Output is continuous flow (Markdown/HTML paradigm)

**What IS Preserved:**
- Document structure (headings, paragraphs, sections)
- Lists (bullet, numbered, nested)
- Tables (structure, alignment)
- Formatting (bold, italic, code, blockquotes)
- Media (images extracted and referenced)
- Footnotes/endnotes (with `[^N]` markers)
- Equations (LaTeX math syntax)
- Cross-references (links, anchors)

This **content-centric** approach prioritizes reliable text/structure extraction over pixel-perfect layout reconstruction.

