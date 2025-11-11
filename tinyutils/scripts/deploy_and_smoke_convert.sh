#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/.." && pwd)"
SMOKE_SCRIPT="${ROOT_DIR}/scripts/smoke_convert_preview.mjs"
SAFEPOINT_SCRIPT="${ROOT_DIR}/scripts/create_safe_point.sh"
set -a
[ -f "$ROOT_DIR/.env.preview" ] && . "$ROOT_DIR/.env.preview"
set +a
cd "$ROOT_DIR"
declare -a PREVIEW_HEADERS=()
strip_secret_var() {
  local var=$1
  local value="${!var-}"
  [[ -z "$value" ]] && return 0
  value="${value//$'\r'/}"
  value="${value//$'\n'/}"
  printf -v "$var" '%s' "$value"
}

normalize_secret_vars() {
  local var
  for var in "$@"; do
    strip_secret_var "$var"
  done
}

urlencode() {
  python3 - <<'PY'
import sys
from urllib.parse import quote
value = sys.stdin.read()
if value.endswith('\n'):
    value = value[:-1]
print(quote(value, safe=''))
PY
}

PREVIEW_PROTECTION_TOKEN=""
PREVIEW_PROTECTION_SOURCE=""

select_protection_token() {
  local candidate val
  for candidate in VERCEL_AUTOMATION_BYPASS_SECRET PREVIEW_BYPASS_TOKEN BYPASS_TOKEN; do
    val="${!candidate-}"
    if [[ -n "$val" ]]; then
      PREVIEW_PROTECTION_TOKEN="$val"
      PREVIEW_PROTECTION_SOURCE="$candidate"
      return 0
    fi
  done
  return 1
}

normalize_secret_vars BYPASS_TOKEN PREVIEW_BYPASS_TOKEN PREVIEW_SECRET PREVIEW_FENCE_HEADER VERCEL_AUTOMATION_BYPASS_SECRET
if [[ -n "${PREVIEW_FENCE_HEADER:-}" ]]; then
  PREVIEW_HEADERS+=("${PREVIEW_FENCE_HEADER}")
fi
unset PREVIEW_FENCE_HEADER
if [[ -n "${VERCEL_GIT_COMMIT_AUTHOR_EMAIL:-}" ]]; then
  export GIT_AUTHOR_EMAIL="$VERCEL_GIT_COMMIT_AUTHOR_EMAIL"
  export GIT_COMMITTER_EMAIL="$VERCEL_GIT_COMMIT_AUTHOR_EMAIL"
fi
if [[ -n "${VERCEL_GIT_COMMIT_AUTHOR_NAME:-}" ]]; then
  export GIT_AUTHOR_NAME="$VERCEL_GIT_COMMIT_AUTHOR_NAME"
  export GIT_COMMITTER_NAME="$VERCEL_GIT_COMMIT_AUTHOR_NAME"
fi
DEPLOY_TIMEOUT_SECONDS=${DEPLOY_TIMEOUT_SECONDS:-240}
READINESS_TIMEOUT_SECONDS=${READINESS_TIMEOUT_SECONDS:-300}
POLL_INTERVAL_SECONDS=${POLL_INTERVAL_SECONDS:-10}

UTC_DATE="$(TZ=UTC date +%Y%m%d)"
MAD_TS="$(TZ=Europe/Madrid date +%Y%m%dT%H%M%S)"
ART_DIR="${ROOT_DIR}/artifacts/convert/${UTC_DATE}/smoke-preview-${MAD_TS}"
mkdir -p "${ART_DIR}"

STATUS_FILE="${ART_DIR}/deploy_status.txt"
STATUS="pending"
MESSAGE="initializing"
PREVIEW_URL=""
RUN_LOG_FILE="${ROOT_DIR}/docs/AGENT_RUN_LOG.md"
PREVIEW_COOKIE_LOG="${ART_DIR}/preview_bypass_cookie.log"
PREVIEW_FENCE_HEADER_FILE="${ART_DIR}/preview_fence_header.txt"

log() {
  printf '[deploy_and_smoke_convert] %s\n' "$*" >&2
}

if select_protection_token; then
  PREVIEW_HEADERS+=("x-vercel-protection-bypass: $PREVIEW_PROTECTION_TOKEN")
else
  log "Preview protection bypass token not provided; preview requests may remain gated"
fi

