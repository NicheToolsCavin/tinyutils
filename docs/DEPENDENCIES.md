# TinyUtils Dependencies

This document explains the purpose of key dependencies in the project.

## Dev Dependencies

### jsdom (^27.3.0)
**Purpose**: DOM simulation for Node.js unit tests

**Why needed**: The `tests/theme_aware_colors.unit.test.mjs` test suite needs to simulate browser DOM APIs (`document`, `document.documentElement`, `setAttribute`) to test theme-aware color generation logic.

**Alternatives considered**:
- ❌ Mocking `document` manually: Would be fragile and incomplete
- ❌ Browser-based test runners: Adds complexity and CI overhead
- ✅ jsdom: Industry-standard, complete DOM implementation for Node.js

**Size impact**: ~4.5MB installed (acceptable for comprehensive DOM testing)

**Usage**: Only imported in test files, not in production code

---

### puppeteer (^24.31.0)
**Purpose**: Headless browser automation for UI smoke tests

**Why needed**: UI smoke tests (`ui_smoke_*.mjs`) validate that tools render correctly by:
- Navigating to tool pages
- Interacting with form elements
- Capturing screenshots for visual verification
- Testing real browser behavior (not just unit logic)

**Alternatives considered**:
- ❌ Playwright: Similar size, puppeteer is more established
- ❌ Manual testing only: Error-prone, doesn't catch regressions
- ✅ Puppeteer: Battle-tested, official Chrome DevTools Protocol client

**Size impact**: ~350MB installed (includes Chromium binary)

**Usage**: Only in test scripts, never in production

---

## Runtime Dependencies

### fflate (^0.8.2)
**Purpose**: Compression/decompression library

**Why needed**: Used in the Convert tool to:
- Create ZIP archives bundling markdown + images
- Compress large documents for download
- Decompress uploaded archives

**Alternatives considered**:
- ❌ Native `zlib`: Limited format support, browser incompatible
- ❌ `jszip`: Larger bundle size (~100KB vs ~20KB for fflate)
- ✅ fflate: Fastest, smallest, supports ZIP/GZIP/DEFLATE

**Size impact**: ~20KB minified

---

### heic2any (^0.0.4)
**Purpose**: Convert HEIC/HEIF images to JPEG/PNG in browser

**Why needed**: iOS devices save photos as HEIC format by default. Users need to convert these to web-compatible formats (JPEG/PNG) for:
- Image compressor tool
- Upload previews
- Cross-platform compatibility

**Alternatives considered**:
- ❌ Server-side conversion: Requires backend infrastructure
- ❌ Tell users to convert manually: Poor UX
- ✅ heic2any: Client-side conversion, no server needed

**Size impact**: ~50KB minified

---

## Why These Sizes Are Acceptable

### jsdom (4.5MB dev dependency)
- **Only used in tests**: Never shipped to production
- **Comprehensive DOM**: Eliminates need for manual mocking
- **Developer productivity**: Faster test development, fewer bugs

### puppeteer (350MB dev dependency)
- **Chromium bundled**: Ensures consistent test environment
- **CI/CD value**: Catches visual regressions automatically
- **Only in CI**: Developers can skip installing with `--ignore-scripts`

### fflate (20KB production)
- **Tiny footprint**: 5x smaller than alternatives
- **Critical feature**: ZIP bundling is core Convert tool functionality
- **Performance**: Fastest compression library in JS ecosystem

### heic2any (50KB production)
- **Solves real user problem**: iOS users need HEIC conversion
- **No alternatives**: Only client-side HEIC converter available
- **Edge cases**: Gracefully degrades if HEIC not supported

---

## Dependency Management Principles

1. **Production dependencies must be justified**: Every KB counts for page load performance
2. **Dev dependencies can be larger**: Developer productivity and test quality are priorities
3. **Prefer zero-dependency libraries**: Reduce supply chain attack surface
4. **Pin major versions**: Prevent breaking changes from auto-updates
5. **Audit regularly**: Run `pnpm audit` before each release

---

## Removing a Dependency

Before removing a dependency, verify:

1. **No imports remain**: `grep -r "from 'dependency-name'" src/`
2. **Tests still pass**: `pnpm test`
3. **Build succeeds**: `pnpm build`
4. **Smoke tests pass**: `pnpm smoke:local`

Then:
```bash
pnpm remove dependency-name
pnpm install  # Update lockfile
git add package.json pnpm-lock.yaml
git commit -m "deps: remove unused dependency-name"
```

---

**Last updated**: 2025-12-18
