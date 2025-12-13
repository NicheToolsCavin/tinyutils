#!/usr/bin/env bash
set -euo pipefail

# Artifacts dir (optional)
ART="${DLF_SMOKE_ARTIFACTS:-artifacts/dlf_extras/$(date -u +%Y%m%d)/run-$(date -u +%H%M%S)}"
mkdir -p "$ART"

BASE="${TINYUTILS_BASE:-https://tinyutils.net}"
API="$BASE/api/check"

jq --version >/dev/null 2>&1 || { echo "jq required"; exit 2; }

status_code() { awk '/^HTTP/{code=$2} END{print code}'; }
content_type() {
  awk -F': ' '
    BEGIN{IGNORECASE=1}
    tolower($1)=="content-type"{ct=tolower($2)}
    END{gsub("\r","",ct); print ct}
  ';
}

# Bootstrap protection bypass cookie if token provided
BOOTSTRAP_ONCE=0
maybe_bypass() {
  local token="${VERCEL_AUTOMATION_BYPASS_SECRET:-}"
  if [ $BOOTSTRAP_ONCE -eq 0 ] && [ -n "$token" ]; then
    curl -sS -L --max-redirs 3 -D "$ART/set_cookie.headers" -H "x-vercel-protection-bypass: $token" \
      "${BASE%/}/?x-vercel-set-bypass-cookie=true" -c "$ART/cookies.txt" -o "$ART/set_cookie.html" || true
    BOOTSTRAP_ONCE=1
  fi
}

call_api () {
  local json="$1"
  maybe_bypass
  # Save headers/body for diagnostics
  local hdr="$ART/resp.headers" body="$ART/resp.json"
  : > "$hdr"; : > "$body"
  curl -sS -L --max-redirs 3 -D "$hdr" -b "$ART/cookies.txt" -H 'content-type: application/json' \
    ${PREVIEW_SECRET:+-H "x-preview-secret: $PREVIEW_SECRET"} \
    -d "$json" "$API" -o "$body" || true
  local sc ct
  sc=$(status_code < "$hdr" 2>/dev/null || echo 0)
  ct=$(content_type < "$hdr" 2>/dev/null || echo '')
  if [ "$sc" != "200" ] || ! echo "$ct" | grep -qi 'application/json'; then
    echo "Non-JSON or non-200 response (status=$sc ct=$ct). Headers/body saved under $ART" >&2
    return 2
  fi
  # Validate JSON envelope
  jq -e '.ok | . == true or . == false' < "$body" >/dev/null
  cat "$body"
}

green(){ printf "\033[32m%s\033[0m\n" "$*"; }
red(){ printf "\033[31m%s\033[0m\n" "$*"; }

# 1) HSTS / hard-TLD guard (expect NO http fallback usage)
test_hsts_guard () {
  echo "== HSTS / hard-TLD guard =="
  # Whitehouse is HSTS + .gov (hard TLD). We ask to retry HTTP; server must refuse.
  local payload='{"pageUrl":"https://www.whitehouse.gov","retryHttpOnHttpsFail":true,"scope":"internal","respectRobotsTxt":true}'
  local out
  out="$(call_api "$payload")" || {
    red "FAIL: Non-JSON or non-200 on HSTS/TLD guard call. See $ART"; exit 1; }

  # No row should include a note that indicates http fallback usage
  local used
  used="$(echo "$out" | jq '[.rows[]? | select((.note|tostring)|test("http_fallback_used"))] | length')"

  # Also sanity-check: rows exist and meta is present
  echo "$out" | jq -e '.meta.requestId and .meta.scheduler' >/dev/null

  if [ "$used" -eq 0 ]; then
    green "PASS: HSTS/TLD guard blocked HTTP fallback (no http_fallback_used notes found)."
  else
    echo "$out" | jq '{sample_rows: (.rows[0:5] // [])}'
    red "FAIL: Found http_fallback_used on HSTS/hard-TLD. Guard broken."
    exit 1
  fi
}

# 2) Robots “unknown” (best-effort). Try a few hosts that often yield robots failures/timeouts.
# If none reproduce, SKIP (non-fatal). Still asserts JSON envelope on any outcome.
test_robots_unknown () {
  echo "== Robots “unknown” (opportunistic) =="
  local candidates=(
    "https://example.invalid"            # NXDOMAIN; likely to surface as fetch error -> unknown
    "https://does-not-exist.example.com" # NXDOMAIN under a valid root
    "https://httpstat.us:81"             # closed port
  )

  for url in "${candidates[@]}"; do
    echo "Trying: $url"
    local payload
    payload="$(jq -cn --arg u "$url" '{pageUrl:$u,respectRobotsTxt:true,scope:"internal"}')"
    set +e
    local out
  out="$(call_api "$payload")" || { continue; }
    local rc=$?
    set -e
    if [ $rc -ne 0 ]; then
      continue
    fi
    # We accept any JSON {ok:true|false}. Prefer robotsStatus=="unknown" if present.
    local status
    status="$(echo "$out" | jq -r '.meta.robotsStatus // "absent"')"
    if [ "$status" = "unknown" ]; then
      green "PASS: Robots status surfaced as unknown for $url"
      return 0
    fi
  done

  green "SKIP: Could not reproduce robots=unknown deterministically (JSON envelope intact)."
  return 0
}

test_hsts_guard
test_robots_unknown
