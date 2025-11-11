## Vercel Preview and Production Deployment Setup

This change introduces robust CI/CD workflows for Vercel Preview and Production deployments of TinyUtils, focusing on the `/api/convert` endpoint.

### Key Changes:

1.  **`.github/workflows/preview_smoke.yml` (Modified):**
    *   **Conditional Deployment:** The Vercel preview deployment step now conditionally runs based on the presence of Vercel API secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). If secrets are not available, the deployment is skipped, but the smoke test can still run if a `PREVIEW_URL` is provided via `workflow_dispatch` input.
    *   **Workflow Dispatch Inputs:** Added optional `workflow_dispatch` inputs for Vercel secrets and `PREVIEW_SECRET` to allow manual triggering of deployments and tests with specific credentials.
    *   **Environment Variable Prioritization:** Updated environment variable assignments to prioritize `workflow_dispatch` inputs over repository secrets for manual runs.
    *   **Artifact Upload:** Ensures deployment logs and smoke test results are uploaded as artifacts.

2.  **`.github/workflows/prod_deploy_smoke.yml` (New):**
    *   **Manual Production Deployment:** A new `workflow_dispatch` workflow for manually deploying to Vercel production.
    *   **Stale Output Removal:** Includes a critical step to `rm -rf .vercel/output` before deployment to prevent 404 errors for API routes.
    *   **Production Smoke Test:** Runs the `smoke_convert_preview.mjs` script against the production URL, performing health checks and conversion tests.
    *   **Dynamic Artifact Paths:** Uses `date` commands to generate dynamic, timestamped artifact directories for production deployment logs and smoke test results.

3.  **`scripts/smoke_convert_preview.mjs` (Modified):**
    *   **Generic Target URL:** Renamed `PREVIEW_URL` to `TARGET_URL` (and updated usage) to make the script reusable for both preview and production environments.
    *   **Vercel Protection Bypass:** Implemented logic to perform an initial request to the target URL to capture the `_vercel_jwt` cookie from the `set-cookie` header. This cookie, along with the `x-vercel-protection-bypass` header, is then used for subsequent authenticated requests to protected Vercel deployments.
    *   **Artifact Saving:** Ensures `cookies.txt` and `set_cookie.headers` are saved as artifacts for debugging.

### How to Run:

#### For Preview Deployment & Smoke Test:

1.  Go to the "Actions" tab in your GitHub repository.
2.  Select the "Convert Preview Smoke" workflow.
3.  Click "Run workflow".
4.  You can optionally provide a `PREVIEW_URL` to test an existing deployment or provide Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PREVIEW_SECRET`) to trigger a new deployment and then run the smoke test.

#### For Production Deployment & Smoke Test:

1.  Go to the "Actions" tab in your GitHub repository.
2.  Select the "Convert Production Deploy & Smoke" workflow.
3.  Click "Run workflow".
4.  **You MUST provide** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_AUTOMATION_BYPASS_SECRET` as inputs. You can optionally provide a `PROD_URL` to test an existing production deployment without triggering a new one.

### Artifacts:

*   **Preview:** `tinyutils/artifacts/convert/github-<run_id>/`
*   **Production:** `tinyutils/artifacts/prod/<YYYYMMDD>/deploy-<HHMMSS>/`

Each artifact directory will contain `vercel_deploy.log`, `set_cookie.headers`, `cookies.txt`, and `resp_*.json` files for debugging and verification.