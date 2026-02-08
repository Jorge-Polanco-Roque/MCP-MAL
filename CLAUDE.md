# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mal-mcp-hub** is a centralized MCP (Model Context Protocol) server by Monterrey Agentic Labs (MAL). It serves as a library of commands, skills, subagents, and a gateway to downstream MCPs, connected to Claude Code. Built with TypeScript + Node.js, MCP SDK `^1.12.0`.

## Repository Structure

The project is split into three independent, self-contained folders:

- **`on-premise/`** — Local deployment path (SQLite + filesystem + .env)
- **`nube/`** — GCP Cloud deployment path (Firestore + GCS + Secret Manager + Cloud Run)
- **`front/`** — Web interface (Python FastAPI + LangGraph agent + React dashboard)

on-premise/ and nube/ share identical business logic code (`src/tools/`, `src/schemas/`, `src/utils/`, `src/types.ts`, `src/server.ts`, `src/transport/`). They differ only in service adapters (`src/services/local/` vs `src/services/gcp/`) and entry point wiring (`src/index.ts`).

front/ contains a Python backend (FastAPI + LangGraph + langchain-mcp-adapters) that connects to the MCP server, and a React frontend (Vite + Tailwind CSS) with a chat interface and catalog dashboard.

```
v001/
├── CLAUDE.md                     ← you are here
├── prompt_inicial.txt            ← original project specification
├── on-premise/                   ← local deployment
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/
│   │   ├── schema.sql            ← SQLite DDL (5 tables + FTS5)
│   │   └── assets/               ← SKILL.md files
│   ├── src/
│   │   ├── index.ts              ← entry point (SQLite + Filesystem + Dotenv)
│   │   ├── server.ts             ← registerAllTools hub
│   │   ├── constants.ts          ← SERVER_NAME, COLLECTIONS, enums
│   │   ├── types.ts              ← SkillEntry, CommandEntry, SubagentConfig, MCPRegistryEntry
│   │   ├── tools/                ← 22 MCP tools (6 files)
│   │   │   ├── registry.ts       ← 7 tools: skill CRUD + MCP list/register
│   │   │   ├── skills.ts         ← 2 tools: search_skills, get_skill_content
│   │   │   ├── commands.ts       ← 4 tools: list/get/register/execute commands
│   │   │   ├── subagents.ts      ← 3 tools: list/get/register subagents
│   │   │   ├── mcp-proxy.ts      ← 2 tools: proxy_mcp_call, health_check
│   │   │   └── meta.ts           ← 4 tools: search/export/import catalog, usage_stats
│   │   ├── schemas/              ← Zod schemas (.strict())
│   │   ├── services/
│   │   │   ├── database.ts       ← IDatabase interface
│   │   │   ├── storage.ts        ← IStorage interface
│   │   │   ├── secrets.ts        ← ISecrets interface
│   │   │   ├── auth.ts           ← Bearer token auth middleware
│   │   │   └── local/
│   │   │       ├── sqlite.adapter.ts
│   │   │       ├── filesystem.adapter.ts
│   │   │       └── dotenv.adapter.ts
│   │   ├── transport/
│   │   │   ├── http.ts           ← Express + StreamableHTTP + sessions
│   │   │   └── stdio.ts          ← StdioServerTransport
│   │   └── utils/
│   │       ├── error-handler.ts
│   │       ├── formatter.ts
│   │       ├── logger.ts         ← pino (stderr)
│   │       └── pagination.ts
│   └── tests/
│       ├── services/sqlite.adapter.test.ts   ← 6 tests
│       └── tools/
│           ├── registry.test.ts              ← 2 tests
│           └── commands.test.ts              ← 2 tests
└── nube/                          ← GCP Cloud deployment (production-ready)
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile                 ← multi-stage, non-root, healthcheck
    ├── docker-compose.yml         ← local dev with Firestore + GCS emulators
    ├── cloudbuild.yaml            ← CI/CD: build → test → scan → deploy → smoke test
    ├── .env.example               ← all env vars documented
    ├── README.md                  ← full deployment + troubleshooting docs
    ├── src/
    │   ├── index.ts               ← entry point + graceful shutdown (SIGTERM/SIGINT)
    │   ├── server.ts              ← same as on-premise
    │   ├── tools/                 ← same 6 files as on-premise
    │   ├── schemas/               ← same as on-premise
    │   ├── services/
    │   │   ├── database.ts        ← IDatabase interface
    │   │   ├── storage.ts         ← IStorage interface (+ optional contentType)
    │   │   ├── secrets.ts         ← ISecrets interface
    │   │   ├── auth.ts            ← timing-safe, named keys, rate limiting, identity tracking
    │   │   └── gcp/
    │   │       ├── firestore.adapter.ts     ← configurable DB ID, fixed search total
    │   │       ├── gcs.adapter.ts           ← retry + backoff, content-type, size limit
    │   │       └── secret-manager.adapter.ts ← 10s timeout, configurable cache TTL
    │   ├── transport/
    │   │   ├── http.ts            ← session timeout + max limit, helmet, CORS, TransportHandle
    │   │   └── stdio.ts           ← StdioServerTransport
    │   └── utils/                 ← same as on-premise
    ├── tests/
    │   ├── services/
    │   │   ├── firestore.adapter.test.ts  ← 9 tests (CRUD, pagination, update, delete)
    │   │   └── auth.test.ts               ← 11 tests (parseApiKeys, named keys, identity, rate limit)
    │   ├── tools/
    │   │   ├── registry.test.ts           ← 1 test
    │   │   └── commands.test.ts           ← 2 tests
    │   ├── transport/
    │   │   └── http.test.ts               ← 2 tests (startup, shutdown)
    │   └── fixtures/
    │       └── seed-data.json
    ├── scripts/
    │   ├── setup-gcp.sh              ← interactive GCP setup
    │   ├── seed-catalog.ts           ← seed Firestore with sample data
    │   └── manage-keys.ts            ← API key management CLI (list/add/show/remove)
    └── terraform/
        ├── main.tf                ← Cloud Run, Firestore, GCS, VPC connector
        ├── firestore.tf           ← 7 composite indexes + daily backup
        ├── monitoring.tf          ← uptime check + 3 alert policies
        ├── cloud-armor.tf         ← optional WAF rate limiting
        ├── variables.tf           ← 10 variables (6 new)
        ├── outputs.tf             ← 7 outputs (4 new)
        ├── dev.tfvars             ← development config
        └── prod.tfvars            ← production config
└── front/                         ← web interface
    ├── CLAUDE.md                  ← front/ docs
    ├── docker-compose.yml         ← 3 services
    ├── backend/
    │   ├── pyproject.toml
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── app/
    │       ├── main.py            ← FastAPI + lifespan
    │       ├── config.py          ← pydantic-settings
    │       ├── agent/             ← LangGraph graph + prompts
    │       ├── mcp/               ← MultiServerMCPClient
    │       ├── api/               ← WebSocket chat + REST dashboard
    │       └── models/            ← Pydantic schemas
    └── frontend/
        ├── package.json
        ├── vite.config.ts
        ├── Dockerfile
        └── src/
            ├── App.tsx            ← 2-column layout
            ├── components/        ← chat/ + dashboard/ + ui/
            ├── hooks/             ← useChat, useWebSocket, useCatalog
            └── lib/               ← types, api, utils
```

## Build & Development Commands

### on-premise/ (Local)

```bash
npm run setup              # Init SQLite + folders + .env
npm run build              # tsc
npm run dev                # tsx watch mode
npm run start:stdio        # stdio transport (Claude Code)
npm run start:http         # HTTP on localhost:3000
npm test                   # vitest run  (10 tests, all passing)
npm run lint               # eslint src/
npm run seed               # Load initial catalog data
npm run inspect            # MCP Inspector
```

### nube/ (GCP Cloud)

```bash
npm run setup              # Terraform init + apply + GCP APIs
npm run build              # tsc
npm run dev                # tsx watch mode
npm run dev:local          # docker compose up --build (Firestore + GCS emulators)
npm run start:gcp          # HTTP transport (Cloud Run)
npm test                   # vitest run  (25 tests, all passing)
npm run test:integration   # tests against local emulators
npm run lint               # eslint src/
npm run seed               # Seed Firestore catalog
npm run keys -- list       # API key management (list/add/show/remove)
npm run docker:build       # Build Docker image locally
npm run clean              # rm -rf dist node_modules
```

### front/ (Web Interface)