write_status() {
  local ts
  ts="$(TZ=Europe/Madrid date '+%Y-%m-%d %H:%M:%S %Z')"
  {
    printf 'timestamp=%s\n' "$ts"
    printf 'status=%s\n' "$STATUS"
    printf 'message=%s\n' "$MESSAGE"
    printf 'preview_url=%s\n' "${PREVIEW_URL:-n/a}"
    printf 'artifacts=%s\n' "${ART_DIR#${ROOT_DIR}/}"
  } >"$STATUS_FILE"
}

append_run_log() {
  local art_rel timestamp entry_file tmp
  art_rel="${ART_DIR#${ROOT_DIR}/}"
  timestamp="$(TZ=Europe/Madrid date '+%Y-%m-%d %H:%M CET')"
  entry_file=$(mktemp)
  printf '### %s - Auto - deploy_and_smoke_convert\n- **Status:** %s\n- **Preview:** %s\n- **Artifacts:** %s\n\n' \
    "$timestamp" "$STATUS" "${PREVIEW_URL:-n/a}" "$art_rel" >"$entry_file"
  tmp=$(mktemp)
  if [[ -f "$RUN_LOG_FILE" ]]; then
    if grep -q '^## Sessions' "$RUN_LOG_FILE"; then
      awk -v entry_file="$entry_file" '
        BEGIN { inserted=0 }
        {
          print
          if (!inserted && /^## Sessions/) {
            print ""
            while ((getline line < entry_file) > 0) print line
            close(entry_file)
            inserted=1
          }
        }
        END {
          if (!inserted) {
            print ""
            while ((getline line < entry_file) > 0) print line
            close(entry_file)
          }
        }
      ' "$RUN_LOG_FILE" >"$tmp"
    else
      { printf '# Agent Run Log\n\n## Sessions\n\n'; cat "$entry_file"; } >"$tmp"
    fi
  else
    { printf '# Agent Run Log\n\n## Sessions\n\n'; cat "$entry_file"; } >"$tmp"
  fi
  mv "$tmp" "$RUN_LOG_FILE"
  rm -f "$entry_file"
}

cleanup() {
  local exit_code=${1:-$?}
  trap - EXIT
  write_status
  if ! append_run_log; then
    log "Failed to append ${RUN_LOG_FILE#${ROOT_DIR}/}; marking run_log_append_failed"
    STATUS="run_log_append_failed"
    MESSAGE="Unable to update ${RUN_LOG_FILE#${ROOT_DIR}/}"
    write_status
    exit_code=1
  fi
  exit "$exit_code"
}

trap 'cleanup $?' EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    STATUS="missing_dependency"
    MESSAGE="Missing required command: $1"
    exit 1
  fi
}

log "Artifacts directory: ${ART_DIR#${ROOT_DIR}/}"

# Optional preflight safe point (create tar + log entry), enabled by default
if [[ "${SAFEPOINT_ON_DEPLOY:-1}" == "1" && -x "$SAFEPOINT_SCRIPT" ]]; then
  log "Running preflight safe point…"
  LOG_MIRROR_DIR="$HOME/dev/TinyBackups/log_mirror" bash "$SAFEPOINT_SCRIPT" >"${ART_DIR}/safepoint.log" 2>&1 || true
fi

if [[ "${DEPLOY_LANE_BENCHED:-0}" == "1" ]]; then
  STATUS="benched"
  MESSAGE="Deploy lane benched; skipping"
  exit 0
fi

require_cmd node
require_cmd curl

if [[ ! -f "$SMOKE_SCRIPT" ]]; then
  STATUS="missing_smoke_script"
  MESSAGE="${SMOKE_SCRIPT#${ROOT_DIR}/} not found"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  log "Installing Vercel CLI"
  require_cmd npm
  if ! npm install -g vercel@latest >"${ART_DIR}/vercel_install.log" 2>&1; then
    STATUS="vercel_install_failed"
    MESSAGE="npm install -g vercel@latest failed"
    exit 1
  fi
fi

if ! vercel --version >"${ART_DIR}/vercel_version.txt" 2>&1; then
  STATUS="vercel_version_failed"
  MESSAGE="Unable to read vercel version"
  exit 1
fi

