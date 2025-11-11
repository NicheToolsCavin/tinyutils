#!/usr/bin/env bash

# TinyUtils repo backup helper.
# Usage:
#   ./scripts/backup_repo.sh [destination_dir]
# The destination defaults to ~/dev/TinyBackups and keeps timestamped tarballs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Store archives outside the repo to avoid accidental git adds.
DEFAULT_DEST="$HOME/dev/TinyBackups"
DESTINATION="${1:-$DEFAULT_DEST}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
ARCHIVE_NAME="tinyutils-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${DESTINATION%/}/${ARCHIVE_NAME}"

FORCE="${FORCE:-0}"
MIN_INTERVAL_SECONDS="${MIN_INTERVAL_SECONDS:-0}"
SKIP_IF_CLEAN="${SKIP_IF_CLEAN:-0}"
STAMP_FILE="${DESTINATION%/}/.last_backup"

if [[ "$SKIP_IF_CLEAN" == "1" ]]; then
  status_output="$(git -C "$REPO_ROOT" status --porcelain)"
  if [[ -z "$status_output" ]]; then
    echo "No repo changes detected; skipping backup."
    exit 0
  fi
fi

if [[ "$FORCE" != "1" && "$MIN_INTERVAL_SECONDS" =~ ^[0-9]+$ && "$MIN_INTERVAL_SECONDS" -gt 0 && -f "$STAMP_FILE" ]]; then
  now_epoch="$(date +%s)"
  last_epoch="$(stat -f %m "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now_epoch - last_epoch < MIN_INTERVAL_SECONDS )); then
    echo "Last backup completed $(( now_epoch - last_epoch ))s ago (< ${MIN_INTERVAL_SECONDS}s); skipping."
    exit 0
  fi
fi

mkdir -p "$DESTINATION"

echo "Creating backup archive at: $ARCHIVE_PATH"

tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='artifacts' \
  --exclude='*.log' \
  --exclude='backups' \
  --exclude='*.tmp' \
  --exclude='*.tar.gz' \
  -czf "$ARCHIVE_PATH" \
  -C "$(dirname "$REPO_ROOT")" \
  "$(basename "$REPO_ROOT")"

echo "Backup complete."

# Optional pruning: keep the most recent 14 archives by default.
KEEP_COUNT="${KEEP_COUNT:-14}"

if [[ "$KEEP_COUNT" =~ ^[0-9]+$ && "$KEEP_COUNT" -gt 0 ]]; then
  echo "Pruning backups to keep the most recent $KEEP_COUNT archives…"
  backups=()
  while IFS= read -r file; do
    [[ -n "$file" ]] && backups+=("$file")
  done < <(ls -1t "$DESTINATION"/tinyutils-*.tar.gz 2>/dev/null || true)
  if ((${#backups[@]} > KEEP_COUNT)); then
    for ((i=KEEP_COUNT; i<${#backups[@]}; i++)); do
      echo "Removing old archive: ${backups[$i]}"
      rm -f "${backups[$i]}"
    done
  fi
fi

echo "Done."

touch "$STAMP_FILE"
