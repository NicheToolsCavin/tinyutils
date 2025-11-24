# Vercel Preview Environment Guide for TinyUtils

**FOR AI AGENTS WHO KEEP ASKING FOR SECRETS THAT ALREADY EXIST**

## The Golden Rule

**ALL SECRETS ARE ALREADY IN `.env.preview.local` AND `.env.vercel.local`**

**DO NOT ASK THE USER FOR:**
- PREVIEW_SECRET
- VERCEL_AUTOMATION_BYPASS_SECRET
- VERCEL_TOKEN
- BYPASS_TOKEN
- PREVIEW_BYPASS_TOKEN
- BLOB_READ_WRITE_TOKEN
- CONVERTER_SHARED_SECRET
- PDF_RENDERER_URL

**They're all in the .env files. Read them like a big boy.**

---

## Secret Locations (Read These Files, Don't Ask!)

### File 1: `.env.preview.local`
**Location:** `/Users/cav/dev/TinyUtils/tinyutils/.env.preview.local`

**Contains:**
```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_SZNaY2XiTq5TGjDn_Fs4aJjGnirP9vaTKJWXHWjpAsKDgnE"
BYPASS_TOKEN="a5426296112627424e9f33ecfbeb98323b3b6ea1ca9ca61d"
CONVERTER_SHARED_SECRET="lfrnNS6TnRdOOpwIFwYF80b5vt6INKJdMvtr7zNhf6w="
PDF_RENDERER_URL="https://tinyutils-pdf-2159415913.us-central1.run.app"
PREVIEW_BYPASS_TOKEN="Yno35jZnyMkLBDOG5B_v8_0fNY0noIEn"
PREVIEW_SECRET="e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715"
VERCEL_AUTOMATION_BYPASS_SECRET="EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR"
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9jYXZpbnMtcHJvamVjdHMtN2IwZTAwYmIiLCJzdWIiOiJvd25lcjpjYXZpbnMtcHJvamVjdHMtN2IwZTAwYmI6cHJvamVjdDp0aW55dXRpbHM6ZW52aXJvbm1lbnQ6ZGV2ZWxvcG1lbnQiLCJzY29wZSI6Im93bmVyOmNhdmlucy1wcm9qZWN0cy03YjBlMDBiYjpwcm9qZWN0OnRpbnl1dGlsczplbnZpcm9ubWVudDpkZXZlbG9wbWVudCIsImF1ZCI6Imh0dHBzOi8vdmVyY2VsLmNvbS9jYXZpbnMtcHJvamVjdHMtN2IwZTAwYmIiLCJvd25lciI6ImNhdmlucy1wcm9qZWN0cy03YjBlMDBiYiIsIm93bmVyX2lkIjoidGVhbV9tWk1qbUlOTlpEVkQzTGhkdUtRd3lKbm4iLCJwcm9qZWN0IjoidGlueXV0aWxzIiwicHJvamVjdF9pZCI6InByal9LaDE0a0VYbVphT0RKS3ZYSzZkWllIV2s3ajJuIiwiZW52aXJvbm1lbnQiOiJkZXZlbG9wbWVudCIsInBsYW4iOiJob2JieSIsInVzZXJfaWQiOiJHekR6NG9BU3MydXRaYnpwNTdoMFR3S28iLCJuYmYiOjE3NjI5OTU1NTMsImlhdCI6MTc2Mjk5NTU1MywiZXhwIjoxNzYzMDM4NzUzfQ.IBHq0Ek7n07XMNJNPbzBtUuFKLYIxn8jXEYPl_QY62BiU-tFFjKI6FlMr-A_D93IUNa6hiVv7XEQwRBP8avLpIL0H_9VL1XAsEDZsOOTaX_v-Dz73Pv-hjvnEs8N0LFOAOP4MHjGsIWNyVPq4QK3jPfl_eyyYzxMgyGrfAMNYvXLFRVH9937TN6w0Yp6kPT8joEH7Wc0ViwCzaYr1xLKLIksQnGJoHETzNr17cri_qCQ3Fxi_ctd_f5PGxDRFoQUELNDey1VrYEXefdMS5Rx1IpVWzpKXzZzpA9VG_JWminPwK229-L3raXUu-eDZ3eM8qYvI82646j74EXs2wprpg"
```

