#!/usr/bin/env bash
set -euo pipefail

# TinyUtils token rotation helper (Preview/Prod)
# This script prints exact vercel CLI commands with placeholders.
# Authenticate first: `vercel login` and select the TinyUtils project.

PROJECT="tinyutils"               # change if your project slug differs
SCOPE="cavins-projects-7b0e00bb"  # optional org/team scope if needed

note() { printf "\n== %s ==\n" "$*"; }
cmd()  { printf "  $ %s\n" "$*"; }

note "Rotate preview protection tokens"
cmd "vercel env add BYPASS_TOKEN preview  --project $PROJECT"
cmd "vercel env add PREVIEW_BYPASS_TOKEN preview --project $PROJECT"
cmd "vercel env add VERCEL_AUTOMATION_BYPASS_SECRET preview --project $PROJECT"
cmd "vercel env add PREVIEW_SECRET preview --project $PROJECT"

note "Rotate converter secrets (Preview)"
cmd "vercel env add PDF_RENDERER_URL preview --project $PROJECT"
cmd "vercel env add CONVERTER_SHARED_SECRET preview --project $PROJECT"
cmd "vercel env add BLOB_READ_WRITE_TOKEN preview --project $PROJECT"

note "Rotate production tokens (repeat values as needed)"
cmd "vercel env add BYPASS_TOKEN production --project $PROJECT"
cmd "vercel env add PREVIEW_BYPASS_TOKEN production --project $PROJECT"
cmd "vercel env add VERCEL_AUTOMATION_BYPASS_SECRET production --project $PROJECT"

note "Deploy to apply changes"
cmd "vercel deploy --prod --project $PROJECT"
cmd "vercel deploy --prebuilt --project $PROJECT"  # or your CI flow

note "Verify preview fence and API headers"
cmd "curl -I https://<preview>.vercel.app/ -H 'x-vercel-protection-bypass: <NEW_BYPASS_TOKEN>'"
cmd "curl -sS https://<preview>.vercel.app/api/convert/health -H 'x-vercel-protection-bypass: <NEW_BYPASS_TOKEN>'"

echo "\nReview SECURITY.md for the PR checklist before merging."

