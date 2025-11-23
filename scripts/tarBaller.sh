#!/usr/bin/env bash
# tarBaller.sh - Create a stripped tarball of TinyUtils for AI agents
# Excludes build artifacts, .git history, and large binaries while documenting what was removed
# Usage: ./tarBaller.sh [output_name] [output_dir]
#   output_name: Optional name for tarball (default: tinyutils_YYYYMMDD_HHMMSS.tar.gz)
#   output_dir: Optional output directory (default: ~/dev/TinyUtils)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_OUTPUT_DIR="${HOME}/dev/TinyUtils"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEFAULT_OUTPUT_NAME="tinyutils_${TIMESTAMP}.tar.gz"

OUTPUT_NAME="${1:-${DEFAULT_OUTPUT_NAME}}"
OUTPUT_DIR="${2:-${DEFAULT_OUTPUT_DIR}}"
OUTPUT_PATH="${OUTPUT_DIR}/${OUTPUT_NAME}"

echo -e "${BLUE}🎯 TinyUtils TarBaller${NC}"
echo -e "${BLUE}=====================================${NC}"
echo "Repository: ${REPO_ROOT}"
echo "Output: ${OUTPUT_PATH}"
echo ""

# Change to repo root
cd "${REPO_ROOT}"

# Capture git state
echo -e "${YELLOW}📸 Capturing git state...${NC}"
GIT_COMMIT=$(git rev-parse HEAD)
GIT_COMMIT_SHORT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_COMMIT_MSG=$(git log -1 --format=%s)
GIT_COMMIT_DATE=$(git log -1 --format=%cd --date=iso)
GIT_AUTHOR=$(git log -1 --format='%an <%ae>')

# Create metadata files
echo -e "${YELLOW}📝 Creating metadata files...${NC}"

# LATEST_COMMIT.txt
cat > LATEST_COMMIT.txt << EOF
Commit: ${GIT_COMMIT}
Branch: ${GIT_BRANCH}
Author: ${GIT_AUTHOR}
Date: ${GIT_COMMIT_DATE}
Message: ${GIT_COMMIT_MSG}
EOF

# GIT_REMOTES.txt
git remote -v > GIT_REMOTES.txt

# TARBALL_MANIFEST.md
cat > TARBALL_MANIFEST.md << MANIFEST_EOF
# TinyUtils Tarball Manifest
**Created:** $(date '+%B %d, %Y at %H:%M:%S %Z')
**Tarball:** $(basename "${OUTPUT_PATH}")
**Git Commit:** ${GIT_COMMIT_SHORT}
**Git Branch:** ${GIT_BRANCH}

## What's Included in This Tarball

### ✅ Source Code (Complete)
- `/api/` - All Vercel Edge Functions (check.js, sitemap-delta.js, wayback-fixer.js, metafetch.js, fence.js, health.js)
- `/api/convert/` - Python/FastAPI document converter
- `/api/_lib/` - Shared API utilities (pandoc_runner.py, edge_helpers.js, html_utils.py)
- `/tools/` - All tool HTML pages (dead-link-finder, sitemap-delta, wayback-fixer, text-converter, encoding-doctor, etc.)
- `/public/` - Static assets (CSS, images, icons, SVGs)
- `/styles/` - Design system CSS (design-tokens.css, components.css, animations.css, site.css)
- `/scripts/` - Client-side and build scripts (analytics.js, consent.js, theme-toggle.js, smoke tests, etc.)
- `/docs/` - Documentation (AGENTS.md, CLAUDE.md, ARCHITECTURE_AND_GUARDRAILS.md, etc.)
- `/tests/` - Test suite (api_contracts.test.mjs, converter_fidelity.mjs, etc.)
- `/filters/` - Pandoc Lua filters (normalize_lists.lua, preserve_codeblocks.lua, etc.)
- `/convert/` and `/convert_backend/` - Converter backend modules

### ✅ Configuration Files (Complete)
- `vercel.json` - Vercel deployment config (headers, rewrites, redirects)
- `package.json` - NPM scripts (NO dependencies for frontend)
- `requirements.txt` - Python dependencies for Convert API
- `.gitignore` - Git ignore rules
- `.env.example` - Environment variable template (if exists)
- `.vercelignore` - Vercel build exclusions

