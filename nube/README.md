# mal-mcp-hub — Nube (GCP Cloud)

MCP Server centralizado por **Monterrey Agentic Labs**. Deployment path para Google Cloud Platform usando Firestore, GCS y Secret Manager, desplegado en Cloud Run.

## Stack

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | Firestore (Native mode) |
| Storage | Google Cloud Storage (GCS) |
| Secrets | Secret Manager (cache configurable) |
| Transporte | HTTP (Streamable HTTP + SSE) |
| Compute | Cloud Run (0-10 instancias, scale-to-zero) |
| CI/CD | Cloud Build (con vulnerability scan + smoke test) |
| IaC | Terraform (Firestore indexes, monitoring, Cloud Armor) |
| Runtime | Node.js 20+ / TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk ^1.12.0` |
| Security | helmet, CORS, timing-safe auth, rate limiting |

## Requisitos

- Node.js 20+
- npm
- Cuenta de GCP con billing habilitado
- `gcloud` CLI instalado y autenticado
- Terraform v1.0+
- Docker (para build de imagen)

## Quick Start

### Desarrollo local (Docker Compose)

```bash
npm run dev:local
# Levanta: Firestore emulator (:8080) + GCS emulator (:4443) + app (:3000)
```

Verificar:
```bash
curl http://localhost:3000/health
```

### GCP Deployment

```bash
npm run setup          # Interactive: habilita APIs, Terraform, build
npm run build          # Compilar TypeScript
npm test               # 20 tests unitarios
npm run seed           # Seed Firestore con datos de ejemplo
```

## Variables de entorno

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIRESTORE_PROJECT` | Yes | — | GCP project ID para Firestore |
| `GCS_BUCKET` | Yes | — | Cloud Storage bucket name |
| `GCP_PROJECT_ID` | Yes | — | GCP project ID para Secret Manager |
| `TRANSPORT` | No | `http` | `http` o `stdio` |
| `PORT` | No | `3000` | Puerto HTTP |
| `HOST` | No | `0.0.0.0` | Bind address |
| `FIRESTORE_DATABASE_ID` | No | `mal-catalog` | Firestore database name |
| `SESSION_TIMEOUT_MS` | No | `1800000` | Session idle timeout (30 min) |
| `MAX_SESSIONS` | No | `100` | Max concurrent MCP sessions |
| `CORS_ORIGINS` | No | `""` | Comma-separated allowed origins |
| `SECRET_CACHE_TTL_MS` | No | `300000` | Secret Manager cache TTL (5 min) |
| `GCS_MAX_FILE_SIZE` | No | `10485760` | Max file read size (10MB) |
| `LOG_LEVEL` | No | `info` | pino log level |
| `NODE_ENV` | No | `production` | Node environment |

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compilar TypeScript |
| `npm run dev` | tsx watch mode |
| `npm run dev:local` | Docker Compose con emuladores |
| `npm run start:gcp` | HTTP transport (Cloud Run) |
| `npm test` | Tests unitarios (vitest, 20 tests) |
| `npm run test:integration` | Tests contra emuladores locales |
| `npm run lint` | ESLint |
| `npm run seed` | Seed Firestore catalog |
| `npm run docker:build` | Build Docker image localmente |
| `npm run clean` | Limpiar dist/ y node_modules/ |

## Production Deployment Checklist

