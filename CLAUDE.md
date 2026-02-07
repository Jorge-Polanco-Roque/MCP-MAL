# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mal-mcp-hub** is a centralized MCP (Model Context Protocol) server by Monterrey Agentic Labs (MAL). It serves as a library of commands, skills, subagents, and a gateway to downstream MCPs, connected to Claude Code. Built with TypeScript + Node.js, MCP SDK `^1.12.0`.

## Repository Structure

The project is split into two independent, self-contained folders:

- **`on-premise/`** — Local deployment path (SQLite + filesystem + .env)
- **`nube/`** — GCP Cloud deployment path (Firestore + GCS + Secret Manager + Cloud Run)

Both share identical business logic code (`src/tools/`, `src/schemas/`, `src/utils/`, `src/types.ts`, `src/server.ts`, `src/transport/`). They differ only in service adapters (`src/services/local/` vs `src/services/gcp/`) and entry point wiring (`src/index.ts`).

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
└── nube/                          ← GCP Cloud deployment
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile                 ← multi-stage build
    ├── cloudbuild.yaml            ← CI/CD pipeline
    ├── src/
    │   ├── index.ts               ← entry point (Firestore + GCS + SecretManager)
    │   ├── server.ts              ← same as on-premise
    │   ├── tools/                 ← same 6 files as on-premise
    │   ├── schemas/               ← same as on-premise
    │   ├── services/
    │   │   └── gcp/
    │   │       ├── firestore.adapter.ts     ← search_tokens + array-contains-any
    │   │       ├── gcs.adapter.ts           ← signed URLs
    │   │       └── secret-manager.adapter.ts ← 5-min cache
    │   ├── transport/             ← same as on-premise
    │   └── utils/                 ← same as on-premise
    ├── tests/
    │   ├── services/firestore.adapter.test.ts  ← 5 tests
    │   └── tools/registry.test.ts              ← 1 test
    └── terraform/
        └── main.tf               ← Cloud Run, Firestore, GCS, Secret Manager, Artifact Registry
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
npm run start:gcp          # HTTP transport (Cloud Run)
npm test                   # vitest run  (6 tests, all passing)
npm run lint               # eslint src/
npm run seed               # Seed Firestore catalog
```

## Architecture

### High-Level Diagram

```
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
- **`IStorage`** (`storage.ts`) — Read/write/list/delete/exists assets. Implemented by `FilesystemAdapter` (on-premise) and `GCSAdapter` (nube).
- **`ISecrets`** (`secrets.ts`) — Key/value secret access. Implemented by `DotenvAdapter` (on-premise) and `SecretManagerAdapter` (nube).

```
IDatabase                          IStorage                    ISecrets
├── get<T>(col, id)                ├── read(path)              ├── get(key)
├── list<T>(col, opts?)            ├── write(path, content)    └── (single method)
├── create<T>(col, id, data)       ├── delete(path)
├── update<T>(col, id, data)       ├── list(prefix)
├── delete(col, id)                └── exists(path)
├── search<T>(col, query, opts?)
└── ping()
```

### Entry Point Flow (`src/index.ts`)

```
main()
  │
  ├── Create adapters
  │   ├── on-premise: SQLiteAdapter + FilesystemAdapter + DotenvAdapter
  │   └── nube:       FirestoreAdapter + GCSAdapter + SecretManagerAdapter
  │
  ├── db.ping() → verify connectivity
  │
  └── TRANSPORT env var?
      │
      ├── "http" → startHttpTransport(createServer, options)
      │             Factory pattern: each session → new McpServer instance
      │
      └── "stdio" (default on-premise)
                    Single McpServer + registerAllTools() + StdioServerTransport
```

### HTTP Transport — Session Management

The HTTP transport (`src/transport/http.ts`) implements MCP spec-compliant session management:

