# Deploy to Cloud Run

> Submit Cloud Build, wait for deployment, run smoke test, display URL. Uses gcloud CLI.

- **Category**: devops
- **Shell**: bash
- **Requires Confirmation**: yes
- **Author**: MAL Team
- **Tags**: deploy, cloud-run, gcp, devops

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `project_root` | string | yes | — | Root path of the v001 project |
| `project_id` | string | yes | — | GCP project ID |
| `region` | string | no | `us-central1` | GCP region |

## Script

```bash
#!/bin/bash
set -e
PROJECT={{project_id}}
REGION={{region}}
SERVICE=mal-mcp-hub

echo "Deploying $SERVICE to Cloud Run ($REGION)..."

cd "{{project_root}}/nube"

# Submit build
gcloud builds submit --project=$PROJECT --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_SERVICE=$SERVICE

# Get URL
URL=$(gcloud run services describe $SERVICE --project=$PROJECT --region=$REGION --format="value(status.url)")

echo ""
echo "Deployed to: $URL"
echo "Running smoke test..."

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$URL/health" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "Smoke test PASSED"
else
  echo "Smoke test FAILED (HTTP $STATUS)"
  exit 1
fi
```
