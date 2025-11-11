#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ART_ROOT="$ROOT_DIR/artifacts/convert"
SMOKE_SCRIPT="$ROOT_DIR/scripts/smoke_convert_preview.mjs"
STATUS="pending"
MESSAGE="initialized"

find_latest_artifacts() {
  find "$ART_ROOT" -maxdepth 2 -type d -name 'smoke-preview-*' -print 2>/dev/null | sort | tail -n 1
}

write_status() {
  SMOKE_ONLY_STATUS_FILE="$ART_DIR/smoke_only_status.txt"
  TS="$(TZ=Europe/Madrid date '+%Y-%m-%d %H:%M:%S %Z')"
  {
    printf 'timestamp=%s\n' "$TS"
    printf 'status=%s\n' "$STATUS"
    printf 'message=%s\n' "$MESSAGE"
    printf 'preview_url=%s\n' "${PREVIEW_URL:-n/a}"
  } >"$SMOKE_ONLY_STATUS_FILE"
}

cleanup() {
  EXIT_CODE=${1:-$?}
  trap - EXIT
  write_status
  exit "$EXIT_CODE"
}

trap 'cleanup $?' EXIT

if [ "${1:-}" ]; then
  ART_DIR="$1"
else
  if [ "${CONVERT_SMOKE_ARTIFACTS:-}" ]; then
    ART_DIR="$CONVERT_SMOKE_ARTIFACTS"
  else
    ART_DIR="$(find_latest_artifacts)"
  fi
fi

if [ -z "$ART_DIR" ]; then
  STATUS="missing_artifacts"
  MESSAGE="No smoke-preview artifact directories found"
  exit 1
fi

if [ ! -d "$ART_DIR" ]; then
  STATUS="invalid_artifacts"
  MESSAGE="Artifact directory not found: $ART_DIR"
  exit 1
fi

STATUS_FILE="$ART_DIR/deploy_status.txt"
if [ ! -f "$STATUS_FILE" ]; then
  STATUS="missing_status"
  MESSAGE="deploy_status.txt not found in artifact dir"
  exit 1
fi

PREVIEW_URL="$(grep -E '^preview_url=' "$STATUS_FILE" | head -n 1 | cut -d= -f2-)"
if [ -z "$PREVIEW_URL" ] || [ "$PREVIEW_URL" = "n/a" ]; then
  STATUS="missing_preview_url"
  MESSAGE="deploy status missing preview_url"
  exit 1
fi

if [ -z "${PREVIEW_FENCE_HEADER:-}" ] && [ -f "$ART_DIR/preview_fence_header.txt" ]; then
  PREVIEW_FENCE_HEADER="$(tr -d '\r\n' <"$ART_DIR/preview_fence_header.txt")"
fi

if [ -z "${PREVIEW_FENCE_HEADER:-}" ]; then
  STATUS="missing_cookie"
  MESSAGE="PREVIEW_FENCE_HEADER not provided"
  exit 1
fi

if [ ! -f "$SMOKE_SCRIPT" ]; then
  STATUS="missing_smoke_script"
  MESSAGE="smoke_convert_preview.mjs not found"
  exit 1
fi

LOG_FILE="$ART_DIR/smoke_only.log"
STATUS="running"
MESSAGE="Invoking smoke_convert_preview.mjs"

if ! CONVERT_SMOKE_ARTIFACTS="$ART_DIR" PREVIEW_URL="$PREVIEW_URL" PREVIEW_FENCE_HEADER="$PREVIEW_FENCE_HEADER" \
  node "$SMOKE_SCRIPT" >"$LOG_FILE" 2>&1; then
  STATUS="smoke_failed"
  MESSAGE="Smoke-only run failed"
  exit 1
fi

STATUS="success"
MESSAGE="Smoke-only run succeeded"
