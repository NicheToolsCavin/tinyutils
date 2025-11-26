# Repository Hygiene Checklist

Run this checklist periodically to keep the repo clean and deployments fast. Ideal for ChatGPT or other agents to run as routine maintenance.

## Git Repository Health

### 1. Check .git size and find bloat
```bash
# Check total .git size
du -sh .git

# Find largest objects in git history
find .git/objects -type f -exec du -h {} + 2>/dev/null | sort -rh | head -20

# Identify what those large objects are
git rev-list --objects --all | grep <hash>

# Check for files that shouldn't be committed
git log --all --pretty=format: --name-only --diff-filter=A | sort -u | grep -E '\.(zip|tar|gz|bz2|xz|dmg|exe|dll|so|dylib|pdf|mp4|mov|avi)$'
```

**Action items:**
- [ ] .git directory under 100MB?
- [ ] No binary artifacts (tarballs, zips, large PDFs) in history?
- [ ] If bloated, use `git filter-repo` to remove large files from history

### 2. Check .gitignore coverage
```bash
# Find large untracked files that should probably be ignored
find . -type f -size +1M -not -path "./.git/*" -exec ls -lh {} \; | awk '{print $9, $5}'

# Check for common patterns that should be ignored
find . -name "*.log" -o -name "*.DS_Store" -o -name "node_modules" -o -name "__pycache__" -o -name "*.pyc" | head -20
```

**Action items:**
- [ ] All build artifacts in .gitignore?
- [ ] artifacts/, .debug/, logs/ ignored?
- [ ] OS junk (.DS_Store, Thumbs.db) ignored?
- [ ] Language-specific caches (node_modules, __pycache__, .venv) ignored?

## Dependency Health

### 3. Check for unused dependencies
```bash
# Check package.json for unused packages (if you have npm deps)
# For Python, check requirements.txt

# List all imported modules in Python code
grep -rh "^import\|^from" --include="*.py" . | sort -u

# List all required packages
cat api/convert/requirements.txt convert_backend/requirements.txt 2>/dev/null | grep -v "^#" | sort -u
```

**Action items:**
- [ ] All dependencies in requirements.txt actually used?
- [ ] No duplicate or conflicting version requirements?
- [ ] No dev dependencies in production requirements.txt?

### 4. Check for outdated dependencies
```bash
# Python - check for updates
pip list --outdated

# Check for security vulnerabilities
pip-audit 2>/dev/null || echo "Install pip-audit: pip install pip-audit"
```

**Action items:**
- [ ] Critical security updates applied?
- [ ] Dependencies not absurdly outdated (>2 years old)?

## Cache and Temporary Files

### 5. System cache cleanup
```bash
# Check sizes of common cache locations
du -sh ~/Library/Caches/com.* 2>/dev/null | sort -rh | head -10
du -sh ~/.cache/* 2>/dev/null | sort -rh | head -10
du -sh .debug/ .cache/ logs/ 2>/dev/null
```

**Action items:**
- [ ] No huge cache directories (>1GB)?
- [ ] .debug/ and logs/ cleaned of old artifacts (>30 days)?
- [ ] Temp files from tests cleaned up?

### 6. Check for duplicate files
```bash
# Find duplicate files by size and content
find . -type f -not -path "./.git/*" -exec md5 -r {} \; 2>/dev/null | sort | uniq -w32 -d
```

**Action items:**
- [ ] No obvious duplicates (same file in multiple places)?
- [ ] Vendored dependencies not duplicated?

## Code Quality

### 7. Find dead code
```bash
# Find Python files that might be unused
find . -name "*.py" -not -path "./.git/*" -not -path "./.venv/*" | while read f; do
  basename=$(basename "$f" .py)
  if ! grep -rq "import $basename\|from.*$basename" --include="*.py" .; then
    echo "Possibly unused: $f"
  fi
done | head -20

# Find JavaScript files with no imports
grep -L "import\|require\|export" --include="*.js" -r api/ tools/ public/ 2>/dev/null | head -10
```

**Action items:**
- [ ] Old test files removed?
- [ ] Commented-out code blocks cleaned up?
- [ ] TODO comments addressed or documented?

