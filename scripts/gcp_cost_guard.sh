#!/usr/bin/env bash
set -euo pipefail

# TinyUtils GCP Cost Guard (read-only audit)
# Usage: PROJECT=<id> BILLING=<acct> REGION=<region> ./scripts/gcp_cost_guard.sh

PROJECT="${PROJECT:-}"
BILLING="${BILLING:-}"
REGION="${REGION:-us-central1}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install Google Cloud SDK first." >&2
  exit 2
fi

if [[ -z "$PROJECT" ]]; then
  echo "ERROR: Set PROJECT=<gcp-project-id>" >&2
  exit 2
fi

echo "== GCP Cost Guard (project: $PROJECT, region: $REGION) =="

echo "-- Billing budgets --"
gcloud beta billing budgets list --billing-account="$BILLING" || true

echo "-- Cloud Run services --"
gcloud run services list --project="$PROJECT" --region="$REGION" || true

echo "-- Cloud Scheduler jobs --"
gcloud scheduler jobs list --project="$PROJECT" --location="$REGION" || true

echo "-- Cloud Tasks queues --"
gcloud tasks queues list --project="$PROJECT" --location="$REGION" || true

echo "-- IAM policy (top bindings summary) --"
gcloud projects get-iam-policy "$PROJECT" --format='table(bindings.role, bindings.members)' | head -n 50 || true

cat <<NOTE

Next steps (manual):
- For any Cloud Run service, set min-instances=0, small max-instances, timeout<=60s, CPU during request.
- Remove unused Scheduler jobs, Tasks queues, Pub/Sub topics.
- Add/verify billing budgets with thresholds.
- Move plaintext secrets into Secret Manager and rotate.

NOTE

