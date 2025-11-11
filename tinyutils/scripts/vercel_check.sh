#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
UTC_STAMP="$(date -u +%Y%m%d)"
MAD_TS="$(TZ=Europe/Madrid date +%Y%m%dT%H%M%S)"
ART_DIR="${ROOT_DIR}/artifacts/convert/${UTC_STAMP}/cred-check-${MAD_TS}"
LOG_FILE="${ART_DIR}/vercel_whoami.log"
PROJECT_FILE="${ROOT_DIR}/.vercel/project.json"

mkdir -p "${ART_DIR}"
: >"${LOG_FILE}"

log_line() {
  printf '%s\n' "$1" >>"${LOG_FILE}"
}

run_vercel() {
  if command -v vercel >/dev/null 2>&1; then
    vercel "$@"
    return
  fi
  if command -v pnpm >/dev/null 2>&1; then
    pnpm dlx --prefer-offline vercel@latest "$@"
    return
  fi
  if command -v npx >/dev/null 2>&1; then
    npx --yes vercel@latest "$@"
    return
  fi
  echo "vercel_check: vercel CLI not available (install npm/pnpm or add vercel to PATH)." >&2
  exit 1
}

COMMON_ARGS=()
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  COMMON_ARGS+=(--token "${VERCEL_TOKEN}")
fi
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  COMMON_ARGS+=(--scope "${VERCEL_SCOPE}")
elif [[ -n "${VERCEL_ORG_ID:-}" ]]; then
  COMMON_ARGS+=(--scope "${VERCEL_ORG_ID}")
fi

log_line "== vercel whoami =="
if ! run_vercel whoami "${COMMON_ARGS[@]-}" >>"${LOG_FILE}" 2>&1; then
  echo "vercel_check: authentication failed; see ${LOG_FILE}" >&2
  exit 1
fi
log_line "== vercel whoami done =="

if [[ ! -f "${PROJECT_FILE}" ]]; then
  if [[ -n "${VERCEL_PROJECT_ID:-}" && -n "${VERCEL_ORG_ID:-}" ]]; then
    log_line "Project unlinked; running vercel link."
    if ! run_vercel link --yes --project "${VERCEL_PROJECT_ID}" "${COMMON_ARGS[@]-}" >>"${LOG_FILE}" 2>&1; then
      echo "vercel_check: vercel link failed; see ${LOG_FILE}" >&2
      exit 1
    fi
  else
    log_line "Project unlinked and VERCEL_PROJECT_ID/VERCEL_ORG_ID missing; skipping link."
  fi
fi

echo "vercel credentials OK -> ${LOG_FILE}"
