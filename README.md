# MCP-MAL — Monterrey Agentic Labs MCP Hub

Servidor MCP (Model Context Protocol) centralizado que funciona como biblioteca de skills, commands, subagents y gateway a MCPs downstream. Conecta directamente con Claude Code.

## Dos approaches, misma logica

El proyecto ofrece dos caminos de despliegue independientes. Ambos comparten el 100% de la logica de negocio (tools, schemas, utils) y solo difieren en los adaptadores de infraestructura.

```
MCP-MAL/
├── on-premise/     ← Local: SQLite + filesystem + .env
└── nube/           ← Cloud: Firestore + GCS + Secret Manager + Cloud Run
```

### on-premise/ — Listo para produccion

**Estado: Funcional y probado.**

Corre 100% en tu maquina. No requiere cuenta de nube, credenciales externas ni internet.

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | SQLite + FTS5 |
| Storage | Filesystem local |
| Secrets | `.env` |
| Transporte | stdio (default) / HTTP |
| Tests | 10/10 pasando |

Probado end-to-end:
- Startup stdio y HTTP
- Sesiones MCP completas (initialize → tools/list → tools/call → DELETE)
- CRUD de skills con persistencia en SQLite + archivos SKILL.md
- Health check, stats, export/import de catalogo

```bash
cd on-premise
npm install && npm run build && npm run setup
# Conectar a Claude Code:
claude mcp add mal-mcp-hub -s user \
  -e TRANSPORT=stdio \
  -e SQLITE_PATH=/ruta/absoluta/on-premise/data/catalog.db \
  -e ASSETS_PATH=/ruta/absoluta/on-premise/data/assets \
  -- node /ruta/absoluta/on-premise/dist/index.js
```

### nube/ — Pendiente de validacion

**Estado: Codigo completo, tests unitarios pasando (6/6 con mocks). Falta validar en GCP real.**

Diseñado para equipos, acceso remoto y escalabilidad automatica en Google Cloud Platform.

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | Firestore (Native) |
| Storage | Google Cloud Storage |
| Secrets | Secret Manager |
| Compute | Cloud Run (0-10 instancias) |
| IaC | Terraform |
| CI/CD | Cloud Build |
| Tests | 6/6 pasando (mocks) |

Pendiente:
- Deploy end-to-end en proyecto GCP real
- Validar Firestore, GCS y Secret Manager en Cloud Run
- Probar auto-scaling y cold starts
- Validar CI/CD pipeline completo
- Load testing con sesiones concurrentes

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code / LLM                        │
└──────────────┬──────────────────────┬───────────────────────┘
               │ stdio               │ Streamable HTTP
               ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     mal-mcp-hub                             │
│                   22 MCP tools                              │
│  skills · commands · subagents · mcps · proxy · meta        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          IDatabase · IStorage · ISecrets              │  │
│  └──────┬────────────────────────────┬───────────────────┘  │
└─────────┼────────────────────────────┼──────────────────────┘
          │                            │
   ┌──────▼──────┐              ┌──────▼──────┐
   │ on-premise  │              │    nube     │
   │ SQLite      │              │ Firestore   │
   │ Filesystem  │              │ GCS         │
   │ .env        │              │ Secret Mgr  │
   └─────────────┘              └─────────────┘
```

## 22 Tools

Todas prefijadas `mal_`, registradas con `server.registerTool()` y annotations MCP.

| Modulo | Tools | Descripcion |
|--------|-------|-------------|
| registry.ts | 7 | CRUD skills + list/register MCPs |
| skills.ts | 2 | Busqueda full-text + contenido SKILL.md |
| commands.ts | 4 | CRUD commands + ejecucion de templates |
| subagents.ts | 3 | CRUD configuraciones de subagents |
| mcp-proxy.ts | 2 | Proxy a MCPs downstream + health check |
| meta.ts | 4 | Search catalog, export/import, stats |

## Tech stack

- TypeScript + Node.js 20+
- MCP SDK `@modelcontextprotocol/sdk ^1.12.0`
- Zod (validacion)
- Express (transporte HTTP)
- pino (logging en stderr)
- vitest (tests)

## Documentacion

- [`CLAUDE.md`](./CLAUDE.md) — Guia tecnica detallada para Claude Code
- [`on-premise/README.md`](./on-premise/README.md) — Documentacion del approach local
- [`nube/README.md`](./nube/README.md) — Documentacion del approach GCP
- [`prompt_inicial.txt`](./prompt_inicial.txt) — Especificacion original del proyecto

## Licencia

Monterrey Agentic Labs — Uso interno.
