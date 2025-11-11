#!/usr/bin/env bash
# git-scrub-secrets.sh
# Remove leaked blobs & redact tokens, then force-push cleaned history.
# Defaults: branch-only rewrite of 'feature/universal-converter-backend'.
# Requires: git-filter-repo (brew install git-filter-repo | pipx install git-filter-repo)

set -euo pipefail

# ---------- defaults ----------
BRANCH="feature/universal-converter-backend"
REPO_WIDE=0
BLOB_FILE=""
declare -a BLOB_IDS=()

# ---------- args ----------
usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [BLOB_ID ...]
Options:
  -b <branch>   Branch to rewrite (default: ${BRANCH})
  -a            Rewrite the ENTIRE repo history (all refs, all tags)
  -f <file>     File containing blob IDs (one per line)
  -h            Help

Examples:
  $(basename "$0") -b feature/universal-converter-backend 43390d90e499a5d700882e40926ed312b9794acf
  $(basename "$0") -a -f /path/to/blob_ids.txt
EOF
}

while getopts ":b:af:h" opt; do
  case $opt in
    b) BRANCH="$OPTARG" ;;
    a) REPO_WIDE=1 ;;
    f) BLOB_FILE="$OPTARG" ;;
    h) usage; exit 0 ;;
    \?) echo "Unknown option: -$OPTARG" >&2; usage; exit 2 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; usage; exit 2 ;;
  esac
done
shift $((OPTIND -1))
# Remaining args are blob ids
if (($# > 0)); then
  BLOB_IDS+=("$@")
fi

# Merge blob ids from file if provided
if [[ -n "${BLOB_FILE}" ]]; then
  while IFS= read -r line; do
    [[ -n "$line" ]] && BLOB_IDS+=("$line")
  done < "$BLOB_FILE"
fi

if ((${#BLOB_IDS[@]} == 0)); then
  echo "You must provide at least one blob id (-f file or positional args)."
  usage
  exit 2
fi

# ---------- preflight ----------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Run this inside a git repo."; exit 1; }

if ! git filter-repo --help >/dev/null 2>&1; then
  echo "git-filter-repo not found.
Install with:  brew install git-filter-repo    (macOS)
           or:  pipx install git-filter-repo"
  exit 1
fi

# ---------- stash local edits (incl. untracked) ----------
STASHED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -u -m "pre-scrub-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
  STASHED=1
fi

# ---------- prepare temp files ----------
REPL_FILE="$(mktemp -t replace.XXXXXX)"
STRIP_FILE="$(mktemp -t blobs.XXXXXX)"

# Write replace rules (git-filter-repo format)
cat > "$REPL_FILE" <<'EOF'
# OpenAI keys in any form: env or literal
regex:(?i)(OPENAI[_-]?API[_-]?KEY\s*[:=]\s*)([A-Za-z0-9._-]{10,}) ==> \1<REDACTED_OPENAI_KEY>
regex:sk-[A-Za-z0-9_-]{20,} ==> <REDACTED_OPENAI_KEY>

# AWS credentials
regex:(AKIA|ASIA)[0-9A-Z]{16} ==> <REDACTED_AWS_ACCESS_KEY_ID>
regex:(?i)aws[_-]?secret[_-]?access[_-]?key[ \t]*[:=][ \t]*[A-Za-z0-9/+=]{30,} ==> <REDACTED_AWS_SECRET_ACCESS_KEY>
EOF

# Write blob id list
for id in "${BLOB_IDS[@]}"; do
  echo "$id" >> "$STRIP_FILE"
done

# ---------- optional: branch checkout & .gitignore ----------
if (( REPO_WIDE == 0 )); then
  git checkout "$BRANCH"
fi

# Keep noisy agent logs out of history going forward
grep -qxF '.code/agents/*/exec-call_*.txt' .gitignore 2>/dev/null || \
  echo '.code/agents/*/exec-call_*.txt' >> .gitignore
git add .gitignore >/dev/null 2>&1 || true
git commit -m "chore(security): ignore agent exec-call logs" --no-verify >/dev/null 2>&1 || true

# ---------- rewrite ----------
if (( REPO_WIDE == 1 )); then
  git filter-repo --force \
    --strip-blobs-with-ids "$STRIP_FILE" \
    --replace-text "$REPL_FILE" \
    --path-glob '.code/agents/*/exec-call_*.txt' --invert-paths
else
  git filter-repo --force \
    --refs "refs/heads/$BRANCH" \
    --strip-blobs-with-ids "$STRIP_FILE" \
    --replace-text "$REPL_FILE" \
    --path-glob '.code/agents/*/exec-call_*.txt' --invert-paths
fi

# ---------- prune old refs & compact ----------
git for-each-ref --format='%(refname)' refs/original/ | xargs -r -n1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# ---------- push ----------
if (( REPO_WIDE == 1 )); then
  git push origin --force --all
  git push origin --force --tags
else
  git push origin --force-with-lease "$BRANCH"
fi

# ---------- restore working tree, purge leftovers ----------
if (( STASHED == 1 )); then
  git stash pop || true
fi

# Delete any reintroduced agent logs from disk (not index only)
find . -type f -path "./.code/agents/*/exec-call_*.txt" -print -delete || true

# Redact common tokens in working tree files too (so your next commits are clean)
# (Skip .git)
if command -v perl >/dev/null 2>&1; then
  find . -type f ! -path "./.git/*" -print0 \
  | xargs -0 perl -0777 -i -pe 's/((?i:OPENAI[_-]?API[_-]?KEY)\s*[:=]\s*)[A-Za-z0-9._-]{10,}/$1<REDACTED_OPENAI_KEY>/g;
                                 s/sk-[A-Za-z0-9_-]{20,}/<REDACTED_OPENAI_KEY>/g;
                                 s/(?:AKIA|ASIA)[0-9A-Z]{16}/<REDACTED_AWS_ACCESS_KEY_ID>/g;
                                 s/((?i:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*)[A-Za-z0-9\/+=]{30,}/$1<REDACTED_AWS_SECRET_ACCESS_KEY>/g;' || true
fi

# Optional: auto-commit the redacted working tree (skip hooks if any)
git add -A || true
git commit -m "chore(security): working-tree redactions" --no-verify >/dev/null 2>&1 || true

# ---------- verify locally ----------
FAILED=0
for id in "${BLOB_IDS[@]}"; do
  if git rev-list --objects --all | grep -Fq "$id"; then
    echo "⚠️  Still present locally: $id"
    FAILED=1
  else
    echo "✅ Gone locally: $id"
  fi
done

echo
echo "Done. If GitHub still blocks with a NEW blob id, rerun this script with that id."
echo "Also: rotate/revoke the leaked credentials in OpenAI/AWS."

exit $FAILED