run_with_timeout() {
  local timeout_seconds=$1
  shift
  local log_target=$1
  shift
  set +e
  "$@" >"${log_target}" 2>&1 &
  local cmd_pid=$!
  tail -f "${log_target}" &
  local tail_pid=$!
  local elapsed=0
  while kill -0 "$cmd_pid" >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if (( elapsed >= timeout_seconds )); then
      log "Command timed out after ${timeout_seconds}s; sending SIGTERM"
      kill "$cmd_pid" >/dev/null 2>&1 || true
      kill "$tail_pid" >/dev/null 2>&1 || true
      wait "$cmd_pid" >/dev/null 2>&1 || true
      set -e
      return 124
    fi
  done
  wait "$cmd_pid"
  local exit_code=$?
  kill "$tail_pid" >/dev/null 2>&1 || true
  set -e
  return "$exit_code"
}

vercel_with_auth() {
  local args=("$@")
  if [[ -n "${VERCEL_TOKEN:-}" ]]; then
    args+=(--token "$VERCEL_TOKEN")
  fi
  if [[ -n "${VERCEL_SCOPE:-}" ]]; then
    args+=(--scope "$VERCEL_SCOPE")
  fi
  vercel "${args[@]}"
}

if ! vercel_with_auth whoami >"${ART_DIR}/vercel_whoami.log" 2>&1; then
  if [[ -z "${VERCEL_TOKEN:-}" ]]; then
    STATUS="missing_credentials"
    MESSAGE="Vercel credentials not provided"
    exit 2
  fi
  STATUS="vercel_whoami_failed"
  MESSAGE="vercel whoami failed (see artifacts)"
  exit 1
fi

if ! vercel_with_auth pull --environment=preview --yes >"${ART_DIR}/vercel_pull.log" 2>&1; then
  STATUS="vercel_pull_failed"
  MESSAGE="vercel pull failed"
  exit 1
fi

BACKOFFS=(30 60)
deploy_attempts=0
deploy_success=0
PREVIEW_URL=""
while (( deploy_attempts < 3 )); do
  deploy_attempts=$((deploy_attempts + 1))
  attempt_log="${ART_DIR}/vercel_deploy_attempt${deploy_attempts}.log"
  vercel_with_auth deploy --yes >"${attempt_log}" 2>&1 &
  deploy_pid=$!
  url=""
  for _ in $(seq 1 30); do
    url=$(grep -Eo 'https://[^ ]+\.vercel\.app' "${attempt_log}" | tail -1 || true)
    [[ -n "$url" ]] && break
    sleep 1
  done
  if wait "$deploy_pid"; then
    cp "${attempt_log}" "${ART_DIR}/vercel_deploy.log"
    PREVIEW_URL="$url"
    deploy_success=1
    break
  fi
  if (( deploy_attempts < 3 )); then
    sleep "${BACKOFFS[$((deploy_attempts - 1))]}"
  fi
done

if (( deploy_success == 0 )); then
  STATUS="vercel_deploy_failed"
  MESSAGE="vercel deploy failed"
  exit 1
fi

if [[ -z "$PREVIEW_URL" ]]; then
  STATUS="preview_url_missing"
  MESSAGE="Preview URL not found in deploy logs"
  exit 1
fi

log "Preview URL: $PREVIEW_URL"

