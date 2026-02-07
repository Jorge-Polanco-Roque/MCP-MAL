# mal-mcp-hub — Nube (GCP Cloud)

MCP Server centralizado por **Monterrey Agentic Labs**. Este es el approach cloud que corre en Google Cloud Platform usando Firestore, GCS y Secret Manager, desplegado en Cloud Run.

> **Estado**: En desarrollo. Las pruebas de integracion con servicios GCP reales aun estan pendientes. Los tests unitarios (con mocks) pasan correctamente, pero falta validar el flujo end-to-end en un proyecto GCP real.

## Stack

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | Firestore (Native mode) |
| Storage | Google Cloud Storage (GCS) |
| Secrets | Secret Manager (cache 5 min) |
| Transporte | HTTP (Streamable HTTP + SSE) |
| Compute | Cloud Run (0-10 instancias, scale-to-zero) |
| CI/CD | Cloud Build |
| IaC | Terraform |
| Runtime | Node.js 20+ / TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk ^1.12.0` |

## Requisitos

- Node.js 20+
- npm
- Cuenta de GCP con billing habilitado
- `gcloud` CLI instalado y autenticado
- Terraform v1.0+
- Docker (para build de imagen)

## Pruebas pendientes

- [ ] Deploy end-to-end en proyecto GCP real
- [ ] Validar conectividad Firestore en Cloud Run
- [ ] Validar lectura/escritura de assets en GCS
- [ ] Validar rotacion de secrets en Secret Manager
- [ ] Probar auto-scaling (0 a N instancias)
- [ ] Probar sesiones MCP concurrentes en Cloud Run
- [ ] Validar CI/CD pipeline completo (Cloud Build)
- [ ] Probar conexion desde Claude Code remoto via HTTPS
- [ ] Load testing con multiples sesiones simultaneas
- [ ] Validar latencia de cold start en Cloud Run

## Setup

### 1. Configurar GCP

```bash
# Autenticarse
gcloud auth login
gcloud config set project <TU_PROJECT_ID>

# Setup automatizado (habilita APIs, Terraform, build)
npm run setup
```

El script `setup-gcp.sh`:
1. Verifica que `gcloud` y `terraform` esten instalados
2. Habilita las APIs necesarias (Cloud Run, Firestore, Storage, Secret Manager, Cloud Build, Artifact Registry)
3. Corre `terraform init` + `terraform plan`
4. Opcionalmente aplica Terraform
5. Instala dependencias y compila

### 2. Variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
FIRESTORE_PROJECT=tu-project-id
GCS_BUCKET=mal-mcp-assets-tu-project-id
GCP_PROJECT_ID=tu-project-id
```

### 3. Desplegar

```bash
# Opcion A: Build y push manual
docker build -t REGION-docker.pkg.dev/PROJECT_ID/mal-registry/mal-mcp-hub:latest .
docker push REGION-docker.pkg.dev/PROJECT_ID/mal-registry/mal-mcp-hub:latest
gcloud run deploy mal-mcp-hub --source . --region REGION

# Opcion B: CI/CD automatico (push a main)
git push origin main
# Cloud Build ejecuta: install → build → test → docker → push → deploy
```

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

## Comandos disponibles

```bash
npm run setup          # Terraform + APIs + build
npm run build          # Compilar TypeScript
npm run dev            # Modo desarrollo (watch)
npm run start:gcp      # HTTP transport (Cloud Run)
npm test               # Correr tests (vitest)
npm run lint           # Linter
npm run seed           # Seed Firestore
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
npm test
```

6 tests unitarios pasando (con mocks de servicios GCP):
- `firestore.adapter.test.ts` — 5 tests (mock completo de Firestore)
- `registry.test.ts` — 1 test (mock de servicios GCP)

> **Nota**: Estos tests usan mocks. Las pruebas de integracion contra servicios GCP reales estan pendientes.

## Arquitectura GCP

```
┌─────────────────────────────────────────────────────────┐
│                    GCP Project                          │
│                                                         │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Cloud Run    │  │ Firestore │  │ Secret Manager  │  │
│  │ mal-mcp-hub  │  │ (native)  │  │ API keys        │  │
│  │ 0-10 inst.   │  │ DB: mal-  │  │                 │  │
│  │ 512Mi/1CPU   │  │  catalog  │  │                 │  │
│  └──────────────┘  └───────────┘  └─────────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ GCS Bucket   │  │ Artifact    │  │ Cloud Build   │  │
│  │ (assets)     │  │ Registry    │  │ (CI/CD)       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ IAM: mal-mcp-hub-sa                              │   │
│  │ roles/datastore.user + storage.objectAdmin +     │   │
│  │ roles/secretmanager.secretAccessor               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Diferencias con on-premise

| Aspecto | On-Premise | Nube |
|---------|-----------|------|
| DB | SQLite (archivo) | Firestore (managed) |
| Storage | Filesystem | GCS (URLs firmadas 15 min) |
| Secrets | .env | Secret Manager (cache 5 min) |
| Busqueda | FTS5 (precisa, ranking) | search_tokens (array-contains-any) |
| Transporte | stdio (default) | HTTP (obligatorio en Cloud Run) |
| Escala | 1 instancia | 0-10 auto |
| Auth | Opcional (stdio) | Siempre (x-api-key) |

## Estructura del proyecto

```
nube/
├── package.json
├── tsconfig.json
├── Dockerfile              ← Multi-stage build
├── cloudbuild.yaml         ← CI/CD pipeline
├── terraform/
│   └── main.tf            ← Cloud Run, Firestore, GCS, etc.
├── src/
│   ├── index.ts            ← Entry point (GCP adapters)
│   ├── server.ts           ← registerAllTools()
│   ├── constants.ts
│   ├── types.ts
│   ├── tools/              ← 22 tools (identicos a on-premise)
│   ├── schemas/
│   ├── services/
│   │   ├── database.ts     ← IDatabase
│   │   ├── storage.ts      ← IStorage
│   │   ├── secrets.ts      ← ISecrets
│   │   ├── auth.ts
│   │   └── gcp/
│   │       ├── firestore.adapter.ts
│   │       ├── gcs.adapter.ts
│   │       └── secret-manager.adapter.ts
│   ├── transport/
│   │   ├── http.ts
│   │   └── stdio.ts
│   └── utils/
├── tests/
└── scripts/
```

## Licencia

Monterrey Agentic Labs - Uso interno.
