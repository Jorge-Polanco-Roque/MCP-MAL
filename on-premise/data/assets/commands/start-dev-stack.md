# Start Dev Stack

> Start MCP server + backend + frontend in parallel. Checks ports, kills stale processes, validates .env files exist.

- **Category**: devops
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: dev, stack, start, devops

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `project_root` | string | yes | — | Root path of the v001 project |
| `mcp_api_key` | string | yes | `dev-key` | API key for MCP server |

## Script

```bash
#!/bin/bash
set -e
echo "Starting MAL Dev Stack..."

# Check and kill stale processes
for PORT in 3000 8000 5173; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

sleep 1

# Validate .env exists for backend
if [ ! -f "{{project_root}}/front/backend/.env" ]; then
  echo "WARNING: front/backend/.env not found. Copy from .env.example"
fi

# Start services in background
echo "Starting MCP Server (on-premise) on :3000..."
cd "{{project_root}}/on-premise" && API_KEY={{mcp_api_key}} TRANSPORT=http SQLITE_PATH=./data/catalog.db ASSETS_PATH=./data/assets node dist/index.js &

echo "Starting Backend (FastAPI) on :8000..."
cd "{{project_root}}/front/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 &

echo "Starting Frontend (Vite) on :5173..."
cd "{{project_root}}/front/frontend" && npm run dev &

echo ""
echo "All services starting. Health checks:"
sleep 3
curl -sf http://localhost:3000/health > /dev/null && echo "  MCP Server: OK" || echo "  MCP Server: STARTING..."
curl -sf http://localhost:8000/api/health > /dev/null && echo "  Backend:    OK" || echo "  Backend:    STARTING..."
curl -sf http://localhost:5173/ > /dev/null && echo "  Frontend:   OK" || echo "  Frontend:   STARTING..."
echo ""
echo "Dev stack launched. Press Ctrl+C to stop all."
wait
```
