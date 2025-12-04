#!/usr/bin/env bash
# Stub deployment helper for WS2 LibreOffice Cloud Run service.
# Safe defaults; does not auto-deploy unless invoked manually.

set -euo pipefail

PROJECT="${PROJECT:-tinyutils-dev}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-tinyutils-libreoffice}"
REPO="${REPO:-tinyutils-artifacts}"
IMAGE="europe-west1-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:stub"

echo "Project: ${PROJECT}"
echo "Region:  ${REGION}"
echo "Service: ${SERVICE}"
echo "Repo:    ${REPO}"
echo "Image:   ${IMAGE}"
echo "NOTE: This is a preparatory script; review values before running."

cmd_exists() { command -v "$1" >/dev/null 2>&1; }

if ! cmd_exists gcloud; then
  echo "gcloud CLI not found; install and authenticate before deploying." >&2
  exit 1
fi

# Build and push container (no-op until invoked explicitly).
gcloud config set project "${PROJECT}"
gcloud builds submit --tag "${IMAGE}" gcloud/libreoffice

# Deploy to Cloud Run (keeps service private by default).
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --memory 1Gi \
  --cpu 1 \
  --timeout 120 \
  --concurrency 4 \
  --min-instances 0 \
  --max-instances 1 \
  --no-allow-unauthenticated

echo "Deployment command completed. Verify service manually before exposing."

