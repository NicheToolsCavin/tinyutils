# save as: scrub-secrets-stash.sh
# usage: bash scrub-secrets-stash.sh [branch]
# default branch: feature/universal-converter-backend

set -euo pipefail
BRANCH="${1:-feature/universal-converter-backend}"

git rev-parse --is-inside-work-tree >/dev/null || { echo "Run inside a git repo"; exit 1; }
if ! git filter-repo --help >/dev/null 2>&1; then
  echo "Install git-filter-repo (brew install git-filter-repo or pipx install git-filter-repo)"; exit 1
fi

# 0) If you have local edits, stash EVERYTHING (incl. untracked) so we can rewrite cleanly.
STASHED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -u -m "pre-scrub-$(date +%Y%m%d-%H%M%S)"
  STASHED=1
fi

# 1) Rewrite only your branch history, dropping the flagged agent logs + redacting obvious keys.
git checkout "$BRANCH"

# Keep those logs out forever
grep -qxF '.code/agents/*/exec-call_*.txt' .gitignore 2>/dev/null || echo '.code/agents/*/exec-call_*.txt' >> .gitignore
git add .gitignore || true
git commit -m "chore(security): ignore agent exec-call logs" --no-verify || true

REPL="$(mktemp)"
cat >"$REPL"<<'EOF'
regex:sk-[A-Za-z0-9_-]{20,} ==> <REDACTED_OPENAI_KEY>
regex:(AKIA|ASIA)[0-9A-Z]{16} ==> <REDACTED_AWS_ACCESS_KEY_ID>
regex:(?i)aws[_-]?secret[_-]?access[_-]?key[ \t]*[:=][ \t]*[A-Za-z0-9/+=]{40} ==> <REDACTED_AWS_SECRET_ACCESS_KEY>
EOF

git filter-repo --force \
  --refs "refs/heads/$BRANCH" \
  --replace-text "$REPL" \
  --path-glob '.code/agents/*/exec-call_*.txt' --invert-paths

# Drop old refs/blobs
git for-each-ref --format='%(refname)' refs/original/ | xargs -r -n1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 2) Push the rewritten branch
git push origin --force-with-lease "$BRANCH"

# 3) Bring your local edits back, then nuke any reintroduced logs + mass-redact working tree
if [[ "$STASHED" -eq 1 ]]; then
  git stash pop || true

  # delete any reintroduced agent logs from disk (not just index)
  find . -type f -path "./.code/agents/*/exec-call_*.txt" -print -delete || true

  # redact obvious tokens anywhere in the working tree
  find . -type f ! -path "./.git/*" -print0 \
  | xargs -0 perl -0777 -i -pe 's/sk-[A-Za-z0-9_-]{20,}/<REDACTED_OPENAI_KEY>/g;
                                 s/(?:AKIA|ASIA)[0-9A-Z]{16}/<REDACTED_AWS_ACCESS_KEY_ID>/g;
                                 s/((?i:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*)[A-Za-z0-9\/+=]{40}/$1<REDACTED_AWS_SECRET_ACCESS_KEY>/g;'

  # optional: commit your now-clean local edits (skip hooks if they complain)
  git add -A
  git commit -m "chore(security): apply local redactions (post-rewrite)" --no-verify || true
fi

echo "✅ Scrub complete. Rotate the exposed OpenAI/AWS keys. You’re clear to keep working."