```bash
# Backend (Python)
cd front/backend
pip install -r requirements.txt    # Install deps
uvicorn app.main:app --reload      # Dev server on :8000
pytest                             # Run tests

# Frontend (React)
cd front/frontend
npm install                        # Install deps
npm run dev                        # Vite dev server on :5173
npm run build                      # Production build

# All services (Docker)
cd front
docker compose up --build          # MCP :3000 + Backend :8000 + Frontend :80
```

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (React App :5173)                     │
│          Chat (WebSocket) + Dashboard (REST)                    │
└──────────┬──────────────────────────┬───────────────────────────┘
           │ WS /ws/chat              │ GET /api/*
           ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              LangGraph Agent (GPT-4o)                      │ │
│  │  START → call_model → [tool_calls?] → ToolNode → loop/END │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │ langchain-mcp-adapters                 │
│                         │ MultiServerMCPClient (streamable_http) │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP (MCP Streamable HTTP)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code / LLM                        │
│                     (MCP Client / Consumer)                     │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │ stdio                │ Streamable HTTP
                   │ (JSON-RPC)           │ (JSON-RPC + SSE)
                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       mal-mcp-hub                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ registry.ts│  │ skills.ts  │  │commands.ts │  │subagents │  │
│  │  (7 tools) │  │  (2 tools) │  │ (4 tools)  │  │ (3 tools)│  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
│  ┌────────────┐  ┌────────────┐                                 │
│  │mcp-proxy.ts│  │  meta.ts   │        22 tools total           │
│  │  (2 tools) │  │  (4 tools) │                                 │
│  └─────┬──────┘  └────────────┘                                 │
│        │                                                        │
│  ┌─────▼──────────────────────────────────────────────────────┐ │
│  │              Service Interfaces (Adapter Pattern)          │ │
│  │  IDatabase  ·  IStorage  ·  ISecrets  ·  Auth middleware   │ │
│  └──────┬────────────┬────────────┬───────────────────────────┘ │
└─────────┼────────────┼────────────┼─────────────────────────────┘
          │            │            │
    ┌─────┴────┐ ┌─────┴────┐ ┌────┴─────┐
    │on-premise│ │on-premise│ │on-premise│     LOCAL
    │ SQLite   │ │Filesystem│ │  Dotenv  │
    └──────────┘ └──────────┘ └──────────┘
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  nube    │ │  nube    │ │  nube    │     GCP
    │Firestore │ │   GCS    │ │ Secret   │
    │          │ │          │ │ Manager  │
    └──────────┘ └──────────┘ └──────────┘
```

### Adapter Pattern (Core Abstraction)

Three interfaces in `src/services/` enable deployment-path independence:

- **`IDatabase`** (`database.ts`) — Generic CRUD + full-text search + pagination. Implemented by `SQLiteAdapter` (on-premise) and `FirestoreAdapter` (nube).
- **`IStorage`** (`storage.ts`) — Read/write/list/delete/exists assets. `write()` accepts optional `contentType` param (nube). Implemented by `FilesystemAdapter` (on-premise) and `GCSAdapter` (nube).
- **`ISecrets`** (`secrets.ts`) — Key/value secret access. Implemented by `DotenvAdapter` (on-premise) and `SecretManagerAdapter` (nube).

```
IDatabase                          IStorage                        ISecrets
├── get<T>(col, id)                ├── read(path)                  ├── get(key)
├── list<T>(col, opts?)            ├── write(path, content, type?) └── has(key)
├── create<T>(col, id, data)       ├── delete(path)
├── update<T>(col, id, data)       ├── list(prefix)
├── delete(col, id)                ├── exists(path)
├── search<T>(col, query, opts?)   └── getUrl(path)
└── ping()
```

### Entry Point Flow (`src/index.ts`)

```
main()
  │
  ├── Create adapters
  │   ├── on-premise: SQLiteAdapter + FilesystemAdapter + DotenvAdapter
  │   └── nube:       FirestoreAdapter(project, dbId) + GCSAdapter + SecretManagerAdapter
  │
  ├── db.ping() → verify connectivity
  │
  └── TRANSPORT env var?
      │
      ├── "http" → startHttpTransport(createServer, options) → TransportHandle
      │             Factory pattern: each session → new McpServer instance
      │             nube: registers SIGTERM/SIGINT → handle.close() (30s timeout)
      │
      └── "stdio" (default on-premise)
                    Single McpServer + registerAllTools() + StdioServerTransport
```

### HTTP Transport — Session Management

The HTTP transport (`src/transport/http.ts`) implements MCP spec-compliant session management with production hardening (nube/):

```
Client                              Server (Express + helmet + CORS)
  │                                     │
  ├─ POST /mcp (no session-id) ────────►│ authMiddleware (timing-safe, named keys, rate-limited)
  │  { method: "initialize" }           │   ├── sessions.size >= MAX_SESSIONS? → 503
  │                                     │   ├── isInitializeRequest(body)?
  │                                     │   │   ├── YES: Create StreamableHTTPServerTransport
  │                                     │   │   │        sessionIdGenerator: randomUUID()
  │                                     │   │   │        Store in Map<sid, SessionEntry>
  │  ◄── 200 + mcp-session-id ─────────│   │   │        SessionEntry = { transport, lastActivity }
  │                                     │   │   └── NO:  400 "Bad Request"
  │                                     │
  ├─ POST /mcp + mcp-session-id ───────►│ UUID format validation
  │  { method: "tools/call", ... }      │   ├── sessions.has(sid)? → update lastActivity
  │  ◄── 200 { result } ───────────────│   └── NO: 400 "Invalid session"
  │                                     │
  ├─ GET /mcp + mcp-session-id ────────►│ SSE stream for active session
  │  ◄── text/event-stream ────────────│
  │                                     │
  ├─ DELETE /mcp + mcp-session-id ─────►│ transport.close() + sessions.delete(sid)
  │  ◄── 204 ──────────────────────────│
  │                                     │
  └─ GET /health ──────────────────────►│ { status, timestamp, activeSessions }
     ◄── 200 ──────────────────────────│   (no auth required)

  Background: cleanup interval every 60s removes sessions idle > SESSION_TIMEOUT_MS
  Shutdown:   SIGTERM → closeAllSessions() → close HTTP server (30s force timeout)
  Returns:    TransportHandle { closeAllSessions(), close() }
```

### Tool Call Flow Example

```
Claude Code                mal-mcp-hub               SQLiteAdapter / Firestore
    │                          │                              │
    ├── tools/call ───────────►│                              │
    │   mal_list_skills        │                              │
    │   { category: "devops" } │                              │
    │                          ├── buildQueryOptions(args) ──►│
    │                          │   { filters: {category:      │
    │                          │     "devops"}, limit: 20 }   │
    │                          │                              │
    │                          ├── db.list<SkillEntry>() ────►│
    │                          │                              ├── SELECT * FROM skills
    │                          │                              │   WHERE category = ?
    │                          │                              │   ORDER BY updated_at DESC
    │                          │                              │   LIMIT 20 OFFSET 0
    │                          │◄── PaginatedResult ──────────┤
    │                          │                              │
    │                          ├── formatAsMarkdown()         │
    │  ◄── { content: [{      │                              │
    │       type: "text",      │                              │
    │       text: "## Skills   │                              │
    │       ..." }] }          │                              │
```

## Complete Tool Map (22 tools)

### registry.ts (7 tools)

| Tool | Action | Annotations |
|------|--------|-------------|
| `mal_list_skills` | List skills with filters | `readOnlyHint: true` |
| `mal_get_skill` | Get skill detail + asset content | `readOnlyHint: true` |
| `mal_register_skill` | Register new skill + SKILL.md | `destructiveHint: false` |
| `mal_update_skill` | Update skill metadata/content | `destructiveHint: false` |
| `mal_delete_skill` | Delete skill + asset (irreversible) | `destructiveHint: true` |
| `mal_list_mcps` | List downstream MCP servers | `readOnlyHint: true` |
| `mal_register_mcp` | Register external MCP server | `destructiveHint: false` |

### skills.ts (2 tools)

| Tool | Action | Annotations |
|------|--------|-------------|
| `mal_search_skills` | Full-text search in skills | `readOnlyHint: true` |
| `mal_get_skill_content` | Get raw SKILL.md asset content | `readOnlyHint: true` |

### commands.ts (4 tools)

| Tool | Action | Annotations |
|------|--------|-------------|
| `mal_list_commands` | List commands with filters | `readOnlyHint: true` |
| `mal_get_command` | Get command detail | `readOnlyHint: true` |
| `mal_register_command` | Register new command | `destructiveHint: false` |
| `mal_execute_command` | Execute command (shell script) | `destructiveHint: true` |

### subagents.ts (3 tools)

| Tool | Action | Annotations |
|------|--------|-------------|
| `mal_list_subagents` | List subagent configs | `readOnlyHint: true` |
| `mal_get_subagent` | Get subagent detail | `readOnlyHint: true` |
| `mal_register_subagent` | Register new subagent config | `destructiveHint: false` |

### mcp-proxy.ts (2 tools)

| Tool | Action | Annotations |
|------|--------|-------------|
| `mal_proxy_mcp_call` | Proxy call to downstream MCP | `openWorldHint: true` |
| `mal_health_check` | Check downstream MCP health | `readOnlyHint: true` |

### meta.ts (4 tools)

| Tool | Action | Annotations |
|------|--------|-------------|
| `mal_search_catalog` | Full-text search across all collections | `readOnlyHint: true` |
| `mal_export_catalog` | Export entire catalog as JSON | `readOnlyHint: true` |
| `mal_import_catalog` | Import catalog from JSON (merge) | `destructiveHint: true` |
| `mal_get_usage_stats` | Catalog totals and usage stats | `readOnlyHint: true` |

## Data Model

### Collections

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   skills     │  │  commands    │  │  subagents   │  │    mcps      │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ id           │  │ id           │  │ id           │  │ id           │
│ name         │  │ name         │  │ name         │  │ name         │
│ description  │  │ description  │  │ description  │  │ description  │
│ version      │  │ category     │  │ system_prompt│  │ transport    │
│ category     │  │ shell        │  │ model        │  │ endpoint_url │
│ trigger_     │  │ script_      │  │ tools_allowed│  │ command      │
│   patterns[] │  │   template   │  │ max_turns    │  │ args[]       │
│ asset_path   │  │ parameters[] │  │ input_schema │  │ env_vars{}   │
│ dependencies │  │ requires_    │  │ output_format│  │ health_check │
│ author       │  │   confirm    │  │ author       │  │ status       │
│ tags[]       │  │ author       │  │ tags[]       │  │ tools_exposed│
│ created_at   │  │ tags[]       │  │ created_at   │  │ author       │
│ updated_at   │  │ created_at   │  │ updated_at   │  │ created_at   │
└──────────────┘  │ updated_at   │  └──────────────┘  │ updated_at   │
                  └──────────────┘                    └──────────────┘

┌──────────────┐  ┌─────────────────────────────────────────────────┐
│  usage_log   │  │ catalog_fts (FTS5 virtual table — SQLite only)  │
├──────────────┤  ├─────────────────────────────────────────────────┤
│ id (auto)    │  │ id, name, description, tags, collection         │
│ tool_name    │  │ tokenize='porter unicode61'                     │
│ resource_id  │  └─────────────────────────────────────────────────┘
│ user_key     │  Firestore uses search_tokens array field with
│ timestamp    │  array-contains-any queries instead.
│ duration_ms  │
│ success      │
└──────────────┘
```

### SQLite Schema (on-premise)

Located at `on-premise/data/schema.sql`: 5 tables (skills, commands, subagents, mcps, usage_log) + 1 FTS5 virtual table (catalog_fts) + 2 indexes on usage_log.

Key SQLite details:
- Booleans stored as INTEGER (0/1) — `serializeValue()` handles conversion
- Arrays/objects stored as JSON strings — `deserializeRow()` auto-parses
- FTS5 with porter unicode61 tokenizer for full-text search
- WAL mode + foreign keys enabled on connection

### Firestore Schema (nube)

Same collections, but:
- `search_tokens` array field auto-generated from name/description/tags
- Search uses `array-contains-any` queries (no FTS5 equivalent)
- Native array/object storage (no serialization needed)
- Database ID configurable via `FIRESTORE_DATABASE_ID` env (default: `mal-catalog`)
- 7 composite indexes defined in `terraform/firestore.tf` (category + updated_at, search_tokens + updated_at per collection)
- Daily backup with 7-day retention
- `deletion_protection_enabled = true` on database resource

## Tool Registration Pattern

All 22 tools use `server.registerTool()` (not the deprecated `server.tool()`) with config objects:

```typescript
server.registerTool("mal_tool_name", {
  title: "Human-readable Title",
  description: "What this tool does — detailed for LLM discoverability",
  annotations: { readOnlyHint: true },  // or destructiveHint, openWorldHint
  inputSchema: {
    param: z.string().describe("Parameter description for the LLM"),
    optional_param: z.number().optional().describe("Optional parameter"),
  },
}, async (args) => {
  try {
    // ... business logic
    return { content: [{ type: "text" as const, text: "markdown result" }] };
  } catch (error) {
    return handleToolError(error, "mal_tool_name");
  }
});
```

## GCP Infrastructure (nube/)

### Terraform Resources

Spread across 4 Terraform files with 10 variables and 7 outputs:

```
┌──────────────────────────────────────────────────────────────┐
│                       GCP Project                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Cloud Run    │  │ Firestore    │  │ Secret Manager    │  │
│  │ mal-mcp-hub  │  │ (native)     │  │ API_KEY secret    │  │
│  │ 0→10 inst.   │  │ DB: mal-     │  │ (named JSON obj)  │  │
│  │ 512Mi/1CPU   │  │  catalog     │  │                   │  │
│  │ VPC egress   │  │ 7 indexes    │  │                   │  │
│  └──────────────┘  │ daily backup │  └───────────────────┘  │
│                    │ delete prot. │                          │
│  ┌──────────────┐  └──────────────┘  ┌───────────────────┐  │
│  │ VPC Access   │                    │ Cloud Build       │  │
│  │ Connector    │  ┌──────────────┐  │ + vuln scan       │  │
│  │ 10.8.0.0/28  │  │ Artifact    │  │ + smoke test      │  │
│  └──────────────┘  │ Registry    │  │ + auto rollback   │  │
│                    └──────────────┘  └───────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ GCS Bucket   │  │ Monitoring  │  │ Cloud Armor       │  │
│  │ mal-assets   │  │ uptime chk  │  │ (optional WAF)    │  │
│  │ (SKILL.md)   │  │ 3 alerts    │  │ 100 req/min/IP    │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ IAM: mal-mcp-hub-sa                                   │   │
│  │ roles: datastore.user, storage.objectAdmin,           │   │
│  │ secretmanager.secretAccessor                          │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Terraform Files

| File | Resources |
|------|-----------|
| `main.tf` | Service account, Firestore DB (delete protection), GCS bucket, Secret Manager, Artifact Registry, VPC connector, Cloud Run (with new env vars) |
| `firestore.tf` | 7 composite indexes (category + updated_at, search_tokens per collection) + daily backup (7-day retention) |
| `monitoring.tf` | Email notification channel, /health uptime check (60s), error rate >5% alert, p95 latency >5s alert, max instances alert |
| `cloud-armor.tf` | Conditional WAF (`var.enable_cloud_armor`): 100 req/min rate limit per IP, 5-min ban |
| `variables.tf` | 10 variables: `project_id`, `region`, `min/max_instances`, `alert_email`, `enable_cloud_armor`, `session_timeout_ms`, `max_sessions`, `cors_origins`, `firestore_database_id` |
| `outputs.tf` | 7 outputs: `cloud_run_url`, `cloud_run_service_name`, `service_account_email`, `gcs_bucket_name`, `firestore_database_name`, `vpc_connector_name`, `artifact_registry_url` |
| `dev.tfvars` | Scale-to-zero, 3 max instances, no alerts, no Cloud Armor |
| `prod.tfvars` | 1 min instance, 10 max, email alerts, Cloud Armor enabled |

### CI/CD Pipeline (`cloudbuild.yaml`)

```
npm ci → build → test → docker build → vuln scan → push → deploy → smoke test
  1       2       3        4              5          6       7          8
                                                                   ↓ (fail)
                                                              auto rollback
```

Steps 5 (vulnerability scan) uses `gcloud artifacts docker images scan`.
Step 8 (smoke test) curls `/health` on the deployed Cloud Run URL; on failure, sets traffic to 0% for the latest revision.

### Dockerfile (Multi-stage, Hardened)

```
Stage 1 (builder):  node:20.11-slim → npm ci → npm run build
Stage 2 (runtime):  node:20.11-slim → addgroup/adduser app → npm ci --omit=dev
                    → COPY --chown=app:app dist/ → USER app
                    → HEALTHCHECK (curl /health every 30s)
                    → CMD ["node", "dist/index.js"]
```

### Docker Compose (Local Development)

```
docker-compose.yml
├── firestore-emulator (:8080)   ← google/cloud-sdk + gcloud beta emulators
├── gcs-emulator (:4443)         ← fsouza/fake-gcs-server
└── app (:3000)                  ← mal-mcp-hub (connects via FIRESTORE_EMULATOR_HOST,
                                   STORAGE_EMULATOR_HOST env vars)
```

Run with `npm run dev:local`. Tests against emulators: `npm run test:integration`.

## Claude Code Connection Configuration

### Option A: `claude mcp add` (recommended, one command)

Run from a **regular terminal** (not inside Claude Code):

**Project scope** (only available when Claude Code is opened in the project folder):
```bash
cd /Users/A1064331/Desktop/pruebas/MCP/v001
claude mcp add mal-mcp-hub -s project -e TRANSPORT=stdio -e SQLITE_PATH=./data/catalog.db -e ASSETS_PATH=./data/assets -- node /Users/A1064331/Desktop/pruebas/MCP/v001/on-premise/dist/index.js
```

**User scope** (available globally from any folder — use absolute paths):
```bash
claude mcp add mal-mcp-hub -s user -e TRANSPORT=stdio -e SQLITE_PATH=/Users/A1064331/Desktop/pruebas/MCP/v001/on-premise/data/catalog.db -e ASSETS_PATH=/Users/A1064331/Desktop/pruebas/MCP/v001/on-premise/data/assets -- node /Users/A1064331/Desktop/pruebas/MCP/v001/on-premise/dist/index.js
```

Then restart Claude Code (`claude` in terminal). Run `/mcp` to verify it appears.

### Option B: on-premise stdio (manual config in `~/.claude.json`)

```json
{
  "mcpServers": {
    "mal-mcp-hub": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/Users/A1064331/Desktop/pruebas/MCP/v001/on-premise",
      "env": {
        "TRANSPORT": "stdio",
        "SQLITE_PATH": "./data/catalog.db",
        "ASSETS_PATH": "./data/assets"
      }
    }
  }
}
```

### Option C: on-premise HTTP (requires server running in separate terminal)

Start server:
```bash
cd on-premise
API_KEY=<your-key> TRANSPORT=http SQLITE_PATH=./data/catalog.db ASSETS_PATH=./data/assets node dist/index.js
```

Claude Code config:
```json
{
  "mcpServers": {
    "mal-mcp-hub": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp",
      "headers": { "x-api-key": "<your-key>" }
    }
  }
}
```

### Option D: nube — Cloud Run (requires GCP deployment)

```json
{
  "mcpServers": {
    "mal-mcp-hub": {
      "type": "http",
      "url": "https://mal-mcp-hub-<hash>.run.app/mcp",
      "headers": { "x-api-key": "<secret-manager-api-key>" }
    }
  }
}
```

## Manual Testing (HTTP mode with curl)

Verified working flow (2026-02-07):

```bash
# 1. Start server (Terminal 1)
cd on-premise
API_KEY=test123 TRANSPORT=http SQLITE_PATH=./data/catalog.db ASSETS_PATH=./data/assets node dist/index.js

# 2. Health check (Terminal 2) — no auth required
curl http://127.0.0.1:3000/health

# 3. Initialize session (note: Accept header required for Streamable HTTP)
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: test123" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
# → Response includes mcp-session-id header

# 4. List tools (use session ID from step 3)
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: test123" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 5. Call a tool
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: test123" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"mal_list_skills","arguments":{}}}'

# 6. Close session
curl -X DELETE http://127.0.0.1:3000/mcp \
  -H "x-api-key: test123" \
  -H "mcp-session-id: <SESSION_ID>"
```

Important: The `Accept: application/json, text/event-stream` header is **required** by the MCP Streamable HTTP spec. Without it, the server returns 406 Not Acceptable.

## nube/ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIRESTORE_PROJECT` | Yes | — | GCP project ID for Firestore |
| `GCS_BUCKET` | Yes | — | Cloud Storage bucket name |
| `GCP_PROJECT_ID` | Yes | — | GCP project ID for Secret Manager |
| `TRANSPORT` | No | `http` | Transport mode: `http` or `stdio` |
| `PORT` | No | `3000` | HTTP server port |
| `HOST` | No | `0.0.0.0` | HTTP bind address |
| `FIRESTORE_DATABASE_ID` | No | `mal-catalog` | Firestore database name |
| `SESSION_TIMEOUT_MS` | No | `1800000` | Session idle timeout (30 min) |
| `MAX_SESSIONS` | No | `100` | Max concurrent MCP sessions |
| `CORS_ORIGINS` | No | `""` | Comma-separated allowed CORS origins |
| `SECRET_CACHE_TTL_MS` | No | `300000` | Secret Manager cache TTL (5 min) |
| `GCS_MAX_FILE_SIZE` | No | `10485760` | Max file read size (10MB) |
| `LOG_LEVEL` | No | `info` | pino log level |
| `NODE_ENV` | No | `production` | Node environment |

## nube/ API Key Management

### Key Format in Secret Manager

The `API_KEY` secret in Secret Manager supports 4 formats, parsed by `parseApiKeys()` in `auth.ts`:

| Format | Example | Use Case |
|--------|---------|----------|
| Named keys (recommended) | `{"alice": "key-xxx", "bob": "key-yyy"}` | Multi-user with identity tracking |
| JSON array | `["key1", "key2"]` | Multi-key without identity |
| Comma-separated | `key1,key2,key3` | Simple multi-key |
| Single key | `mykey123` | Single user |

Named keys (format 1) are recommended because they:
- Attach `apiKeyOwner` to each request for audit logging (`logger.info({ user: "alice" })`)
- Enable per-user key rotation without affecting others
- Make it clear who is using the system in logs

### manage-keys.ts CLI

```bash
cd nube
npm run keys -- list             # List all keys (masked: first 8 + last 4 chars)
npm run keys -- add <name>       # Generate and add a new key (mal_<24 bytes base64url>)
npm run keys -- show <name>      # Show full key for a user
npm run keys -- remove <name>    # Revoke a user's key
```

Requires: `GCP_PROJECT_ID` env var + `gcloud` auth. Reads/writes the `API_KEY` secret in Secret Manager as a JSON object.

### Auth Flow

```
Request → x-api-key header → rate limit check (10 failures/min/IP)
  → max key length (256 chars) → parseApiKeys(secret) → timingSafeCompare()
  → match? → set req.apiKeyOwner = matched.name → log identity → next()
  → no match? → recordFailure(ip) → 403
```

## nube/ Dependencies

Production: `@modelcontextprotocol/sdk`, `express`, `zod`, `pino`, `@google-cloud/firestore`, `@google-cloud/storage`, `@google-cloud/secret-manager`, `helmet`, `cors`

Dev: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`, `vitest`, `eslint`, `@modelcontextprotocol/inspector`

## Known Fixes & Gotchas

1. **SQLite boolean binding** — SQLite cannot bind JavaScript booleans. `SQLiteAdapter.serializeValue()` converts `true/false → 1/0`. Always use this method when inserting/updating.

2. **McpErrorResponse index signature** — MCP SDK requires `[key: string]: unknown` on tool return types. The `McpErrorResponse` interface includes this.

3. **formatter.ts unknown casts** — Record values from generic `<T>` types are `unknown`. Use `String()` wrappers when accessing `item.id`, `item.name`, `item.description`.

4. **`isInitializeRequest` import** — Correct path is `@modelcontextprotocol/sdk/types.js` (not `protocol.js`).

5. **Logger on stderr** — pino writes to stderr to avoid corrupting stdio JSON-RPC transport. Never use `console.log` for stdio mode.

6. **ESM imports** — All imports must use `.js` extension (`import { foo } from "./bar.js"`), even for TypeScript files. This is required by `"module": "Node16"`.

7. **HTTP Accept header** — MCP Streamable HTTP transport requires `Accept: application/json, text/event-stream`. Without it, the server returns `406 Not Acceptable`.

8. **Auth header name** — The auth middleware checks `x-api-key` header (not `Authorization: Bearer`). Must match in Claude Code config and curl calls.

9. **Firestore search total count** (fixed) — Previously `search()` returned `total: items.length` (page count, not real total). Now uses `searchQuery.count().get()` for accurate total. Same fix applied to `list()` which now counts on the filtered query.

10. **Auth timing attacks** (fixed) — Auth comparison uses `crypto.timingSafeEqual()` instead of `===`. `parseApiKeys()` supports 4 formats: named JSON object (recommended: `{"alice": "key-xxx"}`), JSON array, comma-separated, or single key. Named keys attach `apiKeyOwner` to the request for audit logging.

11. **Session memory leaks** (fixed) — HTTP transport now tracks `lastActivity` per session, runs cleanup every 60s, enforces `MAX_SESSIONS` limit (503 on overflow), and provides `TransportHandle.closeAllSessions()` for graceful shutdown.

12. **GCS retries** — `GCSAdapter` retries on 429/500/503 with exponential backoff (3 attempts). Also validates file size before download (`GCS_MAX_FILE_SIZE` env, default 10MB).

13. **Secret Manager timeout** — `SecretManagerAdapter.get()` has 10s timeout via `Promise.race`. Cache TTL is configurable via `SECRET_CACHE_TTL_MS` env.

14. **Firestore mock chain in tests** — Mock must provide `count()` at every level of the query chain (after `where()`, after `orderBy()`), not just on the collection root. See `buildQuery()` pattern in test files.

15. **Dockerfile non-root** — nube/ Dockerfile runs as `app` user. All files must be `chown`ed to `app:app` before `USER app` directive.

16. **`langchain-mcp-adapters` 0.1.0+ context manager removed** (fixed) — As of `langchain-mcp-adapters` 0.1.0, `MultiServerMCPClient` can no longer be used as an async context manager (`async with`). Calling `__aenter__()` or `__aexit__()` raises `NotImplementedError`. Instead, create the client directly and call `await client.get_tools()`. No explicit close is needed — each tool call opens its own session. See `front/backend/app/mcp/client.py`.

17. **LangGraph `on_tool_start` event contains non-serializable `ToolRuntime`** (fixed) — When streaming via `agent.astream_events()`, the `on_tool_start` event's `data.input` dict includes a `runtime` key containing a `ToolRuntime` object with internal LangGraph state (messages, config, callbacks, etc.). This is not JSON-serializable. The WebSocket chat handler in `front/backend/app/api/chat.py` filters out internal keys (`runtime`, `config`, `callbacks`, `store`, `context`) before serializing tool arguments.

18. **LangGraph `on_chat_model_stream` content types** (fixed) — The `chunk.content` in `on_chat_model_stream` events can be a `str`, a `list` of dicts (e.g. `[{"type": "text", "text": "..."}]`), or other types depending on the model provider. The `_extract_content()` helper in `chat.py` normalizes all content types to a plain string before sending to the WebSocket client.

## Conventions

- Strict TypeScript, no `any`
- Files: kebab-case; Interfaces: PascalCase; Constants: UPPER_SNAKE
- Tool names: `mal_{action}_{resource}` (snake_case), always prefixed `mal_`
- Tool registration: always use `server.registerTool()` with `title`, `description`, `annotations`, `inputSchema`
- All inputSchema fields must have `.describe()` for LLM discoverability
- Logger: pino on stderr (stdio compatibility)
- MCP responses: markdown format with structured pagination (`{ total, count, offset, has_more, next_offset }`)
- Errors: `{ isError: true, content: [{ type: "text", text: "Error: ... Try ..." }] }`
- Git branches: `feature/mal-xxx-description`
- Conventional commits: `feat:`, `fix:`, `docs:`, `infra:`

### nube/ specific conventions

- All configurable values via env vars with sensible defaults (never hardcoded)
- Auth: timing-safe comparison, named keys (recommended), `apiKeyOwner` identity tracking, rate limit on failures
- GCS: retry with backoff on transient errors, validate file sizes
- Secrets: always add timeout, cache with configurable TTL
- HTTP transport: track session activity, enforce limits, return `TransportHandle`
- Dockerfile: non-root user, healthcheck, pinned base image
- Terraform: use tfvars for env-specific config, conditional resources via variables
- Dependencies: `helmet` for security headers, `cors` for CORS, `@types/cors` for types

### front/ specific conventions

- Python: PEP 8, type hints, Pydantic v2 models, async/await throughout
- TypeScript: strict mode, path aliases (`@/`), Tailwind utility classes
- Components: functional, hooks-based, no class components
- State: React Query for server state (dashboard), useState/useRef for local state (chat)
- Styling: Tailwind CSS with custom `mal-*` color palette, shadcn-style UI components
- WebSocket: `useChat` hook manages streaming state machine (token/tool_call/tool_result/done)
- REST: React Query with 30s stale time, auto-refetch for health (30s) and stats (60s)
- MCP client: `MultiServerMCPClient` with `streamable_http` transport, no context manager
- Agent: LangGraph `StateGraph` with 2 nodes (`call_model` + `ToolNode`), conditional edges
- Streaming: `agent.astream_events(version="v2")` for real-time token + tool call delivery
- Internal LangGraph keys (`runtime`, `config`, `callbacks`, `store`, `context`) must be filtered from `on_tool_start` events before JSON serialization

## Test Status

- **on-premise**: 10/10 tests passing (vitest)
  - `sqlite.adapter.test.ts` — 6 tests (ping, CRUD, pagination, delete, null handling)
  - `registry.test.ts` — 2 tests (tool registration, full CRUD flow)
  - `commands.test.ts` — 2 tests (create/retrieve, list with filters)
- **nube**: 25/25 tests passing (vitest)
  - `firestore.adapter.test.ts` — 9 tests (CRUD, pagination, update, delete, custom DB ID)
  - `auth.test.ts` — 11 tests (parseApiKeys 4 formats, valid/invalid key, missing header, multi-key comma + JSON array, named keys + apiKeyOwner, max length)
  - `commands.test.ts` — 2 tests (create/retrieve, list with filters)
  - `http.test.ts` — 2 tests (server startup, graceful shutdown)
  - `registry.test.ts` — 1 test (tool registration)
- **front/backend**: 3/3 tests passing (pytest)
  - `test_agent.py` — 2 tests (graph compilation, system prompt content)
  - `test_api.py` — 1 test (health endpoint with mocked MCP)
- **front/frontend**: TypeScript strict + Vite build — 0 errors
- **front/ E2E** (13/13 automated test suite passing):
  - MCP server (:3000) → health ok, 22 tools loaded
  - Backend (:8000) → mcp:online, agent:ready, tools_count:22
  - REST: GET /api/catalog/skills, /commands, /subagents, /mcps → all return data
  - REST: GET /api/stats → catalog totals correct
  - WebSocket chat with real GPT-4o → 4/4 scenarios passed:
    - "Lista todos los skills" → `mal_list_skills` → markdown table (2.2s)
    - "Check server health" → `mal_health_check` → health report (2.5s)
    - "Search catalog for prueba" → `mal_search_catalog` → search results (2.4s)
    - "Dame las estadísticas" → `mal_get_usage_stats` → usage stats (1.8s)
  - Frontend (:5173) → serves HTML, Vite proxies /api and /ws to backend

## Roadmap: Team Collaboration Platform

### Vision

MAL MCP Hub evolves from a tool catalog into a **team collaboration and work management platform**. Every interaction between team members and Claude Code is captured, analyzed, and made searchable. Sprints are managed within the MCP. Contributions are gamified. AI agents generate summaries, retrospectives, and intelligent next-step suggestions — all powered by real data, never hardcoded.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Browser (React Multi-Page App)                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐  │
│  │  Chat   │ │ Sprints  │ │Analytics │ │Leaderboard │ │ Next Steps │  │
│  │(existing│ │ (Kanban) │ │(Recharts)│ │  (Gamified)│ │ (AI Agent) │  │
│  │enhanced)│ │          │ │          │ │            │ │            │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ └─────┬──────┘  │
│       │ WS        │ REST       │ REST         │ REST         │ WS/REST │
└───────┼───────────┼────────────┼──────────────┼──────────────┼─────────┘
        │           │            │              │              │
        ▼           ▼            ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (:8000)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  LangGraph Multi-Agent System                     │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │ Chat Agent   │  │ Interaction  │  │ Sprint       │           │  │
│  │  │ (existing)   │  │ Analyzer     │  │ Reporter     │           │  │
│  │  │ GPT-4o +     │  │ Agent        │  │ Agent        │           │  │
│  │  │ 42 MCP tools │  │ GPT-4o       │  │ GPT-4o       │           │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  │  ┌──────────────┐  ┌──────────────┐                              │  │
│  │  │ Next Steps   │  │ Contribution │                              │  │
│  │  │ Suggester    │  │ Scorer       │                              │  │
│  │  │ Agent        │  │ Agent        │                              │  │
│  │  │ GPT-4o       │  │ GPT-4o       │                              │  │
│  │  └──────────────┘  └──────────────┘                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│  ┌───────────────────────────▼───────────────────────────────────────┐  │
│  │           langchain-mcp-adapters (42 MCP tools)                   │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ Streamable HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    mal-mcp-hub (on-premise :3000)                       │
│                                                                         │
│  Existing (22 tools)              New (~20 tools)                       │
│  ┌──────────────────┐             ┌──────────────────────────────────┐  │
│  │ registry (7)     │             │ interactions (4)                 │  │
│  │ skills (2)       │             │ sprints (4)                      │  │
│  │ commands (4)     │             │ work_items (4)                   │  │
│  │ subagents (3)    │             │ team (3)                         │  │
│  │ mcp-proxy (2)    │             │ gamification (3)                 │  │
│  │ meta (4)         │             │ analytics (2)                    │  │
│  └──────────────────┘             └──────────────────────────────────┘  │
│                                                                         │
│  SQLite: 5 existing tables + 7 new tables + FTS5 updates               │
└─────────────────────────────────────────────────────────────────────────┘
```

### User Identity Strategy

Identity is extracted automatically — no auth system needed for MVP:

| Source | User Extraction | When |
|--------|----------------|------|
| Claude Code sessions | `$USER` env var + `git config user.name` | Interaction logging |
| Git commits | `git log --format='%an <%ae>'` | Commit analytics |
| MCP API calls | Named API key (`apiKeyOwner`) | Server-side tracking |
| Frontend chat | User selector (pick your name) → cookie | Chat sessions |

Team members are registered once via `mal_register_team_member` and used throughout.

### New Data Model

#### 7 New SQLite Tables

```sql
-- Team member profiles
CREATE TABLE team_members (
    id TEXT PRIMARY KEY,              -- slug: 'jorge', 'carlos'
    name TEXT NOT NULL,               -- "Jorge Polanco"
    email TEXT,                       -- git email
    avatar_url TEXT,                  -- optional
    role TEXT DEFAULT 'developer',    -- developer | lead | scrum_master | product_owner
    xp INTEGER DEFAULT 0,            -- total experience points
    level INTEGER DEFAULT 1,         -- calculated from XP
    streak_days INTEGER DEFAULT 0,   -- consecutive contribution days
    streak_last_date TEXT,           -- last contribution date
    metadata TEXT DEFAULT '{}',      -- JSON: custom fields
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Interaction sessions (conversation units)
CREATE TABLE interactions (
    id TEXT PRIMARY KEY,              -- UUID
    session_id TEXT NOT NULL,         -- groups multi-turn conversation
    user_id TEXT NOT NULL,            -- team_members.id
    source TEXT DEFAULT 'claude_code', -- claude_code | web_chat | api
    title TEXT,                       -- auto-generated or user-provided
    summary TEXT,                     -- AI-generated summary (async)
    decisions TEXT DEFAULT '[]',      -- JSON: extracted key decisions
    action_items TEXT DEFAULT '[]',   -- JSON: extracted action items
    tools_used TEXT DEFAULT '[]',     -- JSON: MCP tools invoked
    sprint_id TEXT,                   -- optional link to sprint
    work_item_id TEXT,                -- optional link to work item
    tags TEXT DEFAULT '[]',           -- JSON array
    message_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',       -- JSON: extra (model used, tokens, etc.)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Individual messages within an interaction
CREATE TABLE interaction_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id TEXT NOT NULL,      -- interactions.id
    role TEXT NOT NULL,                -- human | assistant | tool
    content TEXT NOT NULL,
    tool_calls TEXT,                   -- JSON: tool calls made
    token_count INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (interaction_id) REFERENCES interactions(id)
);

-- Sprint definitions
CREATE TABLE sprints (
    id TEXT PRIMARY KEY,              -- 'sprint-2026-w07'
    name TEXT NOT NULL,               -- "Sprint 7 — Gamification"
    goal TEXT,                        -- sprint goal
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'planned'     -- planned | active | completed | cancelled
        CHECK(status IN ('planned','active','completed','cancelled')),
    velocity INTEGER,                 -- story points completed (calculated)
    team_capacity INTEGER,            -- total story points available
    summary TEXT,                     -- AI-generated sprint summary
    retrospective TEXT,               -- AI-generated retrospective
    created_by TEXT,                  -- team_members.id
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Work items (tasks, stories, bugs — Jira-like)
CREATE TABLE work_items (
    id TEXT PRIMARY KEY,              -- 'MAL-001'
    sprint_id TEXT,                   -- optional sprint
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'task'           -- epic | story | task | bug | spike
        CHECK(type IN ('epic','story','task','bug','spike')),
    status TEXT DEFAULT 'backlog'      -- backlog | todo | in_progress | review | done | cancelled
        CHECK(status IN ('backlog','todo','in_progress','review','done','cancelled')),
    priority TEXT DEFAULT 'medium'     -- critical | high | medium | low
        CHECK(priority IN ('critical','high','medium','low')),
    story_points INTEGER,
    assignee TEXT,                     -- team_members.id
    reporter TEXT,                     -- team_members.id
    labels TEXT DEFAULT '[]',          -- JSON array
    parent_id TEXT,                    -- for sub-tasks (references work_items.id)
    due_date TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Contribution events (for gamification scoring)
CREATE TABLE contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,             -- team_members.id
    type TEXT NOT NULL                 -- commit | interaction | work_item | review | sprint | achievement
        CHECK(type IN ('commit','interaction','work_item','review','sprint','achievement')),
    reference_id TEXT,                 -- ID of related entity
    points INTEGER DEFAULT 0,          -- XP awarded
    description TEXT,                  -- human-readable
    metadata TEXT DEFAULT '{}',        -- JSON: commit_sha, lines_changed, etc.
    created_at TEXT DEFAULT (datetime('now'))
);

-- Achievement definitions + user unlocks
CREATE TABLE achievements (
    id TEXT PRIMARY KEY,               -- 'first-commit', 'sprint-champion'
    name TEXT NOT NULL,                -- "First Commit"
    description TEXT NOT NULL,         -- "Make your first commit to the project"
    icon TEXT NOT NULL,                -- emoji: "🏗️" or lucide icon name
    category TEXT DEFAULT 'general'    -- code | collaboration | agile | exploration | mastery
        CHECK(category IN ('code','collaboration','agile','exploration','mastery')),
    tier TEXT DEFAULT 'bronze'         -- bronze (10 XP) | silver (25) | gold (50) | platinum (100)
        CHECK(tier IN ('bronze','silver','gold','platinum')),
    xp_reward INTEGER DEFAULT 10,
    criteria TEXT NOT NULL DEFAULT '{}', -- JSON: machine-readable unlock conditions
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES team_members(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- Indexes
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_sprint ON interactions(sprint_id);
CREATE INDEX idx_interactions_session ON interactions(session_id);
CREATE INDEX idx_interaction_messages_interaction ON interaction_messages(interaction_id);
CREATE INDEX idx_work_items_sprint ON work_items(sprint_id);
CREATE INDEX idx_work_items_assignee ON work_items(assignee);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_contributions_user ON contributions(user_id);
CREATE INDEX idx_contributions_type ON contributions(type);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

FTS5 update — extend `catalog_fts` or create a second `interactions_fts`:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS interactions_fts USING fts5(
    id, title, summary, tags,
    content='',
    tokenize='porter unicode61'
);
```

### New MCP Tools (~20 tools, 4 new files)

#### interactions.ts (4 tools)

| Tool | Action | Key Fields |
|------|--------|------------|
| `mal_log_interaction` | Save a conversation session with messages | session_id, user_id, source, messages[], sprint_id?, work_item_id? |
| `mal_list_interactions` | Browse interactions with filters | user_id?, sprint_id?, source?, date range, limit/offset |
| `mal_get_interaction` | Get full interaction detail + messages | id → returns interaction + all messages |
| `mal_search_interactions` | Full-text search in past conversations | query, user_id?, date range |

#### sprints.ts (4 tools)

| Tool | Action | Key Fields |
|------|--------|------------|
| `mal_create_sprint` | Create a new sprint | name, goal, start_date, end_date, team_capacity? |
| `mal_list_sprints` | List sprints with filters | status?, date range, limit/offset |
| `mal_get_sprint` | Get sprint detail + work items + velocity | id → returns sprint + items + AI summary |
| `mal_update_sprint` | Update sprint status/metadata | id, status?, goal?, retrospective? |

#### work-items.ts (4 tools)

| Tool | Action | Key Fields |
|------|--------|------------|
| `mal_create_work_item` | Create a work item (task/story/bug) | title, type, priority, sprint_id?, assignee?, story_points? |
| `mal_list_work_items` | List/filter work items | sprint_id?, assignee?, status?, type?, priority? |
| `mal_get_work_item` | Get work item detail + history | id → returns item + related interactions |
| `mal_update_work_item` | Update status, assignee, points | id, status?, assignee?, completed_at? |

#### team.ts (3 tools)

| Tool | Action | Key Fields |
|------|--------|------------|
| `mal_register_team_member` | Register a team member | id, name, email?, role? |
| `mal_get_team_member` | Get profile + stats + achievements | id → returns member + XP + achievements + contribution history |
| `mal_list_team_members` | List all team members | limit/offset, sort by XP? |

#### gamification.ts (3 tools)

| Tool | Action | Key Fields |
|------|--------|------------|
| `mal_get_leaderboard` | Team rankings with XP, level, streaks | period? (week/sprint/all-time), limit |
| `mal_get_achievements` | List achievements + user's unlocked | user_id?, category? |
| `mal_log_contribution` | Record a contribution + award XP | user_id, type, reference_id, points, description |

#### analytics.ts (2 tools)

| Tool | Action | Key Fields |
|------|--------|------------|
| `mal_get_commit_activity` | Git commit data for graphs | repo_path?, days?, user_id? → returns daily counts, per-user stats |
| `mal_get_sprint_report` | Sprint analytics with AI summary | sprint_id → velocity, burndown data, completion %, AI analysis |

**Total**: 22 existing + 20 new = **42 MCP tools**

### LangGraph Multi-Agent System (4 Specialized Agents)

All agents use **GPT-4o** via `langchain-openai`, with MCP tools bound via `langchain-mcp-adapters`. Each agent is a LangGraph `StateGraph` with its own state, system prompt, and tool subset.

#### Agent 1: Interaction Analyzer

```
Trigger: After each chat session ends (or on-demand)
Input:   Raw conversation messages
Output:  Structured analysis stored back to MCP

Graph:   START → analyze → extract_decisions → extract_actions → store → END

Tools used: mal_log_interaction, mal_search_interactions, mal_get_work_item,
            mal_log_contribution
```

Responsibilities:
- Summarize conversation in 2-3 sentences
- Extract key decisions (what was decided, why, alternatives considered)
- Extract action items (what needs to happen next, who owns it)
- Identify MCP tools that were used
- Auto-link to sprints/work items if mentioned
- Award interaction XP to the user
- Tag the conversation for searchability

#### Agent 2: Sprint Reporter

```
Trigger: On-demand (user requests sprint report) or scheduled (sprint end)
Input:   Sprint ID
Output:  Sprint summary + retrospective + velocity data

Graph:   START → gather_data → analyze_velocity → generate_summary
         → generate_retro → store → END

Tools used: mal_get_sprint, mal_list_work_items, mal_list_interactions,
            mal_get_commit_activity, mal_update_sprint
```

Responsibilities:
- Calculate velocity (story points done vs planned)
- Generate burndown data points for charting
- Analyze completion rates by type (stories vs bugs vs tasks)
- Identify blockers and risks from interactions
- Generate retrospective ("What went well / What could improve / Action items")
- Compare velocity with previous sprints (trend)

#### Agent 3: Next Steps Suggester

```
Trigger: On-demand (user visits Next Steps page or asks in chat)
Input:   Current context (active sprint, user, recent activity)
Output:  Prioritized list of suggested actions with reasoning

Graph:   START → gather_context → analyze_priorities → generate_suggestions
         → rank_and_format → END

Tools used: mal_list_work_items, mal_list_sprints, mal_list_interactions,
            mal_get_commit_activity, mal_get_leaderboard
```

Responsibilities:
- Analyze open work items (what's in progress, what's blocked)
- Check sprint timeline (days remaining, points left)
- Review recent interactions (unresolved questions, pending decisions)
- Consider commit activity patterns (areas untouched, areas with high churn)
- Generate 5-10 specific, actionable suggestions with priority and reasoning
- **Not hardcoded**: Every suggestion is grounded in real data from MCP tools

#### Agent 4: Contribution Scorer

```
Trigger: After commits, interactions, work item updates
Input:   Contribution event (commit, interaction, work item completion)
Output:  XP awarded, achievements unlocked, streak updated

Graph:   START → evaluate → calculate_xp → check_achievements
         → update_profile → END

Tools used: mal_log_contribution, mal_get_team_member, mal_get_achievements,
            mal_register_team_member (update XP/level/streak)
```

XP Calculation:
- **Commit**: base 10 XP + 1 XP per 10 lines changed (cap 50 XP)
- **Interaction**: base 5 XP + 3 XP per tool used + 5 XP if decisions extracted (cap 30 XP)
- **Work item completed**: story_points × 10 XP
- **Sprint completed on time**: 50 XP bonus
- **Streak multiplier**: +10% per consecutive day (cap +70% at 7 days)

Levels (calculated from total XP):

| Level | Title | XP Required |
|-------|-------|-------------|
| 1-5 | Apprentice | 0 — 500 |
| 6-10 | Developer | 501 — 2,000 |
| 11-15 | Senior | 2,001 — 5,000 |
| 16-20 | Lead | 5,001 — 10,000 |
| 21+ | Architect | 10,001+ |

### Achievement System (Seed Data)

| ID | Name | Icon | Tier | Category | Criteria |
|----|------|------|------|----------|----------|
| `first-commit` | First Commit | 🏗️ | bronze | code | 1 commit logged |
| `ten-commits` | Consistent Coder | 💻 | silver | code | 10 commits |
| `hundred-commits` | Code Machine | ⚡ | gold | code | 100 commits |
| `first-chat` | Conversationalist | 💬 | bronze | collaboration | 1 interaction logged |
| `fifty-chats` | Knowledge Seeker | 📚 | silver | collaboration | 50 interactions |
| `tool-explorer` | Tool Explorer | 🔧 | silver | exploration | Use 10 different MCP tools |
| `tool-master` | Tool Master | 🛠️ | gold | exploration | Use all 42 MCP tools |
| `sprint-runner` | Sprint Runner | 🏃 | bronze | agile | Complete 1 sprint |
| `sprint-champion` | Sprint Champion | 🏆 | gold | agile | Lead velocity for 3 sprints |
| `bug-slayer` | Bug Slayer | 🐛 | silver | code | Close 10 bugs |
| `on-fire` | On Fire | 🔥 | gold | mastery | 7-day contribution streak |
| `unstoppable` | Unstoppable | 💎 | platinum | mastery | 30-day contribution streak |
| `decision-maker` | Decision Maker | 🎯 | silver | collaboration | 20 decisions logged |
| `architect` | Architect | 👑 | platinum | mastery | Reach level 20 |

### Frontend Evolution

The frontend grows from a 2-panel layout to a **multi-page application** with React Router:

```
┌────────────────────────────────────────────────────────────────────┐
│  MAL Hub  ●  Sprint 7 — Day 3/14           jorge ★ Lv.12  1847 XP │
│           ░░░░░░░░░░░░░░░░░▓▓▓▓▓  (72% to Lv.13)                │
├──────┬─────────────────────────────────────────────────────────────┤
│      │                                                             │
│  💬  │  Page content changes based on route:                       │
│ Chat │                                                             │
│      │  /              → Dashboard overview (activity feed,        │
│  📋  │                   sprint progress, quick stats)             │
│Sprint│                                                             │
│      │  /chat          → AI Chat (existing, enhanced with          │
│  📝  │                   context injection from past interactions) │
│Items │                                                             │
│      │  /sprint        → Sprint Board (Kanban columns:             │
│  📈  │                   Backlog → Todo → In Progress →            │
│Stats │                   Review → Done) + burndown chart           │
│      │                                                             │
│  🏆  │  /backlog       → Work Item management (create, filter,     │
│Board │                   assign, prioritize, bulk actions)         │
│      │                                                             │
│  🔮  │  /analytics     → Commit graphs, team velocity,            │
│Next  │                   contribution heatmap (Recharts)           │
│      │                                                             │
│  📚  │  /leaderboard   → Rankings, XP comparison, achievement     │
│ Hist │                   showcase, skill progression radar chart   │
│      │                                                             │
│  ⚙️  │  /next-steps    → AI-generated suggestions with            │
│Prefs │                   priority, reasoning, linked items         │
│      │                                                             │
│      │  /history       → Interaction browser with full-text        │
│      │                   search, timeline, filters                 │
│      │                                                             │
│      │  /profile/:id   → Team member profile, achievements,       │
│      │                   contribution graph, skill radar           │
│      │                                                             │
│      │  /catalog       → Existing catalog dashboard (moved)        │
│      │                                                             │
└──────┴─────────────────────────────────────────────────────────────┘
```

Key frontend additions:
- **React Router v6** for multi-page navigation
- **Recharts** for all visualizations (commit graphs, burndown, velocity, contribution heatmaps, skill radar)
- **Drag-and-drop Kanban** for sprint board (using `@dnd-kit/core`)
- **XP bar + level indicator** in header (always visible)
- **Achievement toast notifications** when badges are unlocked
- **Activity feed** on dashboard home (real-time team activity)
- **Context injection**: Chat agent automatically receives current sprint goals, open work items, and recent decisions as context
- **Explicit placeholder marking**: Any data that is demo/seed data will show a clear `[SAMPLE DATA]` badge in the UI — never silently fake real data

### Proactive Additions (My Recommendations)

These are features I recommend adding because they amplify the core vision:

#### 1. Decision Journal
Every time the Interaction Analyzer detects a key decision in a conversation, it extracts and stores it as a first-class entity in the `decisions` field. The frontend shows a searchable Decision Journal — institutional memory that new team members can browse to understand *why* things are the way they are.

#### 2. Auto-Linking
When a user mentions "sprint 7" or "MAL-042" in chat, the system automatically links the interaction to those entities. This creates a rich web of context without manual effort. The Interaction Analyzer agent handles detection and linking.

#### 3. Team Pulse (Daily/Weekly Digest)
The Sprint Reporter agent can generate automated digests:
- **Daily**: What was done yesterday, who contributed, what's blocked
- **Weekly**: Sprint progress, velocity trend, top contributors
- **Sprint end**: Full retrospective with charts

These can be surfaced in the dashboard home or sent via a future notification system.

#### 4. Context-Aware Chat
The existing chat agent gets enhanced with automatic context injection:
- Current sprint name + goal + days remaining
- Open work items assigned to the current user
- Last 3 key decisions
- Summary of the 5 most recent interactions

This makes the agent dramatically more useful — it knows the team's current state without being told.

#### 5. Skill Radar (Gamification)
Instead of just a flat leaderboard, each team member has a **skill radar chart** showing their contribution balance across areas: Frontend, Backend, DevOps, Data, Documentation. The radar is computed from commit file paths and tool usage patterns by the Contribution Scorer agent.

#### 6. Sprint Health Indicator
A real-time "sprint health" metric visible on every page:
- 🟢 **On Track**: velocity pace matches or exceeds plan
- 🟡 **At Risk**: velocity is 20%+ behind pace
- 🔴 **Behind**: velocity is 40%+ behind, or blockers unresolved >2 days

Computed by the Sprint Reporter agent from work item completion rate vs days elapsed.

### Implementation Phases

```
Phase 5: Data Foundation + Catalog Seeding  ┐
  5.1 New SQLite tables (7)                 │ MCP Server
  5.2 New MCP tools (20)                    │ (on-premise/ + nube/)
  5.3 Schema migration script               │
  5.4 Seed achievements                     │
  5.5 Seed skills (14)                      │
  5.6 Seed commands (14)                    │
  5.7 Seed subagents (5)                    │
  5.8 Register external MCPs (6)            ┘
         │
Phase 6: LangGraph Agents                  ┐
  6.1 Interaction Analyzer                  │ Python Backend
  6.2 Sprint Reporter                       │ (front/backend/)
  6.3 Next Steps Suggester                  │
  6.4 Contribution Scorer                   │
  6.5 Agent orchestration                   ┘
         │
Phase 7: Frontend — Core Pages              ┐
  7.1 React Router + layout                 │ React Frontend
  7.2 Sprint Board (Kanban)                 │ (front/frontend/)
  7.3 Work Item management                  │
  7.4 Interaction browser                   │
  7.5 Analytics (Recharts)                  ┘
         │
Phase 8: Gamification                       ┐
  8.1 XP engine + levels                    │ Backend + Frontend
  8.2 Achievement system                    │
  8.3 Leaderboard UI                        │
  8.4 Streak tracking                       │
  8.5 Profile pages + radar                 ┘
         │
Phase 9: Intelligence                       ┐
  9.1 Next Steps page                       │ Agents + Frontend
  9.2 Context-aware chat                    │
  9.3 Sprint health indicator               │
  9.4 Auto-linking                          │
  9.5 Decision journal                      │
  9.6 Team Pulse digests                    ┘
         │
Phase 10: Polish                            ┐
  10.1 Activity feed                        │ Integration
  10.2 Toast notifications                  │
  10.3 Mobile responsive                    │
  10.4 Docker Compose update                │
  10.5 CLAUDE.md final update               ┘
```

### Phase 5.5 — Catalog Seeding (Skills, Commands, Subagents, External MCPs)

The MCP hub must ship with a rich, useful catalog from day one — not an empty shell. This phase populates the hub with production-quality content for the team.

#### External MCPs to Register (6)

These are real, production-ready MCP servers the team will use through the hub's `mal_proxy_mcp_call` gateway or connect directly in Claude Code:

| ID | Name | Package | Transport | Tools | Purpose |
|----|------|---------|-----------|-------|---------|
| `context7` | Context7 | `@upstash/context7-mcp` | stdio / HTTP (`https://mcp.context7.com/mcp`) | 2 | Up-to-date library documentation lookup. `resolve-library-id` + `query-docs`. Eliminates stale LLM knowledge. |
| `playwright` | Playwright MCP | `@playwright/mcp` | stdio (default), SSE via `--port` | ~30 | Browser automation by Microsoft. Navigate, click, type, screenshot, PDF, accessibility snapshots. `--headless` for CI. |
| `github` | GitHub MCP | `ghcr.io/github/github-mcp-server` (Docker) | HTTP (`https://api.githubcopilot.com/mcp/`) or stdio | 51 | Full GitHub integration: repos, issues, PRs, code search, actions, security alerts. Needs `GITHUB_TOKEN`. |
| `memory` | Memory (Knowledge Graph) | `@modelcontextprotocol/server-memory` | stdio | 9 | Persistent knowledge graph across sessions. Create entities/relations, search nodes. Stores in local JSONL file. |
| `sequential-thinking` | Sequential Thinking | `@modelcontextprotocol/server-sequential-thinking` | stdio | 1 | Structured multi-step reasoning. Supports revision, branching, dynamic thought chains. |
| `brave-search` | Brave Search | `@brave/brave-search-mcp-server` | stdio / HTTP | 6 | Web, local, video, image, news search + AI summaries. Free tier available. Needs `BRAVE_API_KEY`. |

**Registration format** (stored via `mal_register_mcp`):

```json
{
  "id": "playwright",
  "name": "Playwright MCP",
  "description": "Browser automation by Microsoft. Navigate, click, type, screenshot, fill forms, handle dialogs. Supports Chromium, Firefox, WebKit. Use --headless for CI, --vision for coordinate-based interactions.",
  "transport": "stdio",
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless"],
  "tools_exposed": ["browser_navigate", "browser_click", "browser_type", "browser_snapshot", "browser_take_screenshot", "browser_evaluate", "browser_pdf_save"],
  "author": "Microsoft",
  "health_check_url": null
}
```

#### Skills to Seed (14)

Each skill gets a full SKILL.md asset with real content (instructions, examples, patterns). No placeholders.

**devops (3):**

| ID | Name | Description |
|----|------|-------------|
| `docker-compose-patterns` | Docker Compose Patterns | Multi-service orchestration patterns, networking, volumes, health checks, dev vs prod configs. Includes MAL-specific examples (MCP + backend + frontend). |
| `gcp-cloud-run-deploy` | GCP Cloud Run Deployment | Step-by-step Cloud Run deployment: Dockerfile, cloudbuild.yaml, IAM, VPC connector, env vars, secrets, traffic splitting, rollback. |
| `ci-cd-pipeline` | CI/CD Pipeline Guide | Cloud Build pipeline design: build → test → scan → deploy → smoke test → rollback. Includes caching, parallel steps, secret injection. |

**frontend (3):**

| ID | Name | Description |
|----|------|-------------|
| `react-patterns` | Modern React Patterns | Hooks composition, custom hooks, render props, compound components, context patterns, error boundaries, Suspense, React Query integration. |
| `tailwind-design-system` | Tailwind Design System | Design tokens, custom color palettes (`mal-*`), responsive breakpoints, component recipes (buttons, cards, badges, forms), dark mode, animation utilities. |
| `vite-optimization` | Vite Build Optimization | Code splitting, lazy routes, chunk analysis, tree shaking, asset optimization, proxy config, HMR tuning, env variable handling. |

**data (3):**

| ID | Name | Description |
|----|------|-------------|
| `mcp-tool-development` | MCP Tool Development | How to build MCP tools with `@modelcontextprotocol/sdk`: `server.registerTool()`, Zod schemas, annotations, error handling, streaming, testing with MCP Inspector. |
| `api-design-rest` | REST API Design | Resource naming, HTTP methods, pagination, filtering, error responses, versioning, OpenAPI spec, rate limiting, HATEOAS. Aligned with MAL backend patterns. |
| `sqlite-patterns` | SQLite Best Practices | WAL mode, FTS5 full-text search, JSON storage, indexes, migrations, boolean handling, connection pooling, backup strategies. MAL-specific examples. |

**document (3):**

| ID | Name | Description |
|----|------|-------------|
| `code-review-checklist` | Code Review Checklist | Security (OWASP top 10), performance, readability, testing, error handling, naming, SOLID principles. Tailored for TypeScript + Python codebases. |
| `technical-writing` | Technical Writing Standards | CLAUDE.md structure, README conventions, API docs, inline comments, architecture diagrams (Mermaid/ASCII), changelog format, decision records (ADR). |
| `sprint-planning-guide` | Sprint Planning Guide | Story point estimation (Fibonacci), capacity planning, sprint goal setting, backlog refinement, definition of done, velocity calculation, retrospective formats. |

**custom (2):**

| ID | Name | Description |
|----|------|-------------|
| `team-onboarding` | Team Onboarding | New member setup guide: repo clone, env setup, MCP connection, Claude Code config, first build, first test, team conventions, who to ask for what. |
| `git-workflow-mal` | MAL Git Workflow | Branch naming (`feature/mal-xxx`), conventional commits (`feat:`, `fix:`, `docs:`), PR templates, review process, merge strategy, release flow, hotfix process. |

#### Commands to Seed (14)

Each command has a working `script_template` with parameterized variables. No placeholders — all scripts execute real operations.

**devops (5):**

| ID | Name | Shell | Description |
|----|------|-------|-------------|
| `start-dev-stack` | Start Dev Stack | bash | Start MCP server + backend + frontend in parallel. Checks ports, kills stale processes, validates .env files. |
| `run-all-tests` | Run All Tests | bash | Run vitest (on-premise + nube) + pytest (front/backend) + tsc (front/frontend). Reports total pass/fail. |
| `health-check-all` | Health Check All | bash | Curl MCP /health, backend /api/health, frontend root. Color-coded status output. |
| `docker-build` | Docker Build | bash | Build Docker images for all services with build args, tagging, and cache optimization. |
| `deploy-cloud-run` | Deploy to Cloud Run | bash | Submit Cloud Build, wait for deploy, run smoke test, show URL. Params: `project_id`, `region`, `tag`. |

**git (4):**

| ID | Name | Shell | Description |
|----|------|-------|-------------|
| `git-log-pretty` | Pretty Git Log | bash | `git log --oneline --graph --decorate --all` with color. Params: `count` (default 20). |
| `create-feature-branch` | Create Feature Branch | bash | Creates `feature/mal-{{id}}-{{description}}` branch from latest dev. Params: `id`, `description`. |
| `git-branch-cleanup` | Clean Merged Branches | bash | List and delete local branches already merged into dev/main. Asks for confirmation. |
| `git-activity-report` | Git Activity Report | bash | Git log stats for a period: commits per author, files changed, insertions/deletions. Params: `days` (default 7). |

**database (3):**

| ID | Name | Shell | Description |
|----|------|-------|-------------|
| `sqlite-backup` | SQLite Backup | bash | Copy SQLite DB + WAL to timestamped backup file. Params: `db_path`. |
| `seed-catalog` | Seed Catalog | node | Run the seed script to populate initial catalog data. Params: `env` (dev/prod). |
| `reset-db` | Reset Database | bash | Drop and recreate all SQLite tables from schema.sql. **Destructive** — requires_confirmation: true. |

**development (2):**

| ID | Name | Shell | Description |
|----|------|-------|-------------|
| `lint-all` | Lint All Projects | bash | ESLint (on-premise + nube) + ruff/flake8 (front/backend) + tsc --noEmit (front/frontend). |
| `generate-api-docs` | Generate API Docs | bash | Extract OpenAPI schema from FastAPI and generate markdown docs. |

#### Subagents to Seed (5)

Each subagent has a real `system_prompt` tuned for its role, specific `tools_allowed`, and appropriate `max_turns`.

| ID | Name | Model | Max Turns | Tools Allowed | Description |
|----|------|-------|-----------|---------------|-------------|
| `code-reviewer` | Code Reviewer | claude-sonnet-4-5-20250929 | 10 | `mal_search_catalog`, `mal_get_skill_content` | Reviews code changes. Checks security (OWASP), performance, readability, test coverage. References team coding standards from skills catalog. |
| `sprint-planner` | Sprint Planner | claude-sonnet-4-5-20250929 | 8 | `mal_list_work_items`, `mal_get_sprint`, `mal_list_interactions` | Helps plan sprints: estimates story points, identifies dependencies, balances workload, suggests sprint goals based on backlog and velocity history. |
| `documentation-writer` | Documentation Writer | claude-sonnet-4-5-20250929 | 10 | `mal_search_catalog`, `mal_get_skill_content`, `mal_list_skills` | Generates technical documentation: CLAUDE.md updates, README files, API docs, architecture diagrams. Follows team technical-writing standards. |
| `bug-analyzer` | Bug Analyzer | claude-sonnet-4-5-20250929 | 8 | `mal_search_catalog`, `mal_search_interactions`, `mal_get_command` | Analyzes bug reports: reproduces via descriptions, identifies root causes, suggests fixes, finds related past interactions where similar issues were discussed. |
| `test-generator` | Test Generator | claude-sonnet-4-5-20250929 | 10 | `mal_search_catalog`, `mal_get_skill_content`, `mal_get_command` | Generates test cases (vitest for TS, pytest for Python). Covers happy paths, edge cases, error scenarios. References testing patterns from skills catalog. |

#### Seed Script Design

The seeding will be implemented as a script (`scripts/seed-full-catalog.ts` in on-premise/) that:

1. Checks if items already exist (skip duplicates)
2. Registers all 6 external MCPs via `mal_register_mcp`
3. Registers all 14 skills via `mal_register_skill` with real SKILL.md content
4. Registers all 14 commands via `mal_register_command` with working script_templates
5. Registers all 5 subagents via `mal_register_subagent` with tuned system_prompts
6. Seeds the 14 achievement definitions
7. Reports: `✓ 6 MCPs, 14 skills, 14 commands, 5 subagents, 14 achievements seeded`

Run via: `npm run seed:full` (on-premise) or `npm run seed:full` (nube)

**Catalog totals after seeding**: 6 MCPs + 14 skills + 14 commands + 5 subagents + 14 achievements = **53 catalog entries**

### New Dependencies

**MCP Server (on-premise/nube)**: No new dependencies — uses existing SQLite/Firestore + Zod.

**Python Backend (front/backend)**:
```
# New
langgraph-checkpoint>=2.0.0     # Agent memory/checkpointing (InMemorySaver)
simple-git>=0.1.0               # or GitPython — for git log parsing
apscheduler>=3.10.0             # Scheduled agent runs (Team Pulse, achievement checks)
```

**React Frontend (front/frontend)**:
```
# New
react-router-dom@^6             # Multi-page routing
recharts@^2.12                  # Charts (commit graphs, burndown, velocity, radar)
@dnd-kit/core@^6                # Drag-and-drop for Kanban board
@dnd-kit/sortable@^8            # Sortable items in Kanban columns
date-fns@^3                     # Date formatting and manipulation
react-hot-toast@^2              # Toast notifications for achievements
framer-motion@^11               # Animations (XP bar, achievement unlocks, transitions)
```

### New Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GIT_REPO_PATH` | No | `.` | Path to git repo for commit analytics |
| `ACHIEVEMENT_CHECK_INTERVAL` | No | `300` | Seconds between achievement check runs |
| `TEAM_PULSE_ENABLED` | No | `false` | Enable daily/weekly digest generation |
| `CONTEXT_INJECTION_ENABLED` | No | `true` | Inject sprint/items context into chat agent |

