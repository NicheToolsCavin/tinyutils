# Security Policy for TinyUtils

This document defines the practical rules contributors and agents must follow to keep secrets out of the repository and prevent accidental exposure in logs or artifacts.

## Zero‑secrets in Git

- Do not commit any real secrets. This includes API keys, auth tokens, cookies, bearer tokens, OAuth refresh tokens, cloud credentials, or private keys.
- Environment files are ignored repo‑wide by default (see `.gitignore`). Use `*.example` templates for documentation.
- Configure secrets only in the deployment platforms (Vercel, Cloud Run, etc.).

## Where to store secrets

- Vercel (Preview/Production): set variables in Project → Settings → Environment Variables.
  - PREVIEW: `BYPASS_TOKEN`, `PREVIEW_BYPASS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_SECRET`, `PDF_RENDERER_URL`, `CONVERTER_SHARED_SECRET`, `BLOB_READ_WRITE_TOKEN`.
  - PRODUCTION: set the production values; keep dev/preview distinct.
- Local development: use a private, untracked `.env.local`/`.env.preview.local` only if necessary. Do not commit these files.

## Logging and artifacts

- Do not include raw tokens in logs or screenshots. If a token must be shown for debugging, redact all but the last 4 characters.
- Artifacts directory `tinyutils/artifacts/` is git‑ignored. It is safe to write temporary evidence here, but do not manually commit these files.
- When exporting HTTP headers for evidence, mask `Authorization` and any `x-*-bypass` headers.

## PR checklist (required)

Before opening a PR, run these checks from repo root:

```bash
# 1) Accidental secrets scan (regex heuristics)
rg -nEI "(SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|aws_access_key_id|secret_access_key)" \
  --hidden --glob '!**/node_modules/**' --glob '!**/.git/**' --glob '!tinyutils/artifacts/**' || true

# 2) Ensure no tracked env files
git ls-files | rg -n "(^|/)\\.env(\\..*)?$" && echo "Remove these from git" || echo "No env files tracked"

# 3) Diff review for headers/cookies
rg -n "x-vercel-protection-bypass|Authorization" tinyutils || true
```

If any sensitive value is found, rotate it immediately (see below) and do not merge the PR.

## Rotation playbook (if a secret leaks)

1. Rotate the secret in its upstream service (Vercel/Cloud Run/Blob/etc.).
2. Update the new value in the platform environment variables.
3. In this repo, remove the leaked value from files. If it entered git history, prefer force‑rotation rather than history re‑writes; do not rewrite history without maintainer approval.
4. Re‑deploy preview/production as applicable.

## Agent rules (must)

- Never print secrets in chat output. When needed for testing, read from environment and pass only redacted values to logs.
- Never create public links that embed tokens.
- Store evidence under `tinyutils/artifacts/<task>/<YYYYMMDD>/` and reference paths in AGENT_RUN_LOG.
- Follow AGENTS.md hardening and this SECURITY.md when running smokes (add bypass headers only in local runs and do not commit them).

## Contacts

- For urgent security issues, contact the maintainer directly. For non‑urgent, open a private issue or provide a redacted report via email.

