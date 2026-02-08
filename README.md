# MCP-MAL — Monterrey Agentic Labs MCP Hub

Servidor MCP (Model Context Protocol) centralizado que funciona como biblioteca de skills, commands, subagents, team collaboration, y gateway a MCPs downstream.

## Como funciona: Cliente ↔ Servidor

MCP sigue una **arquitectura cliente-servidor**, igual que un navegador conectandose a un servidor web:

```
Maquinas de los desarrolladores                 Servidor (local o remoto)
┌──────────────────────┐                        ┌────────────────────────────┐
│  Jorge: Claude Code  │                        │                            │
├──────────────────────┤   Streamable HTTP      │  mal-mcp-hub               │
│ Enrique: Claude Code │ ◄────────────────────► │  (MCP Server)              │
├──────────────────────┤   (JSON-RPC + SSE)     │                            │
│  Emilio: Claude Code │                        │  42 tools · DB · Skills    │
├──────────────────────┤                        │  Leaderboard · Sprints     │
│  Roman: Claude Code  │                        │  Gamification · Analytics  │
└──────────────────────┘                        └────────────────────────────┘
                                                         ▲
┌──────────────────────┐                                 │
│  Browser: front/     │ ── langchain-mcp-adapters ──────┘
│  (React + FastAPI)   │   (otro cliente MCP)
└──────────────────────┘
```

