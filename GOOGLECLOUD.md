# Google Cloud Configuration for TinyUtils

**THIS IS THE DEFINITIVE GUIDE. READ IT. DON'T CREATE NEW RESOURCES.**

## The One True Project

**Project Name:** `TinyUtils`
**Project ID:** `gen-lang-client-0391296421`
**Project Number:** `2159415913`
**Account:** `cavingraves@gmail.com`
**Region:** `us-central1`

### ⚠️ CRITICAL: DO NOT CREATE NEW PROJECTS

There are OTHER Google Cloud projects with "tinyutils" in the name. **IGNORE THEM.**

Only use: `gen-lang-client-0391296421`

If you create a new project or new Cloud Run service, you have failed.

---

## Existing Cloud Run Services

### 1. tinyutils-pdf (Primary PDF Renderer)

**Service Name:** `tinyutils-pdf`
**URL:** `https://tinyutils-pdf-2159415913.us-central1.run.app`
**Region:** `us-central1`
**Project:** `gen-lang-client-0391296421`
**Purpose:** PDF rendering for document converter
**Last Deployed:** 2025-11-23

**Environment Variables:**
```bash
CONVERTER_SHARED_SECRET=7w0UEYs4+oF9StN8Tw/uFEmlvKpeChUX9B8eLmMmLak=
PDF_MAX_PAGES=50
PDF_MAX_BYTES=5242880
REQUEST_TIMEOUT=25
RATE_LIMIT_PER_MIN=60
```

### 2. pdf-renderer (Legacy)

**Service Name:** `pdf-renderer`
**URL:** `https://pdf-renderer-2159415913.us-central1.run.app`
**Region:** `us-central1`
**Project:** `gen-lang-client-0391296421`
**Purpose:** Older PDF renderer (may be deprecated)
**Last Deployed:** 2025-11-13

---

## Where to Find Secrets

### Local Environment Files

**DO NOT ASK THE USER FOR SECRETS. THEY ARE IN THESE FILES:**

1. **`.env.gcloud`** - Google Cloud configuration
   ```bash
   # Location: /Users/cav/dev/TinyUtils/tinyutils/.env.gcloud
   # Contains: PDF_RENDERER_URL and other GCP settings
   ```

2. **`.env.preview.local`** - Preview environment secrets
   ```bash
   # Location: /Users/cav/dev/TinyUtils/tinyutils/.env.preview.local
   # Contains: PDF_RENDERER_URL, PREVIEW_SECRET, tokens
   ```

3. **`.env.vercel.local`** - Vercel local secrets
   ```bash
   # Location: /Users/cav/dev/TinyUtils/tinyutils/.env.vercel.local
   # Contains: Vercel tokens and secrets
   ```

### The Shared Secret

**CONVERTER_SHARED_SECRET:** `7w0UEYs4+oF9StN8Tw/uFEmlvKpeChUX9B8eLmMmLak=`

This is used by:
- Cloud Run services (tinyutils-pdf, pdf-renderer)
- Vercel environment variables
- Local development (in .env files)

**Where it's defined:**
- ✅ Already in Cloud Run service env vars
- ✅ Already in `.env.gcloud`
- ✅ Already in `.env.preview.local`
- ✅ Already in Vercel dashboard (see PREVIEW.md)

**DO NOT generate a new secret. DO NOT ask the user for it. It's already everywhere.**

---

## How to Deploy/Update Cloud Run Services

### Prerequisites

```bash
# 1. Authenticate (if not already)
gcloud auth login

# 2. Set the correct project
gcloud config set project gen-lang-client-0391296421

# 3. Verify you're in the right project
gcloud config get-value project
# Should output: gen-lang-client-0391296421
```

### Deploy Updated Service

```bash
# Navigate to the repo
cd /Users/cav/dev/TinyUtils/tinyutils

# Build and deploy tinyutils-pdf
gcloud run deploy tinyutils-pdf \
  --source=. \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars "CONVERTER_SHARED_SECRET=7w0UEYs4+oF9StN8Tw/uFEmlvKpeChUX9B8eLmMmLak=" \
  --set-env-vars "PDF_MAX_PAGES=50" \
  --set-env-vars "PDF_MAX_BYTES=5242880" \
  --set-env-vars "REQUEST_TIMEOUT=25" \
  --set-env-vars "RATE_LIMIT_PER_MIN=60"
```