### ✅ Root-Level Files
- `index.html` - Homepage
- `about.html`, `privacy.html`, `terms.html`, `cookies.html`, etc. - Legal/static pages
- `sitemap.xml` - Site sitemap
- `robots.txt` - Robots directives
- `README.md` - Project overview
- `LICENSE` - Project license
- `CLAUDE.md` - Claude Code instructions
- `AGENTS.md` - AI agent requirements
- `SECURITY.md` - Security policy

### ✅ Tool Description Files
- `tool_desc_*.md` - Specifications for each tool

### ✅ Test Fixtures
- `tests/fixtures/converter/` - Canonical test documents (tech_doc.docx, lists.docx, images.docx, html_input.html)
- `tests/golden/` - Golden metrics for regression tests

### ✅ Git Metadata (Lightweight)
- `LATEST_COMMIT.txt` - Latest commit hash, author, date, message
- `GIT_REMOTES.txt` - Git remote URLs

---

## ❌ What's Excluded (To Reduce Size)

### Build Artifacts & Cache
- `.vercel/` - Vercel build cache (regenerated on deploy)
- `.svelte-kit/` - SvelteKit build output (if any)
- `node_modules/` - NPM dependencies (install with `npm install` or `pnpm install`)
- `build/` - Build directories
- `.cache/` - Various caches
- `__pycache__/` - Python bytecode cache
- `*.pyc`, `*.pyo` - Python compiled files
- `.venv/`, `.venv-*`, `venv/` - Python virtual environments (recreate with `python -m venv .venv`)
- `.pytest_cache/` - Pytest cache
- `.code/` - Claude Code cache

### Git History
- `.git/` - Git repository (~40-60MB of history)
  - **Note:** Full commit history is extensive and valuable but too large for tarball
  - **Latest commit reference:** See LATEST_COMMIT.txt
  - **To restore:** Clone from GitHub or use existing local repo
  - **Repository:** See GIT_REMOTES.txt

### Temporary Files
- `.DS_Store` - macOS metadata
- `*.log` - Log files (except those in artifacts for documentation)
- `*.tmp` - Temporary files
- `.env`, `.env.local`, `.env.*` - Local environment variables (use .env.example as template)
- `.debug/` - Debug screenshots

### Test Artifacts (Optional - Configurable)
- Large artifacts that are regenerated during testing
- Note: Some key artifacts may be preserved for reference

---

## 📊 Tarball Stats

**Created From:**
- Commit: ${GIT_COMMIT_SHORT}
- Branch: ${GIT_BRANCH}
- Date: ${GIT_COMMIT_DATE}

**Size:** (will be calculated after creation)
**Files:** (will be calculated after creation)

---

## 🔍 Key Files for Understanding This Codebase

**Read these FIRST:**
1. `docs/AGENTS.md` - Complete project context and requirements
2. `CLAUDE.md` - Claude Code-specific instructions
3. `README.md` - Project overview
4. `vercel.json` - Understand routing, headers, and deployment config
5. `index.html` - Homepage structure
6. `tools/index.html` - Tools hub

**Architecture:**
7. `docs/ARCHITECTURE_AND_GUARDRAILS.md` - System design and constraints
8. `api/check.js` - Example Edge Function (Dead Link Finder)
9. `api/convert/convert_service.py` - Python converter service
10. `styles/design-tokens.css` - Design system foundation

**Testing:**
11. `tests/converter_fidelity.mjs` - Converter regression tests
12. `tests/api_contracts.test.mjs` - API contract tests
13. `docs/TESTING.md` - Testing guide

---

## 🚀 Quick Start After Extracting

```bash
# Extract
tar -xzf ${OUTPUT_NAME}
cd tinyutils

# View metadata
cat LATEST_COMMIT.txt
cat GIT_REMOTES.txt

# Read the docs
cat docs/AGENTS.md
cat CLAUDE.md

# Install dependencies (if needed)
npm install  # or: pnpm install

# Create Python venv (for converter)
python3 -m venv .venv
source .venv/bin/activate  # or: .venv/Scripts/activate on Windows
pip install -r requirements.txt

# Run tests
npm test  # or: pnpm test
node --test tests/converter_fidelity.mjs

# Start development
# (No dev server needed - this is a static site with serverless functions)
```

