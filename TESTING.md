# Testing TinyUtils

TinyUtils now carries a lightweight regression suite plus manual smokes for preview security.

## Automated suite (Node ≥20)

```bash
pnpm install --silent
pnpm test
```

What runs:
- `tests/api_contracts.test.mjs` — validates JSON envelope shape, status codes, and request-id propagation for Edge APIs.
- `tests/dlf_envelope_invariants.test.mjs` — checks Dead Link Finder response invariants and error surfaces.
- `tests/csv_hardening.unit.test.mjs` — guards against CSV injection regressions (leading `= + - @`).

Store the log and exit code under `tinyutils/artifacts/pr4-tests/<YYYYMMDD>/`.

## Preview fence smoke (PR3)

```bash
export TZ=Europe/Madrid
TODAY=$(date +%Y%m%d)
ART=tinyutils/artifacts/pr3-fence/$TODAY
mkdir -p "$ART"
PREVIEW_URL=${PREVIEW_URL:-https://tinyutils-eight.vercel.app}
node scripts/preview_smoke.mjs | tee "$ART/smoke.txt"
```

Follow with the manual 401→200 curl captures described in `README-VERCEL.md`; save headers/cookies alongside the smoke output.