### File 2: `.env.vercel.local`
**Location:** `/Users/cav/dev/TinyUtils/tinyutils/.env.vercel.local`

**Contains:**
```bash
VERCEL_TOKEN="93j2CJAsiveAjokp10AFxG1h"
```

### File 3: `.env.gcloud`
**Location:** `/Users/cav/dev/TinyUtils/tinyutils/.env.gcloud`

**Contains:**
```bash
PDF_RENDERER_URL="https://tinyutils-pdf-rqlozax3va-uc.a.run.app"
```

---

## How to Run Preview Smoke Tests

### Step 1: Get the Preview URL

Every time you push a branch or open a PR, Vercel creates a preview deployment.

**Where to find it:**
```bash
# Option 1: GitHub PR (bot comment)
# Look for: "Preview: https://tinyutils-git-your-branch-name.vercel.app"

# Option 2: Vercel CLI
vercel ls

# Option 3: Check recent deployments
gh pr view --json url,statusCheckRollup
```

**Preview URL Format:**
```
https://tinyutils-git-BRANCH-NAME-cavins-projects-7b0e00bb.vercel.app
```

### Step 2: Load Environment Variables

```bash
# Load ALL the secrets (no need to ask user!)
source .env.preview.local
source .env.vercel.local

# Verify secrets loaded
echo $PREVIEW_SECRET
echo $VERCEL_AUTOMATION_BYPASS_SECRET
echo $VERCEL_TOKEN
```

### Step 3: Run Smoke Tests

**Basic preview smoke:**
```bash
export PREVIEW_URL="https://tinyutils-git-your-branch.vercel.app"
export PREVIEW_SECRET="e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715"

node scripts/preview_smoke.mjs
```

**Converter API smoke:**
```bash
export PREVIEW_URL="https://tinyutils-git-your-branch.vercel.app"
export CONVERTER_API_BASE_URL="${PREVIEW_URL}"
export VERCEL_AUTOMATION_BYPASS_SECRET="EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR"

node scripts/smoke_convert_preview.mjs
```

### One-shot helper: deploy preview + run both smokes

If you want to **deploy a new preview** for the current branch and run
both preview smokes in one go, you can use this helper script from the
repo root:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /Users/cav/dev/TinyUtils/tinyutils

# 1) Create an artifacts folder for this run
TODAY=$(date +%Y%m%d)
TASK_DIR="artifacts/preview-smokes/${TODAY}"
mkdir -p "$TASK_DIR"

# 2) Deploy the current branch as a prebuilt preview
DEPLOY_OUTPUT=$(vercel deploy --prebuilt --yes 2>&1 | tee "$TASK_DIR/vercel-deploy.log")

# Extract the Preview URL from the CLI output
PREVIEW_URL=$(printf '%s\n' "$DEPLOY_OUTPUT" | awk '/^Preview:/ {print $2}' | tail -n1)
if [ -z "$PREVIEW_URL" ]; then
  echo "[preview] Failed to derive PREVIEW_URL from vercel deploy output" >&2
  exit 1
fi
printf '%s\n' "$PREVIEW_URL" > "$TASK_DIR/preview-url.txt"

echo "[preview] Using PREVIEW_URL=$PREVIEW_URL"

# 3) Load bypass/env secrets (AGENTS.md: already in .env.preview.local)
set -a
[ -f .env.preview.local ] && . .env.preview.local
set +a

# 4) Run general preview smoke
PREVIEW_STATUS=0
CONVERT_STATUS=0

PREVIEW_URL="$PREVIEW_URL" \
  node scripts/preview_smoke.mjs 2>&1 | tee "$TASK_DIR/preview_smoke.log" \
  || PREVIEW_STATUS=$?

# 5) Run converter-specific preview smoke
PREVIEW_URL="$PREVIEW_URL" \
  node scripts/smoke_convert_preview.mjs 2>&1 | tee "$TASK_DIR/smoke_convert_preview.log" \
  || CONVERT_STATUS=$?

# 6) Persist status for later inspection
{
  echo "PREVIEW_URL=$PREVIEW_URL"
  echo "PREVIEW_STATUS=$PREVIEW_STATUS"
  echo "CONVERT_STATUS=$CONVERT_STATUS"
} > "$TASK_DIR/status.env"