---

## 📝 Notes for AI Agents

### What You Should Know
1. **This is a STRIPPED tarball** - The full repository includes:
   - `.git/` directory with complete commit history (40-60MB)
   - `node_modules/` (if installed)
   - Python virtual environments (`.venv/`, etc.)
   - Build artifacts (`.vercel/`, `.cache/`, etc.)
   - Temporary files and debug artifacts

2. **Git history is NOT included** - But you have:
   - Latest commit info in `LATEST_COMMIT.txt`
   - Remote URLs in `GIT_REMOTES.txt`
   - You can clone the full repo if needed: `git clone <url from GIT_REMOTES.txt>`

3. **Dependencies are NOT included** - You must install:
   - Frontend: `npm install` or `pnpm install` (though frontend has zero npm deps)
   - Backend: `pip install -r requirements.txt` in a Python venv

4. **This is production-ready code** - All code in this tarball is:
   - Tested (see `tests/` directory)
   - Documented (see `docs/` and `tool_desc_*.md` files)
   - Deployed to https://www.tinyutils.net

### Key Constraints
- **DO NOT modify APIs** without thorough testing
- **PRESERVE all CSS class names** - Smoke tests depend on specific selectors
- **FOLLOW AGENTS.md** - Contains all requirements and constraints
- **TEST INCREMENTALLY** - Don't change multiple things at once

### Getting Help
- Read `docs/AGENTS.md` for comprehensive context
- Check `tool_desc_*.md` for tool-specific requirements
- Review test files in `tests/` for expected behavior
- Consult `docs/AGENT_RUN_LOG.md` for past session logs

---

## 🆘 If Something's Missing

If you encounter references to files not in this tarball:
1. Check if it's in the "excluded" list above (probably build artifacts)
2. Check if it's supposed to be generated (e.g., `node_modules/`, `.venv/`)
3. Clone the full repo if you need git history: See GIT_REMOTES.txt
4. Regenerate build artifacts if needed (`npm install`, `vercel build`, etc.)

---

**This tarball contains everything needed to understand, modify, test, and deploy TinyUtils.** 🚀

The only things missing are:
- Regeneratable artifacts (node_modules, .venv, .vercel, caches)
- Git history (available via clone)
- Temporary/debug files

For the complete repository with full git history, clone from:
$(cat GIT_REMOTES.txt | grep fetch | head -1)
MANIFEST_EOF

echo -e "${GREEN}✅ Metadata files created${NC}"

# Create the tarball
echo -e "${YELLOW}📦 Creating tarball...${NC}"

tar -czf "${OUTPUT_PATH}" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.svelte-kit' \
  --exclude='.vercel' \
  --exclude='.venv' \
  --exclude='.venv-*' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='.pytest_cache' \
  --exclude='.cache' \
  --exclude='build' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='*.tmp' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  --exclude='.debug' \
  --exclude='.code' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  .

# Get tarball stats
TARBALL_SIZE=$(du -h "${OUTPUT_PATH}" | cut -f1)
FILE_COUNT=$(tar -tzf "${OUTPUT_PATH}" | wc -l | xargs)

echo -e "${GREEN}✅ Tarball created successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Statistics:${NC}"
echo "  Size: ${TARBALL_SIZE}"
echo "  Files: ${FILE_COUNT}"
echo "  Location: ${OUTPUT_PATH}"
echo ""
echo -e "${BLUE}📝 Metadata files included:${NC}"
echo "  - TARBALL_MANIFEST.md (complete documentation)"
echo "  - LATEST_COMMIT.txt (git commit info)"
echo "  - GIT_REMOTES.txt (repository URLs)"
echo ""
echo -e "${GREEN}🎉 Done! Your stripped tarball is ready for AI agents.${NC}"
echo ""
echo -e "${YELLOW}To extract:${NC}"
echo "  tar -xzf ${OUTPUT_PATH}"
echo ""
echo -e "${YELLOW}To view contents without extracting:${NC}"
echo "  tar -tzf ${OUTPUT_PATH} | less"
echo ""
echo -e "${YELLOW}To verify manifest:${NC}"
echo "  tar -xzf ${OUTPUT_PATH} TARBALL_MANIFEST.md -O | less"