mint_bypass_cookie() {
  if [[ -z "${PREVIEW_URL:-}" ]]; then
    return 0
  fi
  if [[ -z "${PREVIEW_PROTECTION_TOKEN:-}" ]]; then
    log "Preview protection bypass token not provided; skipping mint"
    return 0
  fi
  rm -f "$PREVIEW_FENCE_HEADER_FILE"
  local token="$PREVIEW_PROTECTION_TOKEN"
  local header_file signed_cookie timestamp cookie_url encoded_token
  header_file=$(mktemp)
  timestamp="$(TZ=UTC date '+%Y-%m-%dT%H:%M:%SZ')"
  encoded_token=$(printf '%s' "$token" | urlencode)
  cookie_url="${PREVIEW_URL%/}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encoded_token}"
  printf '%s Attempting preview bypass mint\n' "$timestamp" >>"$PREVIEW_COOKIE_LOG"
  if curl -sS -D "$header_file" -o /dev/null \
       -H "x-vercel-protection-bypass: $token" \
       -H "x-vercel-set-bypass-cookie: true" \
       "$cookie_url"; then
    signed_cookie=$(awk 'BEGIN { IGNORECASE=1 }
      /^set-cookie:/ {
        line=$0
        if (match(tolower(line), "(vercel-protection-bypass|_vercel_jwt)=[^;]+")) {
          print substr(line, RSTART, RLENGTH)
          exit
        }
      }' "$header_file")
    if [[ -n "$signed_cookie" ]]; then
      PREVIEW_HEADERS+=("Cookie: $signed_cookie")
      printf '%s Minted preview bypass cookie\n' "$(TZ=UTC date '+%Y-%m-%dT%H:%M:%SZ')" >>"$PREVIEW_COOKIE_LOG"
      printf 'Cookie: %s' "$signed_cookie" >"$PREVIEW_FENCE_HEADER_FILE"
      chmod 600 "$PREVIEW_FENCE_HEADER_FILE" 2>/dev/null || true
      log "Minted preview protection cookie"
    else
      printf '%s Response missing vercel-protection-bypass cookie\n' "$(TZ=UTC date '+%Y-%m-%dT%H:%M:%SZ')" >>"$PREVIEW_COOKIE_LOG"
      log "Minted bypass request but no vercel-protection-bypass cookie captured"
    fi
  else
    printf '%s Failed to reach preview bypass endpoint\n' "$(TZ=UTC date '+%Y-%m-%dT%H:%M:%SZ')" >>"$PREVIEW_COOKIE_LOG"
    log "Failed to mint vercel-protection-bypass cookie"
  fi
  if [[ -n "${ART_DIR:-}" && -f "$header_file" ]]; then
    cp "$header_file" "$ART_DIR/preview_bypass_headers.txt" 2>/dev/null || true
  fi
  rm -f "$header_file"
}

set_preview_header_env() {
  if (( ${#PREVIEW_HEADERS[@]} )); then
    PREVIEW_FENCE_HEADER=$(printf '%s\n' "${PREVIEW_HEADERS[@]}")
    export PREVIEW_FENCE_HEADER
  else
    unset PREVIEW_FENCE_HEADER
  fi
}

mint_bypass_cookie || true
set_preview_header_env
if (( ${#PREVIEW_HEADERS[@]} )); then
  printf '%s\n' "${PREVIEW_HEADERS[@]}" >"${ART_DIR}/preview_headers.txt"
fi

curl_ready() {
  local url=$1
  shift || true
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$@" "$url" || true)
  case "$status" in
    200|204|301|302|307|308|401|403|404|405)
      return 0
      ;;
  esac
  return 1
}

wait_for_ready() {
  local start_ts timeout=${READINESS_TIMEOUT_SECONDS}
  start_ts=$(date +%s)
  local headers=()
  if (( ${#PREVIEW_HEADERS[@]} )); then
    local header
    for header in "${PREVIEW_HEADERS[@]}"; do
      headers+=(-H "$header")
    done
  fi
  while true; do
    local curl_args=()
    if (( ${#headers[@]} )); then
      curl_args=("${headers[@]}")
    fi
    if vercel_with_auth inspect "$PREVIEW_URL" >"${ART_DIR}/vercel_inspect.log" 2>&1 &&
       grep -q "READY" "${ART_DIR}/vercel_inspect.log"; then
      return 0
    fi
    local api_endpoint="${PREVIEW_URL%/}/api/convert"
    local root_endpoint="${PREVIEW_URL%/}/"
    if (( ${#curl_args[@]} )); then
      if curl_ready "$api_endpoint" "${curl_args[@]}" || \
       curl_ready "$root_endpoint" "${curl_args[@]}"; then
        return 0
      fi
    else
      if curl_ready "$api_endpoint" || curl_ready "$root_endpoint"; then
        return 0
      fi
    fi
    if (( $(date +%s) - start_ts >= timeout )); then
      return 1
    fi
    sleep "${POLL_INTERVAL_SECONDS}"
  done
}

if ! wait_for_ready; then
  STATUS="deploy_not_ready"
  MESSAGE="Preview never became ready"
  exit 1
fi

CONVERT_SMOKE_ARTIFACTS="$ART_DIR" PREVIEW_URL="$PREVIEW_URL" PREVIEW_FENCE_HEADER="${PREVIEW_FENCE_HEADER:-}" \
  node "$SMOKE_SCRIPT" >"${ART_DIR}/smoke.log" 2>&1 || {
  STATUS="smoke_failed"
  MESSAGE="Converter preview smoke failed"
  exit 1
}

STATUS="success"
MESSAGE="Preview deploy and converter smoke succeeded"