1. **Terraform**: `cd terraform && terraform plan -var-file=prod.tfvars`
2. **Secrets**: Crear `API_KEY` secret en Secret Manager
3. **Build & Deploy**: Cloud Build triggers on push, o manualmente:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```
4. **Verificar**: Cloud Run logs + endpoint `/health`
5. **Monitoring**: Configurar `alert_email` en `prod.tfvars`

## Monitoring & Alertas

Cuando `alert_email` esta configurado en Terraform:

- **Uptime check**: `/health` cada 60s
- **Error rate**: alerta si >5% errores por 5 min
- **Latency**: alerta si p95 >5s por 5 min
- **Scaling**: alerta si esta al max de instancias >10 min

Cloud Armor WAF (opcional via `enable_cloud_armor = true`):
- Rate limiting: 100 req/min por IP
- Ban automatico: 5 min despues de exceder limite

## Conectar a Claude Code

```json
{
  "mcpServers": {
    "mal-mcp-hub": {
      "type": "http",
      "url": "https://mal-mcp-hub-XXXX.run.app/mcp",
      "headers": { "x-api-key": "<tu-api-key-de-secret-manager>" }
    }
  }
}
```

## 22 Tools disponibles

Identicas al approach on-premise. La logica de negocio es compartida; solo cambian los adaptadores de servicios.

### Skills (9 tools)
`mal_list_skills`, `mal_get_skill`, `mal_register_skill`, `mal_update_skill`, `mal_delete_skill`, `mal_search_skills`, `mal_get_skill_content`

### Commands (4 tools)
`mal_list_commands`, `mal_get_command`, `mal_register_command`, `mal_execute_command`

### Subagents (3 tools)
`mal_list_subagents`, `mal_get_subagent`, `mal_register_subagent`

### MCPs (2 tools)
`mal_list_mcps`, `mal_register_mcp`

### Proxy & Health (2 tools)
`mal_proxy_mcp_call`, `mal_health_check`

### Meta (4 tools)
`mal_search_catalog`, `mal_export_catalog`, `mal_import_catalog`, `mal_get_usage_stats`

## Tests

```bash
npm test    # 20 tests, all passing
```

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `firestore.adapter.test.ts` | 9 | CRUD, pagination, update, delete, custom DB ID |
| `auth.test.ts` | 6 | Valid/invalid key, missing header, multi-key, rate limit |
| `commands.test.ts` | 2 | Create/retrieve, list with filters |
| `http.test.ts` | 2 | Server startup, graceful shutdown |
| `registry.test.ts` | 1 | Tool registration |

## Arquitectura GCP

```
┌──────────────────────────────────────────────────────────────┐
│                       GCP Project                            │
│                                                              │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────────────┐   │
│  │ Cloud Run    │  │ Firestore │  │ Secret Manager      │   │
│  │ mal-mcp-hub  │  │ (native)  │  │ API keys (multi)    │   │
│  │ 0-10 inst.   │  │ DB: mal-  │  │                     │   │
│  │ 512Mi/1CPU   │  │  catalog  │  │                     │   │
│  │ VPC egress   │  │ + indexes │  │                     │   │
│  └──────────────┘  │ + backups │  └─────────────────────┘   │
│                    └───────────┘                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ GCS Bucket   │  │ Artifact    │  │ Cloud Build      │   │
│  │ (assets)     │  │ Registry    │  │ + scan + smoke   │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ VPC Access   │  │ Monitoring  │  │ Cloud Armor      │   │
│  │ Connector    │  │ + Alerts    │  │ (optional WAF)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ IAM: mal-mcp-hub-sa                                   │   │
│  │ datastore.user + storage.objectAdmin +                │   │
│  │ secretmanager.secretAccessor                          │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Desarrollo local con Docker Compose

```
docker-compose.yml
├── firestore-emulator (:8080)   ← google/cloud-sdk
├── gcs-emulator (:4443)         ← fsouza/fake-gcs-server
└── app (:3000)                  ← mal-mcp-hub (non-root)
```

```bash
# Iniciar
npm run dev:local

# Probar
curl http://localhost:3000/health

# Tests contra emuladores
npm run test:integration

# Parar
docker compose down
```

## Diferencias con on-premise

