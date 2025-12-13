# Image Compressor & Converter

Compress and convert images **locally in your browser** — no uploads.

What it does
• Convert between WebP, JPEG, and PNG (plus “keep original format” when possible)  
• Decode HEIC/HEIF (iPhone photos) to web-friendly formats  
• Batch process many images at once (including extracting images from a ZIP)  
• Optional resize-to-fit (max width/height) + quality slider (lossy formats)  
• Download single files or a ZIP of outputs

Privacy
• All processing happens on your device; images are not uploaded to a server.

Notes
• Uses background Web Workers + OffscreenCanvas when available; falls back to main-thread processing otherwise.

### Major changes — 2025-12-13 12:12 CET (UTC+01:00) — Image compressor initial release

Added
• New tool page: `/tools/image-compressor/` (batch convert + resize + ZIP import/export)
• HEIC/HEIF decoding via lazy-loaded `heic2any`
• Worker pool pipeline with main-thread fallback
• UI smoke script: `scripts/ui_smoke_image_compressor.mjs`

Modified
• Global CSP now allows `img-src blob:` and `'wasm-unsafe-eval'` so local previews + HEIC decode work
• `sitemap.xml` and `static/sitemap.xml` now include the image compressor + image-related blog posts

Fixed
• `pnpm test` no longer auto-runs the image compressor UI smoke script
• Image compressor UX: safer single-file download names, better cancel behavior, and progress counting

Human-readable summary

This adds a privacy-first image compressor/converter that runs entirely in your browser. You can drop a batch of images (or a ZIP), choose an output format and quality, optionally resize them, and download the results — without sending your files to TinyUtils servers.

Impact
• Adds a new no-upload image compressor/converter tool ✅
• Makes iPhone HEIC photos usable on the web via local conversion ✅
• Ensures blob-based previews render under the site’s CSP ✅

Testing
• `pnpm test` ✅
• `pnpm check` ✅
• `pnpm build` ✅
• UI smoke artifact: `artifacts/ui/image-compressor/20251213/image-compressor-smoke.png` ✅

Commits
• 99474e3 — feat(image-compressor): add client-side image tool

