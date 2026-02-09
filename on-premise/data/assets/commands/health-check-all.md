# Health Check All

> Curl MCP /health, backend /api/health, frontend root. Shows color-coded status output for all services.

- **Category**: devops
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: health, monitoring, devops

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `host` | string | no | `localhost` | Host address |
| `frontend_port` | string | no | `5173` | Frontend port |

## Script

```bash
#!/bin/bash
echo "MAL Platform Health Check"
echo "========================="

check_service() {
  local name=$1
  local url=$2
  local status
  status=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "  [OK]   $name ($url)"
  else
    echo "  [FAIL] $name ($url) — HTTP $status"
  fi
}

check_service "MCP Server"  "http://{{host}}:3000/health"
check_service "Backend API" "http://{{host}}:8000/api/health"
check_service "Frontend"    "http://{{host}}:{{frontend_port}}/"
echo ""
echo "Done."
```
