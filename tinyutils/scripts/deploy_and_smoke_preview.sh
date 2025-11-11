#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/.." && pwd)"
LOG_FILE="${ROOT_DIR}/docs/AGENT_RUN_LOG.md"
SMOKE_SCRIPT="${ROOT_DIR}/scripts/smoke_convert_preview.mjs"

UTC_DATE="$(TZ=UTC date +%Y%m%d)"
MAD_TS="$(TZ=Europe/Madrid date +%Y%m%dT%H%M%S)"
ART_DIR="${ROOT_DIR}/artifacts/convert/${UTC_DATE}/smoke-preview-${MAD_TS}"
mkdir -p "${ART_DIR}"

append_log() {
  local status="$1"
  local preview_url="$2"
  local artifact_path="$3"
  local entry_ts="$(TZ=Europe/Madrid date '+%Y-%m-%d %H:%M CET')"
  local rel_path="${artifact_path#${ROOT_DIR}/}"
  rel_path="${rel_path:-n/a}"
  local temp_file
  temp_file=$(mktemp)
  {
    printf '### %s - Auto - Preview deploy lane\n' "$entry_ts"
    printf '- **Status:** %s\n' "$status"
    printf '- **Preview:** %s\n' "${preview_url:-n/a}"
    printf '- **Artifacts:** %s\n' "$rel_path"
    printf '- **Follow-ups:** None\n\n'
    cat "$LOG_FILE"
  } >"$temp_file"
  mv "$temp_file" "$LOG_FILE"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    return 1
  fi
}

if ! command -v vercel >/dev/null 2>&1; then
  npm install -g vercel@latest >/dev/null
fi
vercel --version | tee "${ART_DIR}/vercel_version.txt"

require_cmd node || {
  append_log "Missing node binary" "" "$ART_DIR"
  exit 1
}

if [[ ! -f "${SMOKE_SCRIPT}" ]]; then
  append_log "Missing smoke_convert_preview.mjs" "" "$ART_DIR"
  exit 1
}

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  append_log "Skipped (VERCEL_TOKEN not set)" "" "$ART_DIR"
  exit 0
}

VERCEL_ARGS=(--token "$VERCEL_TOKEN")
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  VERCEL_ARGS+=(--scope "$VERCEL_SCOPE")
fi

set +e
(
  cd "$ROOT_DIR"
  vercel pull --environment=preview --yes "${VERCEL_ARGS[@]}"
) &>"${ART_DIR}/vercel_pull.log"
pull_status=$?
set -e
if [[ $pull_status -ne 0 ]]; then
  append_log "vercel pull failed" "" "$ART_DIR"
  exit 1
}

set +e
(
  cd "$ROOT_DIR"
  vercel deploy --yes --confirm "${VERCEL_ARGS[@]}"
) &>"${ART_DIR}/vercel_deploy.log"
deploy_status=$?
set -e
if [[ $deploy_status -ne 0 ]]; then
  append_log "vercel deploy failed" "" "$ART_DIR"
  exit 1
}

PREVIEW_URL=$(grep -Eo 'https://[^ ]+\.vercel\.app' "${ART_DIR}/vercel_deploy.log" | tail -1)
if [[ -z "$PREVIEW_URL" ]]; then
  append_log "Preview URL not found" "" "$ART_DIR"
  exit 1
fi

set +e
(
  cd "$ROOT_DIR"
  PREVIEW_URL="$PREVIEW_URL" node "$SMOKE_SCRIPT"
) &>"${ART_DIR}/smoke.log"
smoke_status=$?
set -e

if [[ $smoke_status -ne 0 ]]; then
  append_log "Preview smoke failed" "$PREVIEW_URL" "$ART_DIR"
  exit 1
}

append_log "Preview deploy + smoke succeeded" "$PREVIEW_URL" "$ART_DIR"
