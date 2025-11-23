# TinyUtils Tarball Manifest
**Created:** November 23, 2025
**For:** ChatGPT Pro Reasoning - SvelteKit Migration

## What's Included in This Tarball

### ✅ Source Code (Complete)
- `/api/` - All Vercel Edge Functions (check.js, sitemap-delta.js, wayback-fixer.js, metafetch.js, fence.js, health.js)
- `/api/convert/` - Python/FastAPI document converter
- `/api/_lib/` - Shared API utilities (pandoc_runner.py, edge_helpers.js)
- `/tools/` - All tool HTML pages (dead-link-finder, sitemap-delta, wayback-fixer, text-converter, etc.)
- `/public/` - Static assets (CSS, images, icons, SVGs)
- `/styles/` - Design system CSS (design-tokens.css, components.css, animations.css, site.css)
- `/scripts/` - Client-side scripts (analytics.js, consent.js, theme-toggle.js, adsense-monitor.js, etc.)
- `/docs/` - Documentation (AGENTS.md, CLAUDE.md, ARCHITECTURE_AND_GUARDRAILS.md, etc.)
- `/tests/` - Test suite (api_contracts.test.mjs, csv_hardening.unit.test.mjs, etc.)

### ✅ Configuration Files (Complete)
- `vercel.json` - Vercel deployment config (headers, rewrites, redirects)
- `package.json` - NPM scripts (NO dependencies for frontend)
- `requirements.txt` - Python dependencies for Convert API
- `.gitignore` - Git ignore rules
- `.env.example` - Environment variable template

### ✅ Root-Level Files
- `index.html` - Homepage
- `about.html`, `privacy.html`, `terms.html`, `cookies.html`, etc. - Legal/static pages
- `sitemap.xml` - Site sitemap
- `robots.txt` - Robots directives
- `README.md` - Project overview
- `LICENSE` - Project license

### ✅ Tool Description Files
- `tool_desc_deadlinkfinder.md`
- `tool_desc_sitemapdelta.md`
- `tool_desc_waybackfixer.md`
- `tool_desc_multi-file-search-replace.md`
- `tool_desc_encoding-doctor.md`

### ✅ Migration Context
- `New Ideas/sveltekit-migration-plan.md` - Original migration plan
- `New Ideas/SVELTEKIT_MIGRATION_PLAN_PRO_REASONING.md` - Enhanced plan for Pro Reasoning
- `New Ideas/sveltekit-demo/` - Working SvelteKit demo (INCLUDED - study this!)

---

## ❌ What's Excluded (To Reduce Size)

### Build Artifacts & Cache
- `.vercel/` - Vercel build cache (regenerated on deploy)
- `.svelte-kit/` - SvelteKit build output (in demo folder)
- `node_modules/` - NPM dependencies (in demo folder - reinstall with `npm install`)
- `build/` - Any build directories
- `.cache/` - Various caches
- `__pycache__/` - Python bytecode cache
- `*.pyc` - Python compiled files
- `.venv/`, `.venv-*` - Python virtual environments (recreate with `python -m venv .venv`)
- `.pytest_cache/` - Pytest cache

### Git History
- `.git/` - Git repository (40+ MB of history)
  - **Note:** Commit history is extensive and valuable but too large for tarball
  - **Latest commit reference:** See LATEST_COMMIT.txt in tarball
  - **To restore:** Clone from GitHub or use existing local repo

### Temporary Files
- `.DS_Store` - macOS metadata
- `*.log` - Log files
- `*.tmp` - Temporary files
- `.env` - Local environment variables (use .env.example as template)

### Test Artifacts
- `artifacts/` - Test output files and evidence
- `.debug/` - Debug screenshots from smoke tests

### Large Binary Assets (If Any)
- Large images/videos in docs that aren't needed for migration
- Old design mockups or prototypes

---

## 📊 Repository Stats

**Total Size (with .git):** ~60-80 MB
**Tarball Size (stripped):** 21 MB
**Files Included:** 359 files
**Lines of Code:** ~15,000+ (including HTML, JS, CSS, Python)

---

## 🔍 Key Files for Migration (Priority Reading)

