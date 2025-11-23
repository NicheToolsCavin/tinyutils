## tool_desc_encoding-doctor.md

### Date: November 22, 2025  (original spec)

#### Purpose
Encoding Doctor is a small utility that takes mojibake-ridden or otherwise mis-encoded text and produces clean, readable output. It focuses on the most common UTF‑8 vs Latin‑1/Windows‑1252 glitches (e.g., `FranÃ§ois dâ€™Arcy â€” résumé`) and light smart‑punctuation/whitespace fixes, without attempting to be a full encoding detector for every script.

Users can paste text directly or upload files; the tool shows a before/after comparison, a short human summary of what changed, and download links for fixed file content.

#### Inputs (UI)
- **Pasted text** (textarea) — optional, but at least some pasted text or one file is required.
- **Files** (file input, multiple) — text-friendly formats recommended (TXT, MD, HTML, DOCX, PDF, RTF, ODT, and formats supported by the Document Converter).
- **Repair settings**:
  - `Auto-repair mojibake` (on by default): applies a curated CP1252 mapping and common mojibake fixes.
  - `Smart punctuation & whitespace cleanup` (on by default): fixes apostrophes, dashes, ellipsis, non-breaking spaces, trailing whitespace.
  - `Unicode normalization` (select): NFC (default), NFKC, or none.

#### Processing (server)
1. **Validation & limits**
   - Enforces a strict character limit for pasted text (`MAX_TEXT_CHARS`) and a per-blob byte limit for decoded file content (`MAX_BLOB_BYTES`). Requests over these limits are rejected with clear 4xx JSON envelopes (`text_too_large`, `blob_payload_too_large`).
   - For file flows, Encoding Doctor calls `/api/convert` to turn uploaded documents into Markdown text, then downloads the resulting blobs.
   - `loadTextFromBlobUrl` only accepts:
     - `data:` URLs, or
     - `http(s)` URLs on allowed hosts (`tinyutils.net`, `www.tinyutils.net`, `*.tinyutils.net`, `*.vercel.app`), while blocking localhost/RFC1918/`.local` hosts.
   - Per-download bytes are capped using both `content-length` (when available) and the actual decoded buffer length to avoid SSRF/abuse.

2. **Text repair pipeline**
   - **Optional latin1→UTF‑8 fallback**: when `autoRepair` is enabled and the input contains strong mojibake signals (e.g., many `Ã`/`Â` fragments), the handler attempts a lightweight latin1→UTF‑8 re-decode. It only keeps the fallback if it reduces mojibake signals.
   - **Mojibake map**: applies a curated mapping for common CP1252/UTF‑8 mishaps (accented characters, smart punctuation, ellipsis, bullets, etc.).
   - **Unicode normalization**: if configured, the text is normalized to the chosen form (NFC or NFKC), setting a `normalizationApplied` flag.
   - **Smart punctuation & whitespace**: optional pass to fix apostrophes within words, long hyphen runs to em dash, triple dots to ellipsis, non-breaking spaces to spaces, and trailing whitespace before newlines.

3. **File handling**
   - For each Markdown blob, Encoding Doctor:
     - Downloads and decodes the text (with `loadTextFromBlobUrl` safeguards).
     - Runs the same `repairText` pipeline as for pasted text.
     - Builds `previewOriginal`/`previewFixed` by truncating to a configured preview length.
     - Encodes the fixed Markdown as a `data:` URL (`data:text/markdown;base64,...`) suitable for download.

#### Output
- **API JSON** (`/api/encoding-doctor`):
  - `ok` — boolean.
  - `meta` — object with:
    - `requestId` — stable request identifier (mirrored in `x-request-id`).
    - `textIncluded` — whether pasted text was processed.
    - `fileCount` — number of file results.
    - `options` — echo of the effective repair options.
  - `text` — `{ original, fixed, summary }` for pasted text (if any), where `summary` is a human-readable sentence built from stats.
  - `files` — array of per-file entries `{ name, summary, previewOriginal, previewFixed, blobUrl, contentType }`.

- **UI** (`/tools/encoding-doctor/`):
  - Side-by-side “Original (preview)” and “Fixed text” areas, each with its own **Copy** button.
  - A prominent change summary below the text areas, exposed as `role="status"` with `aria-live="polite"` so screen readers hear what changed.
  - A table of file results with columns for file name, summary, preview (before → after), and a “Download fixed” button using the normalized `data:` URLs.

