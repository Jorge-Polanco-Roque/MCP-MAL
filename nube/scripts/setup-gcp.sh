#!/bin/bash
set -euo pipefail

echo "MAL MCP Hub — Setup GCP (Cloud)"

# Check prerequisites
command -v gcloud >/dev/null 2>&1 || { echo "Error: gcloud CLI is required. Install from https://cloud.google.com/sdk"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "Error: terraform is required. Install from https://www.terraform.io"; exit 1; }

# Get project info
read -p "GCP Project ID: " PROJECT_ID
read -p "Region [us-central1]: " REGION
REGION=${REGION:-us-central1}

echo ""
echo "Configuring GCP project: $PROJECT_ID in $REGION"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$PROJECT_ID"

# Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i.bak "s/mal-dev-xxxxxx/$PROJECT_ID/g" .env
  rm -f .env.bak
  echo "Created .env with project ID: $PROJECT_ID"
fi

# Terraform init + plan
echo ""
echo "Running Terraform..."
cd terraform
terraform init
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION"

read -p "Apply Terraform? [y/N]: " APPLY
if [ "$APPLY" = "y" ] || [ "$APPLY" = "Y" ]; then
  terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -auto-approve
fi

cd ..

# Install and build
npm install
npm run build

echo ""
echo "Setup complete! Next steps:"
echo ""
echo "  1. Build and push Docker image:"
echo "     docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/mal-registry/mal-mcp-hub:latest ."
echo "     docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/mal-registry/mal-mcp-hub:latest"
echo ""
echo "  2. Deploy to Cloud Run:"
echo "     gcloud run deploy mal-mcp-hub --source . --region ${REGION}"
echo ""
echo "  3. Or push to main for automatic CI/CD deployment"
echo ""
