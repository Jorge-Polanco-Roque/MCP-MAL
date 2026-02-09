# Docker Build

> Build Docker images for all MAL services with tagging and optional cache optimization.

- **Category**: devops
- **Shell**: bash
- **Requires Confirmation**: yes
- **Author**: MAL Team
- **Tags**: docker, build, devops

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `project_root` | string | yes | — | Root path of the v001 project |
| `tag` | string | no | `latest` | Docker image tag |

## Script

```bash
#!/bin/bash
set -e
TAG={{tag}}
echo "Building MAL Docker images with tag: $TAG"

echo "[1/3] Building MCP Server..."
docker build -t mal-mcp-hub:$TAG "{{project_root}}/on-premise"

echo "[2/3] Building Backend..."
docker build -t mal-backend:$TAG "{{project_root}}/front/backend"

echo "[3/3] Building Frontend..."
docker build -t mal-frontend:$TAG "{{project_root}}/front/frontend"

echo ""
echo "All images built:"
docker images | grep "mal-" | grep "$TAG"
```
