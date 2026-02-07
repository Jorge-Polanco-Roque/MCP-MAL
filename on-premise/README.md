# mal-mcp-hub — On-Premise (Local)

MCP Server centralizado por **Monterrey Agentic Labs**. Este es el approach local que corre 100% en tu maquina usando SQLite, filesystem y variables de entorno.

## Stack

| Componente | Tecnologia |
|-----------|------------|
| Base de datos | SQLite + FTS5 (full-text search) |
| Storage | Filesystem local (`data/assets/`) |
| Secrets | `.env` file (dotenv) |
| Transporte | stdio (default) o HTTP (Express) |
| Runtime | Node.js 20+ / TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk ^1.12.0` |

## Requisitos

- Node.js 20+
- npm

No se requiere cuenta de nube, credenciales externas ni conexion a internet.

## Setup rapido

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar TypeScript
npm run build

# 3. Setup completo (crea DB, carpetas, .env)
npm run setup
```

## Uso

### Conectar a Claude Code (stdio — recomendado)

Desde una terminal normal (fuera de Claude Code):

```bash
# Scope user (disponible desde cualquier carpeta)
claude mcp add mal-mcp-hub -s user \
  -e TRANSPORT=stdio \
  -e SQLITE_PATH=/ruta/absoluta/on-premise/data/catalog.db \
  -e ASSETS_PATH=/ruta/absoluta/on-premise/data/assets \
  -- node /ruta/absoluta/on-premise/dist/index.js

# Scope project (solo en la carpeta del proyecto)
claude mcp add mal-mcp-hub -s project \
  -e TRANSPORT=stdio \
  -e SQLITE_PATH=./data/catalog.db \
  -e ASSETS_PATH=./data/assets \
  -- node /ruta/absoluta/on-premise/dist/index.js
```

Reinicia Claude Code y corre `/mcp` para verificar.

### Levantar en modo HTTP

```bash
API_KEY=tu-clave TRANSPORT=http npm run start:http
# Server en http://127.0.0.1:3000/mcp
```

Endpoints:
- `POST /mcp` — Initialize session + tool calls
- `GET /mcp` — SSE streams
- `DELETE /mcp` — Cerrar sesion
- `GET /health` — Health check (sin auth)

Headers requeridos:
- `x-api-key: <tu-clave>`
- `Accept: application/json, text/event-stream`
- `mcp-session-id: <session-id>` (despues de initialize)

## Comandos disponibles

```bash
npm run setup          # Init SQLite + carpetas + .env
npm run build          # Compilar TypeScript
npm run dev            # Modo desarrollo (watch)
npm run start:stdio    # Transporte stdio
npm run start:http     # Transporte HTTP (:3000)
npm test               # Correr tests (vitest)
npm run lint           # Linter
npm run seed           # Cargar datos iniciales
npm run inspect        # MCP Inspector
```

## 22 Tools disponibles

### Skills (9 tools)
- `mal_list_skills` — Listar skills con filtros
- `mal_get_skill` — Detalle de skill + contenido SKILL.md
- `mal_register_skill` — Registrar skill nuevo
- `mal_update_skill` — Actualizar skill
- `mal_delete_skill` — Eliminar skill (irreversible)
- `mal_search_skills` — Busqueda full-text en skills
- `mal_get_skill_content` — Contenido raw del SKILL.md

### Commands (4 tools)
- `mal_list_commands` — Listar commands
- `mal_get_command` — Detalle de command
- `mal_register_command` — Registrar command
- `mal_execute_command` — Ejecutar command (render template)

### Subagents (3 tools)
- `mal_list_subagents` — Listar subagents
- `mal_get_subagent` — Detalle de subagent
- `mal_register_subagent` — Registrar subagent

### MCPs (2 tools)
- `mal_list_mcps` — Listar MCP servers downstream
- `mal_register_mcp` — Registrar MCP externo

### Proxy & Health (2 tools)
- `mal_proxy_mcp_call` — Proxy a MCP downstream
- `mal_health_check` — Health check de DB y MCPs

### Meta (4 tools)
- `mal_search_catalog` — Busqueda full-text en todo el catalogo
- `mal_export_catalog` — Exportar catalogo como JSON
- `mal_import_catalog` — Importar catalogo desde JSON
- `mal_get_usage_stats` — Estadisticas de uso

## Tests

```bash
npm test
```

10 tests, todos pasando:
- `sqlite.adapter.test.ts` — 6 tests (ping, CRUD, paginacion, delete, null)
- `registry.test.ts` — 2 tests (registro de tools, flujo CRUD completo)
- `commands.test.ts` — 2 tests (crear/recuperar, listar con filtros)

## Estructura del proyecto

```
on-premise/
├── package.json
├── tsconfig.json
├── data/
│   ├── schema.sql          ← DDL: 5 tablas + FTS5
│   └── assets/             ← Archivos SKILL.md
├── src/
│   ├── index.ts            ← Entry point
│   ├── server.ts           ← registerAllTools()
│   ├── constants.ts
│   ├── types.ts
│   ├── tools/              ← 22 tools (6 archivos)
│   ├── schemas/            ← Validacion Zod
│   ├── services/
│   │   ├── database.ts     ← IDatabase
│   │   ├── storage.ts      ← IStorage
│   │   ├── secrets.ts      ← ISecrets
│   │   ├── auth.ts         ← Middleware x-api-key
│   │   └── local/
│   │       ├── sqlite.adapter.ts
│   │       ├── filesystem.adapter.ts
│   │       └── dotenv.adapter.ts
│   ├── transport/
│   │   ├── http.ts         ← Express + sesiones MCP
│   │   └── stdio.ts
│   └── utils/
├── tests/
└── scripts/
```

## Licencia

Monterrey Agentic Labs - Uso interno.