# 7) Exit non-zero if any smoke failed (so CI/agent runs notice)
if [ "$PREVIEW_STATUS" -ne 0 ] || [ "$CONVERT_STATUS" -ne 0 ]; then
  echo "[preview] One or more smokes FAILED (see logs in $TASK_DIR)" >&2
  exit 1
fi

echo "[preview] All smokes passed for $PREVIEW_URL"
```

**Dead Link Finder UI smoke:**
```bash
export PREVIEW_URL="https://tinyutils-git-your-branch.vercel.app"
export PREVIEW_SECRET="e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715"

pnpm ui:smoke:dlf
```

---

## What Each Secret Does (For Your Tiny Brain)

### PREVIEW_SECRET
**Value:** `e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715`
**Purpose:** Authenticates requests to beta tools behind `/api/fence`
**Used in:**
- Preview smoke tests
- Accessing `/tools/keyword-density`, `/tools/meta-preview`, etc.
- Cookie: `preview-secret=VALUE`

### VERCEL_AUTOMATION_BYPASS_SECRET
**Value:** `EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR`
**Purpose:** Bypasses Vercel's deployment protection for automated tests
**Used in:**
- ALL smoke tests against preview deployments
- Header: `x-vercel-protection-bypass: VALUE`

### VERCEL_TOKEN
**Value:** `93j2CJAsiveAjokp10AFxG1h`
**Purpose:** Authenticates Vercel CLI commands
**Used in:**
- `vercel ls`, `vercel deploy`, etc.
- Getting deployment URLs programmatically

### BLOB_READ_WRITE_TOKEN
**Value:** `vercel_blob_rw_SZNaY2XiTq5TGjDn_Fs4aJjGnirP9vaTKJWXHWjpAsKDgnE`
**Purpose:** Read/write access to Vercel Blob storage
**Used in:**
- Document converter (uploading/downloading files)

### CONVERTER_SHARED_SECRET
**Value:** `lfrnNS6TnRdOOpwIFwYF80b5vt6INKJdMvtr7zNhf6w=`
**Purpose:** Authenticates requests between Vercel and Cloud Run PDF renderer
**Used in:**
- Converter API calling Cloud Run services

### PDF_RENDERER_URL
**Value:** `https://tinyutils-pdf-2159415913.us-central1.run.app`
**Purpose:** URL of the Cloud Run service that renders PDFs
**Used in:**
- Converter API when processing PDF documents

---

## Common Tasks (Step-by-Step for Idiots)

### Task: Test a preview deployment after pushing a PR

**DON'T ASK THE USER FOR ANYTHING. JUST DO THIS:**

```bash
# 1. Source the env files (gets ALL secrets)
cd /Users/cav/dev/TinyUtils/tinyutils
source .env.preview.local
source .env.vercel.local

# 2. Get the preview URL from the PR
# Look at the GitHub PR page or run:
gh pr view --json url --jq '.url'

# 3. Set the preview URL
export PREVIEW_URL="https://tinyutils-git-BRANCH-NAME-cavins-projects-7b0e00bb.vercel.app"

# 4. Run smoke tests
node scripts/preview_smoke.mjs

# 5. If converter changes, also run:
export CONVERTER_API_BASE_URL="${PREVIEW_URL}"
node scripts/smoke_convert_preview.mjs

# 6. Done! Report results.
```

### Task: Access a protected preview tool

**Protected tools:** `/tools/keyword-density`, `/tools/meta-preview`, `/tools/sitemap-generator`

**How to access:**

```bash
# Option 1: Via curl with preview secret
curl "https://PREVIEW_URL/tools/keyword-density" \
  -H "Cookie: preview-secret=e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715" \
  -H "x-vercel-protection-bypass: EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR"

# Option 2: In browser
# 1. Open browser DevTools → Application → Cookies
# 2. Add cookie: preview-secret=e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715
# 3. Navigate to the protected tool
```

### Task: Get list of recent preview deployments

```bash
# Load token
source .env.vercel.local

# List deployments
vercel ls

# Or with gh CLI
gh pr list --json url,headRefName
```

---

## Vercel Dashboard Links

**Project Dashboard:**
```
https://vercel.com/cavins-projects-7b0e00bb/tinyutils
```