#### UI/UX
- Keyboard shortcuts:
  - **Cmd/Ctrl+Enter** runs Encoding Doctor, even when the main textarea has focus, and then returns focus to the “Fixed text” area for quick copying.
  - Plain Enter behaves normally inside the textarea (no accidental runs).
- Status line and error box:
  - `#statusText` provides high-level state (preparing input, contacting API, finished), announced via `aria-live`.
  - `#errorBox` is `role="alert"` for errors, showing human-readable messages plus optional technical notes.
- Copy affordances:
  - “Copy original” and “Copy fixed” buttons call `navigator.clipboard.writeText` and update the status line with success/error feedback.

#### Success criteria / examples
- Pasted mojibake like `FranÃ§ois dâ€™Arcy â€” résumé` is repaired to `François d’Arcy — résumé`, with a summary mentioning fixed mojibake sequences and punctuation.
- A multi‑MB paste is rejected early with a clear “text too large” error and a stable error code in JSON, instead of stalling the Edge function.
- Uploading a large converted Markdown blob that exceeds safety caps yields a `blob_payload_too_large` 413 response instead of silently failing or overloading the runtime.

#### Non-goals
- Encoding Doctor does **not** attempt full automatic language/encoding detection for every script (e.g., arbitrary legacy encodings for CJK, Cyrillic, etc.). It focuses on common web/Latin‑1/UTF‑8 issues.
- It is not a general-purpose diff/merge tool; previews are short textual summaries, not full visual diffs.

#### Human-readable description

Encoding Doctor is like a translator for broken text. When you see things like `FranÃ§ois dâ€™Arcy â€” résumé` instead of “François d’Arcy — résumé”, this tool tries to untangle what went wrong: it fixes common UTF‑8/Latin‑1 mixups, gently cleans up punctuation and whitespace, and optionally normalizes Unicode so search and indexing behave.

You can paste problem text or upload documents. The tool shows a side‑by‑side before/after view, tells you in plain language what it fixed, and lets you copy the cleaned‑up text or download fixed files — all while enforcing strict size and host limits so it stays safe to run at the Edge.

---

### Major changes — 2025-11-22 17:05 CET (UTC+01:00) — WS3 safety limits, blobUrl hardening, latin1 fallback, and UX copy

Added
• Hard caps for pasted text length (`MAX_TEXT_CHARS`) and per-blob decoded bytes (`MAX_BLOB_BYTES`) in `api/encoding-doctor.js`, returning clear JSON error envelopes (`text_too_large`, `blob_payload_too_large`) with 4xx status codes instead of risking Edge timeouts.
• A strict `loadTextFromBlobUrl` guard that only accepts `data:` URLs or `http(s)` URLs on TinyUtils-controlled hosts (`tinyutils.net`, `www.tinyutils.net`, `*.tinyutils.net`, `*.vercel.app`) and enforces per-download byte ceilings using both `Content-Length` and actual buffer length.
• A latin1→UTF‑8 fallback in the `repairText` pipeline that activates only when “strong mojibake signals” are present (multiple CP1252-style fragments) and only keeps the fallback if it reduces mojibake counts, tracked via `stats.latin1FallbackApplied` and reflected in the summary.
• Frontend copy controls for the text results: “Copy original” and “Copy fixed” buttons wired to `navigator.clipboard`, with status text feedback.
• An `aria-live="polite"`/`role="status"` summary line under the text results so screen readers hear what changed (e.g., how many mojibake sequences or dashes were normalized).

Modified
• The Encoding Doctor UI now treats the change summary as a primary result, visually and accessibly, rather than a small, quiet line under the text areas.
• Keyboard handling was adjusted so Cmd/Ctrl+Enter runs the tool even when focus is in the textarea and shifts focus to the “Fixed text” box on success, while plain Enter continues to behave normally.
• Error envelopes from blob downloads distinguish between size issues (`blob_payload_too_large` with 413), invalid URLs (`invalid_blob_url` / `unsupported_blob_scheme`), and disallowed hosts (`disallowed_blob_host`), all surfaced as stable `meta.note` values.