| Aspecto | On-Premise | Nube |
|---------|-----------|------|
| DB | SQLite (archivo) | Firestore (managed) |
| Storage | Filesystem | GCS (URLs firmadas 15 min) |
| Secrets | .env | Secret Manager (cache configurable) |
| Busqueda | FTS5 (precisa, ranking) | search_tokens (array-contains-any) |
| Transporte | stdio (default) | HTTP (obligatorio en Cloud Run) |
| Escala | 1 instancia | 0-10 auto |
| Auth | Opcional (stdio) | Siempre (timing-safe, rate limited) |
| Shutdown | — | Graceful (SIGTERM, 30s timeout) |
| Sessions | Sin cleanup | Idle timeout + max limit |
| Docker | — | Non-root, healthcheck |
| Monitoring | — | Uptime, error rate, latency alerts |
| WAF | — | Cloud Armor (opcional) |

## Troubleshooting

### Firestore connection fails
- **Local**: Verificar `FIRESTORE_EMULATOR_HOST` y que el emulador este corriendo
- **GCP**: Verificar que el service account tenga `roles/datastore.user`

### 401/403 en /mcp
- Verificar que el secret `API_KEY` exista en Secret Manager
- Multiples keys: separar con comas o usar JSON array format
- Verificar header: debe ser `x-api-key` (no `Authorization`)

### 429 Too Many Requests
- Rate limiting: max 10 auth failures por IP por minuto
- Cloud Armor: max 100 req/min por IP (si habilitado)

### 503 "Server at capacity"
- Incrementar `MAX_SESSIONS` o Cloud Run max instances
- Verificar session leaks (clientes no llamando DELETE /mcp)

### Session timeout
- Default: 30 min idle. Ajustar via `SESSION_TIMEOUT_MS`
- Cleanup automatico cada 60s

### Docker build fails
- Imagen corre como non-root user `app`
- Base: `node:20.11-slim`
- Healthcheck integrado

## Estructura del proyecto

```
nube/
├── package.json
├── tsconfig.json
├── Dockerfile              ← Multi-stage, non-root, healthcheck
├── docker-compose.yml      ← Local dev con emuladores
├── cloudbuild.yaml         ← CI/CD: build → test → scan → deploy → smoke
├── .env.example            ← Todas las variables documentadas
├── terraform/
│   ├── main.tf             ← Cloud Run, Firestore, GCS, VPC
│   ├── firestore.tf        ← Indexes + backup schedule
│   ├── monitoring.tf       ← Uptime checks + alerts
│   ├── cloud-armor.tf      ← WAF rate limiting (opcional)
│   ├── variables.tf        ← Todas las variables
│   ├── outputs.tf          ← URLs, nombres, etc.
│   ├── dev.tfvars          ← Config desarrollo
│   └── prod.tfvars         ← Config produccion
├── src/
│   ├── index.ts            ← Entry point + graceful shutdown
│   ├── server.ts           ← registerAllTools()
│   ├── constants.ts
│   ├── types.ts
│   ├── tools/              ← 22 tools (identicos a on-premise)
│   ├── schemas/
│   ├── services/
│   │   ├── database.ts     ← IDatabase
│   │   ├── storage.ts      ← IStorage (+ contentType)
│   │   ├── secrets.ts      ← ISecrets
│   │   ├── auth.ts         ← Timing-safe, multi-key, rate limit
│   │   └── gcp/
│   │       ├── firestore.adapter.ts    ← Configurable DB ID
│   │       ├── gcs.adapter.ts          ← Retry, content-type, size limit
│   │       └── secret-manager.adapter.ts ← Timeout, configurable cache
│   ├── transport/
│   │   ├── http.ts         ← Session timeout, max limit, helmet, CORS
│   │   └── stdio.ts
│   └── utils/
├── tests/
│   ├── services/
│   │   ├── firestore.adapter.test.ts  ← 9 tests
│   │   └── auth.test.ts              ← 6 tests
│   ├── tools/
│   │   ├── registry.test.ts          ← 1 test
│   │   └── commands.test.ts          ← 2 tests
│   ├── transport/
│   │   └── http.test.ts              ← 2 tests
│   └── fixtures/
│       └── seed-data.json
└── scripts/
    ├── setup-gcp.sh
    └── seed-catalog.ts
```

## Licencia

Monterrey Agentic Labs - Uso interno.