**After deployment:**
```bash
# Get the service URL (should be same as before)
gcloud run services describe tinyutils-pdf \
  --region=us-central1 \
  --format="value(status.url)"
```

**Expected URL:** `https://tinyutils-pdf-2159415913.us-central1.run.app`

**If the URL changed (it shouldn't), update these files:**
- `.env.gcloud`
- `.env.preview.local`
- Vercel environment variables (see PREVIEW.md)

---

## How to View Logs

```bash
# Recent logs for tinyutils-pdf
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=tinyutils-pdf" \
  --project=gen-lang-client-0391296421 \
  --limit=50 \
  --format="table(timestamp,textPayload)"

# Follow logs in real-time
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=tinyutils-pdf" \
  --project=gen-lang-client-0391296421
```

---

## How to Check Service Status

```bash
# List all Cloud Run services
gcloud run services list --project=gen-lang-client-0391296421

# Describe tinyutils-pdf service
gcloud run services describe tinyutils-pdf \
  --region=us-central1 \
  --project=gen-lang-client-0391296421

# Check recent requests
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=tinyutils-pdf AND textPayload:POST" \
  --project=gen-lang-client-0391296421 \
  --limit=10
```

---

## Cloud Console Links

**Cloud Run Dashboard:**
```
https://console.cloud.google.com/run?project=gen-lang-client-0391296421
```

**Logs Explorer:**
```
https://console.cloud.google.com/logs?project=gen-lang-client-0391296421
```

**Billing:**
```
https://console.cloud.google.com/billing?project=gen-lang-client-0391296421
```

**IAM & Admin:**
```
https://console.cloud.google.com/iam-admin?project=gen-lang-client-0391296421
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Creating a new project
```bash
# DON'T DO THIS
gcloud projects create new-tinyutils-project
```

### ❌ WRONG: Creating a new Cloud Run service
```bash
# DON'T DO THIS (service already exists)
gcloud run deploy new-pdf-service ...
```

### ❌ WRONG: Asking user for secrets
```
"What's the CONVERTER_SHARED_SECRET?"  # NO! It's in .env.gcloud
"I need the PDF_RENDERER_URL"          # NO! It's in .env.preview.local
```

### ✅ RIGHT: Using existing resources
```bash
# Update the existing service
gcloud run deploy tinyutils-pdf ...  # Good

# Read secrets from .env files
source .env.gcloud  # Good
```

---

## Troubleshooting

### "Permission denied" errors
```bash
# Make sure you're authenticated as the right user
gcloud auth list
# Should show: cavingraves@gmail.com as ACTIVE

# If wrong user, login again
gcloud auth login
```

### "Project not found" errors
```bash
# Make sure project is set correctly
gcloud config get-value project
# Should output: gen-lang-client-0391296421

# If wrong, set it
gcloud config set project gen-lang-client-0391296421
```

### Service returns 500 errors
```bash
# Check logs for errors
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=tinyutils-pdf AND severity>=ERROR" \
  --project=gen-lang-client-0391296421 \
  --limit=20
```

---

## For AI Agents: Simple Checklist

Before asking the user ANYTHING:

- [ ] Did I check `.env.gcloud` for secrets?
- [ ] Did I check `.env.preview.local` for secrets?
- [ ] Am I using project ID `gen-lang-client-0391296421`?
- [ ] Am I updating the EXISTING `tinyutils-pdf` service (not creating new one)?
- [ ] Did I verify the service URL is `https://tinyutils-pdf-2159415913.us-central1.run.app`?

If you answered YES to all of these, you're good. If NO to any, READ THIS FILE AGAIN.

---

## Summary for the Extremely Dense

**One project:** `gen-lang-client-0391296421`
**One service:** `tinyutils-pdf`
**One URL:** `https://tinyutils-pdf-2159415913.us-central1.run.app`
**One secret:** `7w0UEYs4+oF9StN8Tw/uFEmlvKpeChUX9B8eLmMmLak=`
**Secrets location:** `.env.gcloud`, `.env.preview.local`

**DO NOT:**
- Create new projects
- Create new services
- Ask for secrets
- Change the URL

**DO:**
- Use existing resources
- Read .env files
- Update existing service when needed
- Check logs if something breaks

---

**If you're still confused, you shouldn't be working on this project.** 🤖