### 8. Check for hardcoded secrets or keys
```bash
# Look for common secret patterns
grep -rn --include="*.py" --include="*.js" --include="*.json" -E "(api[_-]?key|secret|password|token|private[_-]?key|bearer)\s*[:=]\s*['\"][^'\"]+['\"]" . | grep -v ".git"

# Check for .env files that shouldn't be committed
find . -name ".env" -not -path "./.git/*" -exec echo "WARNING: {}" \;
```

**Action items:**
- [ ] No API keys or secrets in code?
- [ ] All secrets in environment variables or .env (which is gitignored)?
- [ ] .env.example exists but .env is gitignored?

## Build and Deployment

### 9. Check build artifacts
```bash
# Check for build outputs that should be gitignored
find . -name "dist" -o -name "build" -o -name ".next" -o -name ".svelte-kit" | head -10

# Check for large files that will be deployed
find . -type f -size +5M -not -path "./.git/*" -not -path "./node_modules/*" -exec ls -lh {} \;
```

**Action items:**
- [ ] Build directories gitignored?
- [ ] No unnecessarily large files deployed to Vercel?
- [ ] Static assets optimized (images compressed, etc.)?

### 10. Vercel deployment size
```bash
# Estimate what Vercel will deploy (excluding .git, node_modules, etc.)
du -sh --exclude=.git --exclude=node_modules --exclude=.venv --exclude=__pycache__ . 2>/dev/null || \
  du -h -d 0 . | grep -v ".git\|node_modules\|.venv\|__pycache__"
```

**Action items:**
- [ ] Deployment size under 500MB? (ideally <100MB)
- [ ] Only necessary files being deployed?
- [ ] .vercelignore configured if needed?

## Documentation

### 11. Check documentation freshness
```bash
# Find outdated docs (older than 90 days, modified more recently than 7 days ago)
find docs/ -name "*.md" -mtime +90 -o -mtime -7 2>/dev/null

# Check for TODOs in docs
grep -rn "TODO\|FIXME\|XXX" docs/
```

**Action items:**
- [ ] AGENTS.md up to date?
- [ ] CLAUDE.md reflects current architecture?
- [ ] Run logs recent and accurate?
- [ ] Outdated TODOs addressed?

## Performance

### 12. Check for performance issues
```bash
# Find very large source files that might need refactoring
find . -name "*.py" -o -name "*.js" | xargs wc -l | sort -rn | head -10

# Check for extremely nested directories
find . -type d -not -path "./.git/*" | awk -F/ '{print NF, $0}' | sort -rn | head -10
```

**Action items:**
- [ ] No source files >1000 lines (consider splitting)?
- [ ] No deeply nested directories (>10 levels)?
- [ ] Database queries optimized (if applicable)?

---

## Quick Health Score

Run this one-liner to get a quick repo health overview:

```bash
echo "=== REPO HEALTH CHECK ===" && \
echo "Git size: $(du -sh .git 2>/dev/null | awk '{print $1}')" && \
echo "Largest git objects: $(find .git/objects -type f 2>/dev/null | wc -l | xargs) objects" && \
echo "Untracked large files: $(find . -type f -size +5M -not -path "./.git/*" 2>/dev/null | wc -l | xargs)" && \
echo "Python cache files: $(find . -name "*.pyc" -o -name "__pycache__" 2>/dev/null | wc -l | xargs)" && \
echo "TODO comments: $(grep -r "TODO\|FIXME" --include="*.py" --include="*.js" . 2>/dev/null | wc -l | xargs)" && \
echo "=== END HEALTH CHECK ==="
```

---

## When to Run This

- **Weekly**: Quick health check
- **Before major releases**: Full checklist
- **After large feature work**: Sections 1, 2, 6, 7, 11
- **When builds are slow**: Sections 1, 9, 10
- **When disk space is low**: Sections 1, 5, 6

---

## Emergency Cleanup Commands

If you need to quickly free up space:

```bash
# Remove all Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete

# Clean old artifacts (>30 days)
find artifacts/ -type f -mtime +30 -delete 2>/dev/null

# Clean git garbage
git gc --aggressive --prune=now

# Clean system caches (macOS)
rm -rf ~/Library/Caches/com.anthropic.claudefordesktop ~/Library/Caches/claude-cli-nodejs
```
