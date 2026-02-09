# GCP Cloud Run Deployment

## Overview
Complete guide for deploying containerized applications to Google Cloud Run. Covers Dockerfile best practices, CI/CD with Cloud Build, IAM setup, networking, and operational patterns.

## Prerequisites
- GCP project with billing enabled
- `gcloud` CLI authenticated
- APIs enabled: Cloud Run, Cloud Build, Artifact Registry

## Step 1: Dockerfile (Multi-stage)
```dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim
RUN addgroup --system app && adduser --system --ingroup app app
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

## Step 2: Cloud Build (cloudbuild.yaml)
```yaml
steps:
  - name: node:20
    entrypoint: npm
    args: ['ci']
  - name: node:20
    entrypoint: npm
    args: ['run', 'build']
  - name: node:20
    entrypoint: npm
    args: ['test']
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_SERVICE}:${SHORT_SHA}', '.']
  - name: gcr.io/cloud-builders/docker
    args: ['push', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_SERVICE}:${SHORT_SHA}']
  - name: gcr.io/cloud-builders/gcloud
    args: ['run', 'deploy', '${_SERVICE}', '--image', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_SERVICE}:${SHORT_SHA}', '--region', '${_REGION}']
```

## Step 3: IAM Setup
```bash
# Create service account
gcloud iam service-accounts create my-service-sa

# Grant roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-service-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

## Step 4: Environment Variables & Secrets
```bash
# Set env vars
gcloud run services update my-service \
  --set-env-vars="NODE_ENV=production,LOG_LEVEL=info"

# Use Secret Manager
gcloud run services update my-service \
  --set-secrets="API_KEY=api-key-secret:latest"
```

## Traffic Management
```bash
# Canary deploy (10% traffic to new revision)
gcloud run services update-traffic my-service \
  --to-revisions=LATEST=10

# Rollback to previous
gcloud run services update-traffic my-service \
  --to-revisions=my-service-00001-abc=100
```

## Best Practices
- Set min-instances=1 for low-latency production services
- Use VPC connector for private network access
- Enable Cloud Armor for WAF/rate limiting
- Monitor with uptime checks + alert policies
