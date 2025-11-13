# Token Rotation Playbook

This guide enumerates the exact steps to rotate TinyUtils preview/production tokens without committing secrets.

## Prerequisites
- Vercel CLI installed and authenticated: `vercel login`
- Access to the `tinyutils` project (adjust the project name if different)

## Steps
1) Add new values in Vercel (Preview/Prod as needed). Use fresh random values.

```bash
# Preview protection
vercel env add BYPASS_TOKEN preview --project tinyutils
vercel env add PREVIEW_BYPASS_TOKEN preview --project tinyutils
vercel env add VERCEL_AUTOMATION_BYPASS_SECRET preview --project tinyutils
vercel env add PREVIEW_SECRET preview --project tinyutils

# Converter
vercel env add PDF_RENDERER_URL preview --project tinyutils
vercel env add CONVERTER_SHARED_SECRET preview --project tinyutils
vercel env add BLOB_READ_WRITE_TOKEN preview --project tinyutils

# Production (as applicable)
vercel env add BYPASS_TOKEN production --project tinyutils
vercel env add PREVIEW_BYPASS_TOKEN production --project tinyutils
vercel env add VERCEL_AUTOMATION_BYPASS_SECRET production --project tinyutils
```

2) Redeploy the project to apply new values.

```bash
vercel deploy --project tinyutils
# or via your CI flow
```

3) Verify preview fence and API health.

```bash
curl -I https://<preview>.vercel.app/ -H "x-vercel-protection-bypass: <NEW_BYPASS_TOKEN>"
curl -sS https://<preview>.vercel.app/api/convert/health -H "x-vercel-protection-bypass: <NEW_BYPASS_TOKEN>"
```

4) Invalidate any leaked tokens in upstream services and remove references in long-form docs. Prefer rotation over history rewriting.

## Notes
- Do not place actual secret values into git. Use the CLI prompts.
- See `tinyutils/SECURITY.md` for the PR checklist and agent rules.

