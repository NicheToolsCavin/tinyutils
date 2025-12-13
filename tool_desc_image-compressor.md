# tool_desc_image-compressor.md

Date: December 13, 2025 (original spec)

## Purpose

Compress and convert images **locally in your browser** — no uploads. Supports batch processing, HEIC/HEIF decoding, format conversion, and quality/resize controls while keeping all data on the user's device.

## Inputs (UI)

- **File drop zone**: Accepts images (PNG, JPEG, WebP, HEIC/HEIF) or a ZIP containing images
- **Output format**: WebP, JPEG, PNG, or "Keep original"
- **Quality slider**: 1-100% for lossy formats (JPEG, WebP)
- **Resize options**: Optional max width/height with aspect ratio preservation
- **Batch controls**: Process all, cancel, clear

## Processing (server)

None — all processing happens client-side:

1. Files dropped → validated for supported image types
2. HEIC/HEIF files → decoded via lazy-loaded `heic2any` library
3. Images → processed in Web Worker pool using OffscreenCanvas
4. Multi-step downscaling for quality resizes (halving dimensions iteratively)
5. Output blobs → generated in selected format/quality
6. Single file → direct download; multiple files → ZIP via `fflate`

## Output

- **Single image**: Downloads as `<original-name>.<new-ext>` (e.g., `photo.webp`)
- **Multiple images**: Downloads as `compressed-images.zip`
- **Preview**: Before/after thumbnails with file size comparison

## UI/UX

- Drag-and-drop zone with click-to-browse fallback
- Real-time progress bar per image and overall batch
- Cancel button stops processing mid-batch
- Clear button resets the queue
- Responsive grid layout for image previews
- Error states shown per-image (red badge + message)

## Success criteria / examples

- Drop 10 JPEGs → convert to WebP at 80% quality → download ZIP ~60% smaller
- Drop iPhone HEIC → convert to JPEG → works on any device/browser
- Drop 50MB PNG → resize to max 1920px + convert to WebP → ~2MB output
- Cancel mid-batch → already-processed files still downloadable

## Non-goals

- Server-side processing (privacy-first, all local)
- Metadata preservation (EXIF stripped for privacy)
- Lossless WebP (only lossy supported currently)
- AVIF/JPEG XL output (future enhancement)
- Image editing (crop, rotate, filters)

## Human-readable description

This tool lets you compress and convert images without uploading them anywhere. Drop your files (even iPhone HEIC photos), pick an output format and quality, optionally resize them, and download the results. Everything happens in your browser using Web Workers, so your images never leave your device. Great for batch-converting screenshots, shrinking photos for the web, or making iPhone photos compatible with older software.

---

## Change Log

### Major changes — 2025-12-13 12:12 CET (UTC+01:00) — Image compressor initial release

Added
- New tool page: `/tools/image-compressor/` (batch convert + resize + ZIP import/export)
- HEIC/HEIF decoding via lazy-loaded `heic2any`
- Worker pool pipeline with main-thread fallback
- UI smoke script: `scripts/ui_smoke_image_compressor.mjs`

Modified
- Global CSP now allows `img-src blob:` and `'wasm-unsafe-eval'` so local previews + HEIC decode work
- `sitemap.xml` and `static/sitemap.xml` now include the image compressor + image-related blog posts

Fixed
- `pnpm test` no longer auto-runs the image compressor UI smoke script
- Image compressor UX: safer single-file download names, better cancel behavior, and progress counting

Impact
- Adds a new no-upload image compressor/converter tool
- Makes iPhone HEIC photos usable on the web via local conversion
- Ensures blob-based previews render under the site's CSP

Testing
- `pnpm test` passed
- `pnpm check` passed
- `pnpm build` passed
- UI smoke artifact: `artifacts/ui/image-compressor/20251213/image-compressor-smoke.png`

Commits
- 99474e3 — feat(image-compressor): add client-side image tool
