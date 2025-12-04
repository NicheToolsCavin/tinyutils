#!/usr/bin/env bash
# =============================================================================
# Deploy TinyUtils LibreOffice Service to Cloud Run
# =============================================================================
#
# This script builds and deploys the LibreOffice conversion service to Google
# Cloud Run. It uses Cloud Build for the container build (no local Docker needed).
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Billing enabled on the project
#   - Required APIs enabled (Cloud Run, Cloud Build, Artifact Registry)
#
# Usage:
#   ./deploy.sh                    # Deploy to default project
#   PROJECT=my-project ./deploy.sh # Deploy to specific project
#
# Cost Safety:
#   - min-instances: 0 (scales to zero when idle = $0)
#   - max-instances: 1 (hard cap)
#   - timeout: 120s (prevents runaway requests)
#   - no-allow-unauthenticated (private endpoint)
#
# =============================================================================

set -euo pipefail

# Configuration (override with environment variables)
PROJECT="${PROJECT:-tinyutils-dev}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-tinyutils-libreoffice}"
REPO="${REPO:-tinyutils-artifacts}"

# Derived values
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Pre-flight Checks
# =============================================================================

log_info "=========================================="
log_info "TinyUtils LibreOffice Service Deployment"
log_info "=========================================="
echo ""
log_info "Project:  ${PROJECT}"
log_info "Region:   ${REGION}"
log_info "Service:  ${SERVICE}"
log_info "Image:    ${IMAGE}"
echo ""

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Install from https://cloud.google.com/sdk"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1 | grep -q "@"; then
    log_error "Not authenticated. Run: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
log_info "Authenticated as: ${ACTIVE_ACCOUNT}"

# Set project
log_info "Setting project to ${PROJECT}..."
gcloud config set project "${PROJECT}" --quiet

# =============================================================================
# Enable Required APIs
# =============================================================================

log_info "Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    --quiet 2>/dev/null || true

# =============================================================================
# Create Artifact Registry Repository (if needed)
# =============================================================================

log_info "Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe "${REPO}" --location="${REGION}" &>/dev/null; then
    log_info "Creating Artifact Registry repository: ${REPO}"
    gcloud artifacts repositories create "${REPO}" \
        --repository-format=docker \
        --location="${REGION}" \
        --description="TinyUtils container images" \
        --quiet
    log_success "Repository created"
else
    log_info "Repository already exists"
fi

# =============================================================================
# Build Container with Cloud Build
# =============================================================================

log_info "Building container with Cloud Build..."
log_info "(This may take 3-5 minutes for the first build)"

cd "${SCRIPT_DIR}"

gcloud builds submit \
    --tag "${IMAGE}" \
    --timeout=600s \
    --quiet

log_success "Container built and pushed to ${IMAGE}"

# =============================================================================
# Deploy to Cloud Run
# =============================================================================

log_info "Deploying to Cloud Run..."

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
    --no-allow-unauthenticated \
    --set-env-vars="LIBREOFFICE_TIMEOUT_SECONDS=120,MAX_FILE_SIZE_MB=50" \
    --quiet

# =============================================================================
# Get Service URL
# =============================================================================

SERVICE_URL=$(gcloud run services describe "${SERVICE}" \
    --region "${REGION}" \
    --format 'value(status.url)' 2>/dev/null)

echo ""
log_success "=========================================="
log_success "Deployment Complete!"
log_success "=========================================="
echo ""
log_info "Service URL: ${SERVICE_URL}"
log_info ""
log_info "Cost Safety Features:"
log_info "  - min-instances: 0 (scales to zero when idle)"
log_info "  - max-instances: 1 (hard cap)"
log_info "  - timeout: 120s"
log_info "  - no-allow-unauthenticated (private)"
echo ""
log_info "To test the health endpoint (requires auth token):"
log_info "  TOKEN=\$(gcloud auth print-identity-token)"
log_info "  curl -H \"Authorization: Bearer \$TOKEN\" ${SERVICE_URL}/health"
echo ""
log_info "To make the service public (NOT recommended for production):"
log_info "  gcloud run services add-iam-policy-binding ${SERVICE} \\"
log_info "    --region=${REGION} \\"
log_info "    --member=\"allUsers\" \\"
log_info "    --role=\"roles/run.invoker\""
echo ""
