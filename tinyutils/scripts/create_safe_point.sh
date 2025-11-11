#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/.." && pwd)"
BACKUP_SCRIPT="${ROOT_DIR}/scripts/backup_repo.sh"
LOG_SCRIPT="${ROOT_DIR}/scripts/log_run_entry.py"

# Where to keep mirrored run-logs outside the repo (log_run_entry.py also honors this)
export LOG_MIRROR_DIR="${LOG_MIRROR_DIR:-$HOME/dev/TinyBackups/log_mirror}"

UTC_TS="$(TZ=UTC date +%Y%m%dT%H%M%SZ)"
MAD_TS_HUMAN="$(TZ=Europe/Madrid date '+%Y-%m-%d %H:%M CET')"

mkdir -p "$HOME/dev/TinyBackups"

echo "[safe-point] Creating tar backup via backup_repo.sh…"
KEEP_COUNT=20 SKIP_IF_CLEAN=0 MIN_INTERVAL_SECONDS=0 FORCE=1 \
  bash "$BACKUP_SCRIPT" "$HOME/dev/TinyBackups" >/dev/null

# Find the most recent archive name after backup
LATEST_TAR=$(ls -1t "$HOME/dev/TinyBackups"/tinyutils-*.tar.gz | head -n 1 || true)

echo "[safe-point] Capturing short git summary…"
GIT_STATUS=$(git -C "$ROOT_DIR" status -sb || true)
HEAD_LINE=$(git -C "$ROOT_DIR" log -n 1 --pretty=format:'%h %ad %s' --date=iso-local || true)
DIFF_STAT=$(git -C "$ROOT_DIR" diff --stat || true)

SAFE_DIR="$HOME/dev/TinyBackups/safe_points/$UTC_TS"
mkdir -p "$SAFE_DIR"
{
  printf 'timestamp=%s\n' "$MAD_TS_HUMAN"
  printf 'archive=%s\n' "${LATEST_TAR##*/}"
  printf '\n[git status -sb]\n%s\n' "$GIT_STATUS"
  printf '\n[HEAD]\n%s\n' "$HEAD_LINE"
  printf '\n[diff --stat]\n%s\n' "$DIFF_STAT"
} >"$SAFE_DIR/summary.txt"

echo "[safe-point] Appending run log entry…"
python3 "$LOG_SCRIPT" \
  --title "Manual - Preflight Safe Point" \
  --mode manual \
  --branch "$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)" \
  --cwd tinyutils \
  --summary "Tar archive: ${LATEST_TAR##*/}" \
  --summary "HEAD: $HEAD_LINE" \
  --summary "$(echo "$GIT_STATUS" | head -n 1)" \
  --evidence "${SAFE_DIR#${ROOT_DIR}/}" \
  --timestamp "$MAD_TS_HUMAN" >/dev/null 2>&1 || true

echo "[safe-point] Done: $SAFE_DIR"