```
Client                              Server (Express)
  │                                     │
  ├─ POST /mcp (no session-id) ────────►│ isInitializeRequest(body)?
  │  { method: "initialize" }           │   ├── YES: Create StreamableHTTPServerTransport
  │                                     │   │        sessionIdGenerator: randomUUID()
  │                                     │   │        Create fresh McpServer via factory
  │                                     │   │        registerAllTools(server, services)
  │                                     │   │        server.connect(transport)
  │  ◄── 200 + mcp-session-id ─────────│   │        Store in Map<sid, transport>
  │                                     │   └── NO:  400 "Bad Request"
  │                                     │
  ├─ POST /mcp + mcp-session-id ───────►│ transports.has(sessionId)?
  │  { method: "tools/call", ... }      │   ├── YES: transport.handleRequest(req, res, body)
  │  ◄── 200 { result } ───────────────│   └── NO:  400 "Invalid session"
  │                                     │
  ├─ GET /mcp + mcp-session-id ────────►│ SSE stream for active session
  │  ◄── text/event-stream ────────────│
  │                                     │
  ├─ DELETE /mcp + mcp-session-id ─────►│ transport.close() + transports.delete(sid)
  │  ◄── 204 ──────────────────────────│
  │                                     │
  └─ GET /health ──────────────────────►│ { status, timestamp, activeSessions }
     ◄── 200 ──────────────────────────│   (no auth required)
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

### Terraform Resources (`terraform/main.tf`)

```
┌─────────────────────────────────────────────────────────┐
│                    GCP Project                          │
│                                                         │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Cloud Run    │  │ Firestore │  │ Secret Manager  │  │
│  │ mal-mcp-hub  │  │ (native)  │  │ MCP_API_KEY     │  │
│  │ 0→10 inst.   │  │           │  │ GCP_SA_KEY      │  │
│  │ 512Mi/1CPU   │  │           │  │ ...             │  │
│  └──────┬───────┘  └───────────┘  └─────────────────┘  │
│         │                                               │
│  ┌──────▼───────┐  ┌───────────────────────────────┐    │
│  │ Artifact     │  │ Cloud Build                   │    │
│  │ Registry     │  │ npm ci → build → test →       │    │
│  │ docker repo  │  │ docker build → push → deploy  │    │
│  └──────────────┘  └───────────────────────────────┘    │
│                                                         │
│  ┌──────────────┐  ┌───────────────────────────────┐    │
│  │ GCS Bucket   │  │ IAM Service Account           │    │
│  │ mal-assets   │  │ mal-mcp-hub-sa               │    │
│  │ (SKILL.md)   │  │ roles: run.invoker,           │    │
│  └──────────────┘  │ datastore.user, storage.admin │    │
│                    └───────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline (`cloudbuild.yaml`)

```
npm ci → npm run build → npm test → docker build → docker push → gcloud run deploy
  1         2               3           4              5              6
```

### Dockerfile (Multi-stage)

```
Stage 1 (builder):  node:20-slim → npm ci → npm run build
Stage 2 (runtime):  node:20-slim → npm ci --omit=dev → COPY dist/ → node dist/index.js
```

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

## Known Fixes & Gotchas

1. **SQLite boolean binding** — SQLite cannot bind JavaScript booleans. `SQLiteAdapter.serializeValue()` converts `true/false → 1/0`. Always use this method when inserting/updating.

2. **McpErrorResponse index signature** — MCP SDK requires `[key: string]: unknown` on tool return types. The `McpErrorResponse` interface includes this.

3. **formatter.ts unknown casts** — Record values from generic `<T>` types are `unknown`. Use `String()` wrappers when accessing `item.id`, `item.name`, `item.description`.

4. **`isInitializeRequest` import** — Correct path is `@modelcontextprotocol/sdk/types.js` (not `protocol.js`).

5. **Logger on stderr** — pino writes to stderr to avoid corrupting stdio JSON-RPC transport. Never use `console.log` for stdio mode.

6. **ESM imports** — All imports must use `.js` extension (`import { foo } from "./bar.js"`), even for TypeScript files. This is required by `"module": "Node16"`.

7. **HTTP Accept header** — MCP Streamable HTTP transport requires `Accept: application/json, text/event-stream`. Without it, the server returns `406 Not Acceptable`.

8. **Auth header name** — The auth middleware checks `x-api-key` header (not `Authorization: Bearer`). Must match in Claude Code config and curl calls.

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

## Test Status

- **on-premise**: 10/10 tests passing (vitest)
  - `sqlite.adapter.test.ts` — 6 tests (ping, CRUD, pagination, delete, null handling)
  - `registry.test.ts` — 2 tests (tool registration, full CRUD flow)
  - `commands.test.ts` — 2 tests (create/retrieve, list with filters)
- **nube**: 6/6 tests passing (vitest)
  - `firestore.adapter.test.ts` — 5 tests (full Firestore mock)
  - `registry.test.ts` — 1 test (GCP service mocks)
