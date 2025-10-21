# tinyutils
TinyUtils

## DLF Quick Extras (smokes)

Run against production (override with `TINYUTILS_BASE`):

```bash
pnpm smoke:extras
```

Assertions:
- HSTS / hard-TLD guard — even with `retryHttpOnHttpsFail=true`, HTTP fallback is never used on guarded domains.
- Robots “unknown” (best-effort) — probes a small set of flaky hosts and always validates the JSON envelope; surfaces `robotsStatus=unknown` when reproducible.

Optional UI sanity (local, uses Tiny-Reactive):

```bash
tiny-reactive serve --host 127.0.0.1 --port 5566 --headful --debug
pnpm ui:smoke:dlf
```

Artifacts save to `./.debug/` (e.g., `dlf-ui.png`).