**Deployments:**
```
https://vercel.com/cavins-projects-7b0e00bb/tinyutils/deployments
```

**Environment Variables:**
```
https://vercel.com/cavins-projects-7b0e00bb/tinyutils/settings/environment-variables
```

**Vercel Blob Storage:**
```
https://vercel.com/cavins-projects-7b0e00bb/stores
```

---

## How Preview Protection Works

Vercel preview deployments have TWO layers of protection:

### Layer 1: Vercel Deployment Protection
**Bypass with:** `x-vercel-protection-bypass: EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR`
**Applies to:** ALL preview deployment pages/APIs

### Layer 2: Custom Preview Secret (Beta Tools Only)
**Bypass with:** Cookie `preview-secret=e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715`
**Applies to:** `/tools/keyword-density`, `/tools/meta-preview`, `/tools/sitemap-generator`

**To access beta tools on preview, you need BOTH:**
```bash
curl "https://PREVIEW_URL/tools/keyword-density" \
  -H "Cookie: preview-secret=e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715" \
  -H "x-vercel-protection-bypass: EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR"
```

---

## Troubleshooting

### "401 Unauthorized" on preview

**Problem:** Missing or wrong bypass secret

**Solution:**
```bash
# Check you have the right secret
grep VERCEL_AUTOMATION_BYPASS_SECRET .env.preview.local
# Should show: EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR

# Make sure you're sending the header
curl -I "https://PREVIEW_URL" \
  -H "x-vercel-protection-bypass: EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR"
```

### "404 Not Found" on beta tool

**Problem:** Tool path is wrong or tool doesn't exist yet

**Solution:**
```bash
# List all routes
curl "https://PREVIEW_URL" \
  -H "x-vercel-protection-bypass: EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR"

# Beta tools should be at:
# /tools/keyword-density
# /tools/meta-preview
# /tools/sitemap-generator
```

### "500 Internal Server Error" on converter API

**Problem:** Cloud Run service is down or secrets are wrong

**Solution:**
```bash
# Check Cloud Run service is running
gcloud run services list --project=gen-lang-client-0391296421

# Verify PDF_RENDERER_URL is correct
grep PDF_RENDERER_URL .env.preview.local
# Should show: https://tinyutils-pdf-2159415913.us-central1.run.app

# Check Cloud Run logs
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=tinyutils-pdf" \
  --project=gen-lang-client-0391296421
```

### Smoke tests fail with "missing environment variable"

**Problem:** You forgot to source the .env files

**Solution:**
```bash
# You absolute dunce, source the files!
source .env.preview.local
source .env.vercel.local

# Verify secrets are loaded
echo "PREVIEW_SECRET: ${PREVIEW_SECRET}"
echo "BYPASS_SECRET: ${VERCEL_AUTOMATION_BYPASS_SECRET}"

# Now run tests
node scripts/preview_smoke.mjs
```

---

## For AI Agents: Pre-Flight Checklist

Before running ANY preview smoke test, verify:

- [ ] Have I sourced `.env.preview.local`?
- [ ] Have I sourced `.env.vercel.local`?
- [ ] Have I set `PREVIEW_URL` to the actual preview deployment URL?
- [ ] Did I check that `VERCEL_AUTOMATION_BYPASS_SECRET` is set?
- [ ] Did I check that `PREVIEW_SECRET` is set?

**If any answer is NO, go back and READ THIS FILE.**

---

## Summary for the Hopelessly Dense

**Secrets file:** `.env.preview.local`
**Token file:** `.env.vercel.local`

**Preview bypass secret:** `EdOM9aDhTRFTL10cznBkkaMXR0ECqkPR`
**Beta tools secret:** `e6bcb14e19a2877a30b0bab299ba236c40708d0b1a3234518ba8ccc56807d715`

**To run smoke tests:**
```bash
source .env.preview.local
source .env.vercel.local
export PREVIEW_URL="https://YOUR-PREVIEW-URL.vercel.app"
node scripts/preview_smoke.mjs
```

**DON'T:**
- Ask user for secrets (they're in the files)
- Create new secrets
- Forget to source .env files
- Skip the bypass headers

**DO:**
- Read the .env files
- Use existing secrets
- Include both bypass headers for beta tools
- Check logs if something fails

---

**If you're still asking for secrets after reading this, you're beyond help.** 🤖
