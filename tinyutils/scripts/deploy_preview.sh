#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v vercel >/dev/null 2>&1; then
  npm install -g vercel@latest >/dev/null
fi

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "deploy_preview: VERCEL_TOKEN not set, skipping deploy." >&2
  exit 0
fi

VERCEL_ARGS=(--token "$VERCEL_TOKEN")
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  VERCEL_ARGS+=(--scope "$VERCEL_SCOPE")
fi

vercel pull --environment=preview --yes "${VERCEL_ARGS[@]}"

LOG_FILE="$(mktemp)"
if vercel deploy --yes --confirm --prebuilt "${VERCEL_ARGS[@]}" | tee "$LOG_FILE"; then
  PREVIEW_URL=$(grep -Eo 'https://[^ ]+\.vercel\.app' "$LOG_FILE" | tail -1 || true)
  if [[ -n "$PREVIEW_URL" ]]; then
    echo "deploy_preview: preview ready at $PREVIEW_URL"
  else
    echo "deploy_preview: deployment succeeded but preview URL not detected." >&2
  fi
else
  echo "deploy_preview: vercel deploy failed; see $LOG_FILE" >&2
  exit 1
fi