- **MCP Server** (este proyecto) — Corre en una maquina (local o remota). Almacena la base de datos, skills, commands, y expone 42 tools via protocolo MCP.
- **MCP Client** (Claude Code) — Corre en la maquina de cada desarrollador. Se conecta al servidor para descubrir y llamar tools. **No se instala en el servidor.**
- **front/** — Es otro cliente MCP (web). Se conecta al mismo servidor via HTTP.

Es la misma arquitectura que **Context7** — un servidor MCP remoto que almacena documentacion y al que Claude Code se conecta. La unica diferencia es que tu controlas el servidor.

### Escenarios de despliegue

| Escenario | Donde corre el servidor | Config de Claude Code | Uso |
|-----------|------------------------|-----------------------|-----|
| **Dev local** | `localhost:3000` | `url: "http://localhost:3000/mcp"` | Desarrollo individual |
| **Servidor de equipo** | VPS/Docker en `mcp.internal` | `url: "https://mcp.internal/mcp"` | Equipo compartido |
| **Cloud (GCP)** | Cloud Run | `url: "https://mal-mcp-hub-xxx.run.app/mcp"` | Produccion, auto-scaling |

En todos los casos el protocolo es identico — **solo cambia la URL**. Cada desarrollador configura su `~/.claude.json` apuntando al mismo servidor, y todos los tools, skills, leaderboard y datos estan centralizados.

## Tres carpetas, misma logica

```
MCP-MAL/
├── on-premise/     ← Local / servidor remoto: SQLite + filesystem + .env
├── nube/           ← GCP Cloud: Firestore + GCS + Secret Manager + Cloud Run
└── front/          ← Web UI: React + FastAPI + LangGraph (otro cliente MCP)
```

on-premise/ y nube/ comparten el 100% de la logica de negocio (tools, schemas, utils). Solo difieren en adaptadores de infraestructura.

### on-premise/ — Funcional y probado

Corre en tu maquina o en cualquier servidor. No requiere cuenta de nube.

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | SQLite + FTS5 |
| Storage | Filesystem local |
| Secrets | `.env` |
| Transporte | stdio (local) / HTTP (local o remoto) |
| Tests | 10/10 pasando |

```bash
cd on-premise
npm install && npm run build && npm run setup

# Opcion 1: Conectar Claude Code local (stdio, solo developer)
claude mcp add mal-mcp-hub -s user \
  -e TRANSPORT=stdio \
  -e SQLITE_PATH=/ruta/absoluta/on-premise/data/catalog.db \
  -e ASSETS_PATH=/ruta/absoluta/on-premise/data/assets \
  -- node /ruta/absoluta/on-premise/dist/index.js

# Opcion 2: Servidor HTTP (compartible con el equipo)
API_KEY=<tu-key> TRANSPORT=http node dist/index.js
# → http://localhost:3000/mcp (o la IP/dominio de tu servidor)
# Cada miembro del equipo apunta su Claude Code a esta URL
```

### nube/ — Cloud Run (GCP)

Diseñado para equipos, acceso remoto y escalabilidad automatica.

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | Firestore (Native) |
| Storage | Google Cloud Storage |
| Secrets | Secret Manager (API keys por usuario) |
| Compute | Cloud Run (0-10 instancias) |
| IaC | Terraform |
| CI/CD | Cloud Build |
| Tests | 25/25 pasando |

### front/ — Interfaz web

Otro cliente MCP — se conecta al mismo servidor via HTTP.

| Componente | Tecnologia |
|-----------|------------|
| Backend | Python FastAPI + 5 LangGraph agents (GPT-4o) |
| Frontend | React + TypeScript + Tailwind + shadcn/ui |
| Conexion MCP | langchain-mcp-adapters (Streamable HTTP) |
| Paginas | 10 rutas: Chat, Sprints, Backlog, Analytics, Leaderboard, Profile, Decisions, Next Steps, Catalog, Interactions |

## Arquitectura

```
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Jorge           │  │  Enrique         │  │  Emilio          │
   │  Claude Code     │  │  Claude Code     │  │  Claude Code     │
   │  (MCP Client)    │  │  (MCP Client)    │  │  (MCP Client)    │
   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
            │                     │                      │
            └─────────┬───────────┴──────────┬───────────┘
                      │  Streamable HTTP     │
                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     mal-mcp-hub (MCP SERVER)                      │
│                  42 MCP tools · Centralized DB                   │
│                                                                  │
│  skills · commands · subagents · mcps · proxy · meta             │
│  team · sprints · work-items · interactions                      │
│  gamification · analytics                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           IDatabase  ·  IStorage  ·  ISecrets              │  │
│  └──────────┬──────────────────────────┬──────────────────────┘  │
└─────────────┼──────────────────────────┼─────────────────────────┘
              │                          │
       ┌──────▼──────┐           ┌───────▼──────┐
       │ on-premise  │           │     nube     │
       │ SQLite      │           │  Firestore   │
       │ Filesystem  │           │  GCS         │
       │ .env        │           │  Secret Mgr  │
       └─────────────┘           └──────────────┘
```

## 42 Tools

Todas prefijadas `mal_`, registradas con `server.registerTool()` y annotations MCP.

| Modulo | Tools | Descripcion |
|--------|-------|-------------|
| registry.ts | 7 | CRUD skills + list/register MCPs |
| skills.ts | 2 | Busqueda full-text + contenido SKILL.md |
| commands.ts | 4 | CRUD commands + ejecucion de templates |
| subagents.ts | 3 | CRUD configuraciones de subagents |
| mcp-proxy.ts | 2 | Proxy a MCPs downstream + health check |
| meta.ts | 4 | Search catalog, export/import, stats |
| team.ts | 4 | Registro de miembros, perfiles, busqueda |
| sprints.ts | 3 | CRUD sprints (planning, active, done) |
| work-items.ts | 5 | CRUD work items + asignacion |
| interactions.ts | 3 | Historial de conversaciones + busqueda |
| gamification.ts | 3 | Leaderboard, achievements, log contributions |
| analytics.ts | 2 | Commit activity (auto-sync git→XP) + sprint reports |

## Tech stack

**MCP Server** (TypeScript):
- Node.js 20+ · MCP SDK `^1.12.0` · Zod · Express · pino · vitest

**Web Interface** (front/):
- Python 3.11+ · FastAPI · LangGraph · langchain-mcp-adapters · OpenAI GPT-4o
- React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · Recharts

## Equipo

| ID | Nombre | Rol |
|----|--------|-----|
| jorge | Jorge | Lead |
| enrique | Enrique | Lead |
| emilio | Emilio | Lead |
| roman | Roman | Lead |

## Documentacion

- [`CLAUDE.md`](./CLAUDE.md) — Guia tecnica detallada para Claude Code
- [`front/CLAUDE.md`](./front/CLAUDE.md) — Docs del web interface
- [`on-premise/README.md`](./on-premise/README.md) — Docs del approach local
- [`nube/README.md`](./nube/README.md) — Docs del approach GCP

## Licencia

Monterrey Agentic Labs — Uso interno.
