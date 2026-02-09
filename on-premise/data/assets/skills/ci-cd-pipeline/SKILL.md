# CI/CD Pipeline Guide

## Overview
Design and implement CI/CD pipelines using Google Cloud Build. Covers the full pipeline lifecycle: build, test, security scan, deploy, smoke test, and automatic rollback.

## Pipeline Stages

### 1. Build
```yaml
- name: node:20
  entrypoint: npm
  args: ['ci', '--cache', '/workspace/.npm']
  volumes:
    - name: npm-cache
      path: /workspace/.npm
```

### 2. Test
```yaml
- name: node:20
  entrypoint: npm
  args: ['test']
  env: ['CI=true']
```

### 3. Security Scan
```yaml
- name: gcr.io/cloud-builders/gcloud
  entrypoint: bash
  args:
    - -c
    - |
      gcloud artifacts docker images scan \
        $_REGION-docker.pkg.dev/$PROJECT_ID/$_REPO/$_IMAGE:$SHORT_SHA \
        --format=json > /workspace/scan.json
      VULNS=$(cat /workspace/scan.json | jq '.vulnerabilities | length')
      if [ "$VULNS" -gt "0" ]; then echo "VULNERABILITIES FOUND"; exit 1; fi
```

### 4. Deploy
```yaml
- name: gcr.io/cloud-builders/gcloud
  args:
    - run
    - deploy
    - $_SERVICE
    - --image=$_REGION-docker.pkg.dev/$PROJECT_ID/$_REPO/$_IMAGE:$SHORT_SHA
    - --region=$_REGION
    - --no-traffic
```

### 5. Smoke Test
```yaml
- name: gcr.io/cloud-builders/curl
  entrypoint: bash
  args:
    - -c
    - |
      URL=$(gcloud run services describe $_SERVICE --region=$_REGION --format="value(status.url)")
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)
      if [ "$STATUS" != "200" ]; then exit 1; fi
```

### 6. Promote or Rollback
```yaml
# On success: route traffic
- name: gcr.io/cloud-builders/gcloud
  args: [run, services, update-traffic, $_SERVICE, --to-latest, --region=$_REGION]

# On failure: set traffic to 0 for latest
- name: gcr.io/cloud-builders/gcloud
  args: [run, services, update-traffic, $_SERVICE, --to-revisions=LATEST=0, --region=$_REGION]
```

## Best Practices
- Cache npm/pip dependencies between builds
- Run linting and type-checking as early pipeline steps
- Use substitution variables for environment-specific values
- Tag images with commit SHA (not `latest`)
- Always include a smoke test before routing traffic
- Set up Slack/email notifications for failures
