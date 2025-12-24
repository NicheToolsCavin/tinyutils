#!/bin/bash
# Deploy TinyUtils Converter to Google Cloud Run
#
# Prerequisites:
# 1. gcloud CLI installed and authenticated
# 2. BLOB_READ_WRITE_TOKEN from Vercel dashboard
#
# Usage:
#   ./deploy.sh
#
# Environment variables (set in Cloud Run or .env):
#   BLOB_READ_WRITE_TOKEN - Vercel Blob storage token (required)
#   CONVERT_API_KEY - Optional API key for CLI access

set -euo pipefail

# Configuration
PROJECT_ID="${GCP_PROJECT:-$(gcloud config get-value project)}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE_NAME="tinyutils-converter"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "=== TinyUtils Converter Cloud Run Deployment ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Copy required files from parent directories
echo "Copying application files..."
rm -rf ./convert_backend ./api
cp -r ../../convert_backend ./convert_backend
mkdir -p ./api
cp -r ../../api/_lib ./api/_lib
cp -r ../../api/convert ./api/convert

# Build and push the container
echo ""
echo "Building container image..."
gcloud builds submit --tag "${IMAGE_NAME}" .

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."

# Check if BLOB_READ_WRITE_TOKEN is set
if [ -z "${BLOB_READ_WRITE_TOKEN:-}" ]; then
    echo "WARNING: BLOB_READ_WRITE_TOKEN not set. Outputs will use data: URLs."
    echo "Set it with: gcloud run services update ${SERVICE_NAME} --set-env-vars BLOB_READ_WRITE_TOKEN=xxx"
fi

gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --region "${REGION}" \
    --platform managed \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --concurrency 10 \
    --allow-unauthenticated \
    --set-env-vars "TINYUTILS_LOG_LEVEL=INFO" \
    ${BLOB_READ_WRITE_TOKEN:+--set-env-vars "BLOB_READ_WRITE_TOKEN=${BLOB_READ_WRITE_TOKEN}"} \
    ${CONVERT_API_KEY:+--set-env-vars "CONVERT_API_KEY=${CONVERT_API_KEY}"}

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)')

echo ""
echo "=== Deployment Complete ==="
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "Test with:"
echo "  curl ${SERVICE_URL}/api/convert/health"
echo ""
echo "To use this as fallback, update the frontend to use:"
echo "  CONVERTER_URL=${SERVICE_URL}"

# Cleanup copied files
echo ""
echo "Cleaning up temporary files..."
rm -rf ./convert_backend ./api
