#!/usr/bin/env bash
set -euo pipefail

# Poll PR for a Vercel Preview URL, then record it, post a comment,
# append a short AGENT_RUN_LOG.md entry, and exit. Designed for one-shot overnight use.

PR_NUMBER="${1:-33}"
TRIES="${TRIES:-240}"   # 240 * 30s = ~2 hours
SLEEP_SECS="${SLEEP_SECS:-30}"

extract_preview_url() {
  local pr_json
  pr_json=$(gh pr view "$PR_NUMBER" --json body,comments,statusCheckRollup || true)
  printf "%s\n" "$pr_json" | rg -o "https?://[a-zA-Z0-9-]+\.vercel\.app" -m 1 -N || true
}

log_note() {
  local msg="$1"; printf "[poll_preview_url] %s\n" "$msg" 1>&2
}

main() {
  local url=""
  for ((i=1; i<=TRIES; i++)); do
    url=$(extract_preview_url)
    if [[ -n "$url" ]]; then
      log_note "Found preview URL: $url"
      local DATE; DATE=$(date -u +%Y%m%d)
      local ART="artifacts/convert/$DATE"
      mkdir -p "$ART"
      printf "%s\n" "$url" > "$ART/preview_url.txt"

      # Reachability probe (200 or 401 acceptable due to protection)
      local code
      code=$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)
      [[ -z "$code" ]] && code="(unreachable)"

      # PR comment
      local body
      body=$(cat <<EOF
Preview URL: $url
Probe status: HTTP $code (200 or 401 acceptable due to protection)

Morning: run converter smokes (md→docx|rtf|pdf; html→pdf) and attach B2 before/after + meta.
Artifacts: tinyutils/$ART
EOF
)
      gh pr comment "$PR_NUMBER" --body "$body" >/dev/null 2>&1 || true

      # Append AGENT_RUN_LOG.md entry
      python3 scripts/log_run_entry.py \
        --title "Manual - Preview URL captured" \
        --mode "manual" \
        --branch "fix/converter-pdf-rtf-ui-testplan-gcp" \
        --cwd "$PWD" \
        --summary "Preview: $url (probe $code). Artifacts recorded under $ART." \
        --evidence "$ART/preview_url.txt" \
        --followup "Run smokes in morning; attach B2 before/after + meta."
      git add docs/AGENT_RUN_LOG.md || true
      git commit -m "docs(run): record Preview URL ($code) for PR #$PR_NUMBER" || true
      git push || true

      log_note "Recorded preview URL and posted PR comment. Exiting."
      exit 0
    fi
    log_note "Preview not yet available (try $i/$TRIES). Sleeping ${SLEEP_SECS}s..."
    sleep "$SLEEP_SECS"
  done
  log_note "Timed out waiting for a Vercel Preview URL on PR #$PR_NUMBER."
  exit 2
}

main "$@"

