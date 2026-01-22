#!/bin/bash

# GCP Deployment Script for AutoMBA.ai
# This script helps deploy the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AutoMBA.ai GCP Deployment Script${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud. Running: gcloud auth login${NC}"
    gcloud auth login
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No project set. Please enter your GCP Project ID:${NC}"
    read -r PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi

echo -e "${GREEN}✓ Using project: ${PROJECT_ID}${NC}\n"

# Set variables
SERVICE_NAME="automba-chatbot"
REGION="${REGION:-us-central1}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Enable required APIs
echo -e "${GREEN}📦 Enabling required GCP APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the Docker image
echo -e "\n${GREEN}🔨 Building Docker image...${NC}"
gcloud builds submit --tag "${IMAGE_NAME}:latest" --tag "${IMAGE_NAME}:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"

# Deploy to Cloud Run
echo -e "\n${GREEN}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}:latest" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "PORT=8080" \
    --timeout 300

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)')

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}\n"

echo -e "${YELLOW}⚠️  Don't forget to set environment variables in Cloud Run:${NC}"
echo -e "   - GOOGLE_CLIENT_ID"
echo -e "   - GOOGLE_CLIENT_SECRET"
echo -e "   - GOOGLE_REDIRECT_URI (should be: ${SERVICE_URL}/oauth2callback)"
echo -e "   - VITE_OPENAI_API_KEY (if using OpenAI)\n"

echo -e "${YELLOW}To set environment variables, run:${NC}"
echo -e "gcloud run services update ${SERVICE_NAME} --region ${REGION} \\"
echo -e "  --set-env-vars GOOGLE_CLIENT_ID=your-client-id,GOOGLE_CLIENT_SECRET=your-secret,GOOGLE_REDIRECT_URI=${SERVICE_URL}/oauth2callback\n"
