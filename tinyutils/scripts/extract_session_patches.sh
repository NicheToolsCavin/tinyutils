#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'USAGE'
Usage: extract_session_patches.sh [options]

Options:
  --base DIR        Base folder that contains .code* (default: $HOME/dev/CodeProjects/code_config_hacks)
  --out DIR         Output folder (default: $HOME/dev/TinyBackups/tmp_restore/session_patches)
  --agents GLOB     Agent folder glob under base (default: .code*)
  --dates CSV       Comma-separated list of dates in YYYY/MM/DD (e.g. 2025/11/06,2025/11/07)
  --since DATE      Lower bound date (inclusive), format YYYY/MM/DD
  --until DATE      Upper bound date (inclusive), format YYYY/MM/DD
  --session STR     Only files whose name/path contains this substring
  --types LIST      Which extractors to run: diff,unified (default: diff,unified)
  --dry-run         Print what would be processed without writing files
  --open            Open the output folder in Finder when done
  -h, --help        Show this help

Examples:
  # Extract patches for Nov 6–8 from every .code* session folder
  bash tinyutils/scripts/extract_session_patches.sh \\
    --since 2025/11/06 --until 2025/11/08 --open

  # Extract only from .code-sonic-tornado for Nov 7
  bash tinyutils/scripts/extract_session_patches.sh \\
    --agents .code-sonic-tornado --dates 2025/11/07 \\
    --out "$HOME/dev/TinyBackups/tmp_restore/sonic_patches" --open

  # Dry-run: list files matched by the filters
  bash tinyutils/scripts/extract_session_patches.sh --dry-run --session rollout-2025-11-07
USAGE
}

BASE_DIR=${PATCH_LOG_BASE:-"$HOME/dev/CodeProjects/code_config_hacks"}
OUT_DIR=${PATCH_OUT_DIR:-"$HOME/dev/TinyBackups/tmp_restore/session_patches"}
AGENTS_GLOB=".code*"
DATES_CSV=""
SINCE=""
UNTIL_=""
SESSION_SUBSTR=""
EXTRACT_TYPES="diff,unified"
DRY_RUN=0
DO_OPEN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)   BASE_DIR="$2"; shift 2;;
    --out)    OUT_DIR="$2"; shift 2;;
    --agents) AGENTS_GLOB="$2"; shift 2;;
    --dates)  DATES_CSV="$2"; shift 2;;
    --since)  SINCE="$2"; shift 2;;
    --until)  UNTIL_="$2"; shift 2;;
    --session) SESSION_SUBSTR="$2"; shift 2;;
    --types)  EXTRACT_TYPES="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    --open)   DO_OPEN=1; shift;;
    -h|--help) show_help; exit 0;;
    *) echo "Unknown option: $1" >&2; show_help; exit 2;;
  esac
done

mkdir -p "$OUT_DIR"

# Build list of date folders
build_date_list() {
  local base="$1" agents="$2" since="$3" until="$4" dates_csv="$5"
  if [[ -n "$dates_csv" ]]; then
    echo "$dates_csv" | tr ',' '\n'
    return 0
  fi
  # Discover dates under sessions
  find "$base" -maxdepth 4 -type d -path "$base/$agents/sessions/*/*" 2>/dev/null \
    | awk -F'/sessions/' '{print $2}' \
    | sort -u \
    | while read -r d; do
        # Filter by since/until if provided (lexicographic is OK for YYYY/MM/DD)
        if [[ -n "$since" && "$d" < "$since" ]]; then continue; fi
        if [[ -n "$until" && "$d" > "$until" ]]; then continue; fi
        echo "$d"
      done
}

DATE_LIST=$(build_date_list "$BASE_DIR" "$AGENTS_GLOB" "$SINCE" "$UNTIL_" "$DATES_CSV")
if [[ -z "$DATE_LIST" ]]; then
  # Fallback to useful defaults if nothing was discovered
  DATE_LIST=$'2025/11/06\n2025/11/07\n2025/11/08'
fi

# Build file list
LIST=$(while read -r d; do
  printf '%s\n' "$BASE_DIR/$AGENTS_GLOB/sessions/$d/"*json*
done <<< "$DATE_LIST" | sort)

if (( DRY_RUN )); then
  echo "Would scan files:" >&2
  printf '%s\n' "$LIST"
  exit 0
fi

count=0
INDEX_FILE="$OUT_DIR/INDEX.txt"
: >"$INDEX_FILE"

printf '%s\n' "$LIST" | while IFS= read -r src; do
  [[ -n "$src" && -e "$src" ]] || continue
  if [[ -n "$SESSION_SUBSTR" && "$src" != *"$SESSION_SUBSTR"* ]]; then
    continue
  fi
  bn="$(basename "$src")"
  # Extract fenced ```diff blocks
  if [[ ",$EXTRACT_TYPES," == *",diff,"* ]]; then
    awk -v outdir="$OUT_DIR" -v stem="$bn" '
      BEGIN{inblk=0; idx=0}
      /^```diff\r?$/ { inblk=1; idx++; file=sprintf("%s/%s.%02d.diff.patch", outdir, stem, idx); next }
      /^```\r?$/ { if(inblk){ inblk=0 } next }
      { if(inblk){ print >> file } }
    ' "$src"
  fi
  # Extract JSON unified_diffs via jq (safer than regex)
  if [[ ",$EXTRACT_TYPES," == *",unified,"* ]]; then
    if command -v jq >/dev/null 2>&1; then
      i=0
      while IFS= read -r block; do
        i=$((i+1))
        out="$OUT_DIR/$bn.$(printf '%02d' "$i").unified.patch"
        printf '%s' "$block" > "$out"
      done < <(jq -r '.. | .payload? | .msg? | .unified_diff? // empty' "$src")
    fi
  fi
done

# Build index
for p in "$OUT_DIR"/*.patch; do
  [[ -e "$p" ]] || continue
  printf "%s\n" "$(basename "$p")" >>"$INDEX_FILE"
  count=$((count+1))
done

echo "Extracted $count patch snippets to $OUT_DIR"

if (( DO_OPEN )); then
  open "$OUT_DIR" >/dev/null 2>&1 || true
fi