**Read these FIRST:**
1. `docs/AGENTS.md` - Complete project context
2. `New Ideas/SVELTEKIT_MIGRATION_PLAN_PRO_REASONING.md` - Your migration guide
3. `vercel.json` - Understand routing and headers
4. `index.html` - Homepage structure (template for +page.svelte)
5. `tools/index.html` - Tools hub (template for tools/+page.svelte)
6. `tools/dead-link-finder/index.html` - Tool page example
7. `styles/design-tokens.css` - Design system foundation
8. `New Ideas/sveltekit-demo/` - Working SvelteKit implementation

**Read these SECOND:**
9. `api/check.js` - DLF API (understand but don't modify)
10. `api/sitemap-delta.js` - Sitemap Delta API
11. `api/wayback-fixer.js` - Wayback Fixer API
12. `scripts/theme-toggle.js` - Theme logic to port
13. `scripts/consent.js` - Consent management to port
14. `tests/api_contracts.test.mjs` - API expectations

---

## 🚀 Quick Start After Extracting Tarball

```bash
# Extract
cd ~/dev/TinyUtils
tar -xzf NOV23_ProReasoning.tar.gz
cd tinyutils

# Read the plan
cat "New Ideas/SVELTEKIT_MIGRATION_PLAN_PRO_REASONING.md"

# Study the demo
cd "New Ideas/sveltekit-demo"
npm install
npm run dev
# Visit http://localhost:5173

# Study the existing site structure
cd ../..
ls -la
cat index.html
cat tools/index.html

# Start migration (your call on approach)
# Option 1: Branch off existing repo
git checkout -b feat/sveltekit-migration

# Option 2: Start fresh SvelteKit project and port files
npm create svelte@latest tinyutils-sveltekit
```

---

## 📝 Notes for Pro Reasoning

### What You Should Do
1. **Study the demo first** - `New Ideas/sveltekit-demo/` is a working SvelteKit implementation with the same design system. Learn from it.
2. **Read AGENTS.md** - Comprehensive project context, constraints, and requirements.
3. **Understand the APIs** - They're perfect as-is. Don't touch them. Just call them from SvelteKit pages.
4. **Preserve class names** - Smoke tests depend on specific selectors. Keep them exact.
5. **Test incrementally** - Don't migrate everything at once. Do homepage first, test, then tools hub, test, etc.

### Git History (Not in Tarball)
The .git directory contains valuable history but is ~40MB. Key commits:
- Initial commit: Setup static site
- Major features: Each tool was added incrementally
- Recent work: UX improvements, consent system, ad integration
- **Latest commit:** (see LATEST_COMMIT.txt)

If you need git history:
- Clone from GitHub: (repo URL would be here)
- Or ask user for .git directory separately

### Environment Variables (Not in Tarball)
`.env` file is gitignored and NOT included for security. Use `.env.example` as template.

Required variables:
- `PREVIEW_SECRET` - For preview auth (if needed)
- Any API keys (none currently required for core functionality)

### Dependencies (Not in Tarball)
Frontend has ZERO npm dependencies (intentional).
Backend Python dependencies in `requirements.txt`:
- `fastapi`
- `pypandoc`
- `vercel` (for serverless)

SvelteKit demo dependencies (install with `npm install` in demo folder):
- `svelte`
- `@sveltejs/kit`
- `@sveltejs/adapter-vercel`
- `vite`

---

## 🎯 Success Metrics

After migration, the tarball recipient (you, Pro Reasoning) should be able to:
✅ Understand the current architecture
✅ See a working SvelteKit implementation (demo)
✅ Follow the migration plan
✅ Preserve all existing functionality
✅ Generate diffs for incremental migration
✅ Test at each step
✅ Deploy to Vercel without issues

---

## 🆘 If Something's Missing

If you encounter references to files not in this tarball:
1. Check if it's in the "excluded" list above (probably build artifacts)
2. Check `New Ideas/sveltekit-demo/` - might be there as example
3. Ask user for specific file if critical
4. Regenerate if it's a build artifact (node_modules, .vercel, etc.)

---

## 📞 Contact / Questions

If you're Pro Reasoning reading this and have questions:
- Add TODO comments in your diffs
- Flag assumptions you're making
- Document any deviations from the plan
- Explain your reasoning in commit messages

The user (Cav) will review your diffs and provide feedback.

---

**Good luck with the migration!** This tarball has everything you need to succeed. 🚀
