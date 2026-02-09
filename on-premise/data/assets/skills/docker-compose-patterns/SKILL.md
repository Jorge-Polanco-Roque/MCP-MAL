# Docker Compose Patterns

## Overview
Multi-service orchestration patterns for local development and production deployment. Covers networking, volumes, health checks, and environment-specific configurations.

## Core Patterns

### 1. Service Dependencies
```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
```

### 2. Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 3. Networking
- Use custom bridge networks for service isolation
- Name networks explicitly for clarity
- Use `expose` for internal ports, `ports` only for host-facing

```yaml
networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

### 4. Volume Patterns
```yaml
volumes:
  db-data:         # Named volume for persistence
  node_modules:    # Anonymous volume for node_modules

services:
  app:
    volumes:
      - ./src:/app/src        # Bind mount for hot reload
      - node_modules:/app/node_modules  # Preserve container node_modules
      - db-data:/data          # Persistent database
```

### 5. Dev vs Prod
Use `docker-compose.override.yml` for dev, base `docker-compose.yml` for prod:
```bash
# Dev (auto-loads override)
docker compose up

# Prod (explicit file)
docker compose -f docker-compose.yml up -d
```

### 6. MAL Stack Example
```yaml
services:
  mcp-server:
    build: ./on-premise
    ports: ["3000:3000"]
    environment:
      TRANSPORT: http
      SQLITE_PATH: /data/catalog.db
    volumes:
      - mcp-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]

  backend:
    build: ./front/backend
    ports: ["8000:8000"]
    environment:
      MCP_SERVER_URL: http://mcp-server:3000/mcp
    depends_on:
      mcp-server:
        condition: service_healthy

  frontend:
    build: ./front/frontend
    ports: ["80:80"]
    depends_on: [backend]
```

## Best Practices
- Always use explicit image tags (never `latest` in prod)
- Set resource limits: `deploy.resources.limits`
- Use `.env` file for environment variables
- Add `restart: unless-stopped` for production services
- Log to stdout/stderr, collect with Docker logging driver
