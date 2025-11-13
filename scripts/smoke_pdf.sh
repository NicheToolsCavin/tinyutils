#!/usr/bin/env bash
set -euo pipefail
BASE="${1:?Preview or prod base URL required, e.g. https://tinyutils.vercel.app}"
echo "[1] Minimal Markdown -> PDF"
curl -sS -X POST "$BASE/api/convert" \
  -H 'content-type: application/json' \
  --data '{"inputs":[{"text":"# Hello PDF 👋"}],"to":["pdf"],"from":"markdown"}' \
  | tee /dev/stderr | jq -e '.ok == true and .outputs[0].size > 1024'

echo "[2] Emoji & data-URI image -> success"
curl -sS -X POST "$BASE/api/convert" \
  -H 'content-type: application/json' \
  --data '{"inputs":[{"text":"<p>Pic: <img src=\"data:image/png;base64,iVBORw0KGgoAAA...\"/></p> 🙂"}],"to":["pdf"],"from":"html"}' \
  | tee /dev/stderr | jq -e '.ok == true'

echo "[3] External image (SSRF) -> error"
curl -sS -X POST "$BASE/api/convert" \
  -H 'content-type: application/json' \
  --data '{"inputs":[{"text":"<img src=\"https://example.com/x.png\"/>"}],"to":["pdf"],"from":"html"}' \
  | tee /dev/stderr | jq -e '.ok == false or (.errors|length>0)'
echo "Smoke OK"