Fixed
• Potential unbounded processing of very large pasted text or converted Markdown blobs.
  - **Problem:** Encoding Doctor would happily attempt to normalize multi‑MB pastes or very large converted blobs, risking extended CPU/memory usage in the Edge runtime.
  - **Root cause:** No hard limits were enforced on `body.text` length or decoded blob sizes in `loadTextFromBlobUrl`.
  - **Fix:** Introduced `MAX_TEXT_CHARS` and `MAX_BLOB_BYTES` caps, rejecting oversize inputs with explicit 413 error envelopes and stable `meta.note` codes.
  - **Evidence:** New tests in `tests/encoding-doctor.test.mjs` cover text and blob over-limit scenarios; `node --test` green.

• Ambiguous mojibake repair for heavily corrupted Latin‑1/UTF‑8 mixes.
  - **Problem:** The CP1252 mapping fixed many characters but some “double-decoded” text (e.g., repeated `FranÃ§` fragments) remained noisy, and there was no dedicated latin1→UTF‑8 pass.
  - **Root cause:** The repair pipeline only applied per-character mappings; it never attempted to reinterpret the whole string as bytes from a legacy encoding.
  - **Fix:** Added a guarded latin1→UTF‑8 fallback that only runs when multiple mojibake tokens are present and only keeps the decoded version if it reduces mojibake signals; the summary explicitly notes when this fallback was applied.
  - **Evidence:** New latin1 fallback test in `tests/encoding-doctor.test.mjs` verifies that “FranÃ§…” cases are cleaned up and that the fixed text no longer contains common mojibake fragments.

Human-readable summary

**Problem 1: It was possible to paste or convert “monster” inputs that could stress the Edge runtime.**
Encoding Doctor didn’t strictly limit how much text it would normalize. A user could paste a multi-megabyte blob or feed in a very large converted file, and the service would try to fully normalize it, risking timeouts or memory pressure.

**Problem 2: Some of the worst Latin‑1/UTF‑8 tangles still slipped through.**
The tool already had a good mapping table, but in very noisy cases (lots of `Ã`/`Â` sequences) it was still treating each character in isolation instead of re-decoding the text as a whole.

**The fix:** Encoding Doctor now behaves like a cautious doctor:
- It refuses “supersized” inputs with clear error messages instead of trying to fix them blindly.
- It only fetches blobs from known-safe hosts and caps how many bytes it will bring into memory.
- When the text clearly looks like it was decoded in the wrong encoding, it attempts a careful latin1→UTF‑8 re-decoding and only keeps it if things genuinely look better.

On the frontend, you get easier copy buttons, a more obvious summary of what changed, and a keyboard shortcut that works even when you’re actively editing the text.

Impact
• Safer Edge execution: Encoding Doctor enforces strict input size/host limits and surfaces clear 4xx errors instead of timing out silently. ✅
• Better repairs for typical UTF‑8/Latin‑1 mojibake, with a transparent note when a latin1 fallback was applied. ✅
• Improved UX/accessibility: copying fixed text is one click, summaries are read out to assistive tech, and Cmd/Ctrl+Enter runs the tool without leaving the keyboard. ✅

Testing
• `node --test` including new `encoding-doctor` tests for size limits and latin1 fallback. ✅

Commits
• TBD — feat(encoding-doctor): add size limits, blobUrl hardening, latin1 fallback, and UX copy/accessibility tweaks

### Major changes — 2025-11-23 21:45 CET (UTC+01:00) — WS5a regression tests & "no issues" summary

Added
• A small additional regression test in `tests/encoding-doctor.test.mjs` that exercises the "clean text" path, asserting that plain ASCII input with no mojibake produces the explicit summary "No obvious encoding issues were found with the current settings.".

Modified
• None (runtime behaviour is unchanged; this entry documents extra coverage rather than new features).

Fixed
• None.

Human-readable summary

This WS5a polish pass doesn’t change how Encoding Doctor behaves; instead, it locks in one of the nicer UX details with a dedicated test. When users paste already-clean text, the tool should say clearly that it didn’t find any encoding problems rather than leaving them guessing. The new test codifies that expectation so future refactors don’t accidentally regress the "no issues" summary.

Impact
• Slightly higher confidence that clean-text cases keep showing the friendly "no issues" summary instead of an empty or confusing message. ✅
• No user-visible behaviour changes; only test coverage improved. ✅

Testing
• `node --test tests/encoding-doctor.test.mjs` ✅
• `node --test` (full suite) ✅

Commits
• (pending) test(encoding-doctor): add clean-text summary regression case
