# CLAUDE.md — front/

## Project Overview

`front/` is the web interface for **MAL MCP Hub** (Monterrey Agentic Labs). It consists of:

- **Backend** (Python): FastAPI server with a LangGraph agent that connects to the MCP server via `langchain-mcp-adapters`
- **Frontend** (TypeScript): React + Tailwind CSS dashboard with real-time chat via WebSocket

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (React App)                        │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │     Chat Panel          │  │    Dashboard Panel         │ │
│  │  WebSocket /ws/chat     │  │  REST /api/catalog, etc.   │ │
│  └───────────┬─────────────┘  └──────────┬─────────────────┘ │
└──────────────┼───────────────────────────┼───────────────────┘
               │ WebSocket                 │ HTTP
               ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                   LangGraph Agent                        ││
│  │  START → call_model (GPT-4o) → [tool_calls?]            ││
│  │           ↓ yes                    ↓ no                  ││
│  │         ToolNode ──────────────► END                     ││
│  │        (MCP tools)                                       ││
│  └────────────┬─────────────────────────────────────────────┘│
│               │                                              │
│  ┌────────────▼─────────────────────────────────────────────┐│
│  │      langchain-mcp-adapters (MultiServerMCPClient)       ││
│  │      transport: streamable_http                          ││
│  └────────────┬─────────────────────────────────────────────┘│
└───────────────┼──────────────────────────────────────────────┘
                │ HTTP (Streamable HTTP MCP)
                ▼
┌──────────────────────────────────────────────────────────────┐
│              mal-mcp-hub (on-premise :3000)                   │
│              22 MCP tools · SQLite · Filesystem               │
└──────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
front/
├── CLAUDE.md                     ← this file
├── docker-compose.yml            ← 3 services: mcp-server, backend, frontend
│
├── backend/
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── app/
│   │   ├── main.py               ← FastAPI + lifespan (MCP init/shutdown)
│   │   ├── config.py             ← pydantic-settings
│   │   ├── agent/
│   │   │   ├── graph.py          ← LangGraph StateGraph (call_model + tools)
│   │   │   ├── state.py          ← AgentState (MessagesState)
│   │   │   └── prompts.py        ← System prompt
│   │   ├── mcp/
│   │   │   └── client.py         ← MultiServerMCPClient lifecycle
│   │   ├── api/
│   │   │   ├── chat.py           ← WebSocket /ws/chat
│   │   │   ├── dashboard.py      ← REST /api/health, /api/catalog, /api/stats
│   │   │   └── router.py         ← APIRouter aggregation
│   │   └── models/
│   │       └── schemas.py        ← Pydantic models
│   └── tests/
│       ├── conftest.py
│       ├── test_agent.py
│       └── test_api.py
│
└── frontend/
    ├── package.json
    ├── vite.config.ts            ← proxy /api→:8000, /ws→:8000
    ├── tailwind.config.ts
    ├── Dockerfile
    ├── nginx.conf                ← proxy for production
    ├── index.html
    └── src/
        ├── main.tsx              ← React + QueryClientProvider
        ├── App.tsx               ← 2-column layout (chat + dashboard)
        ├── components/
        │   ├── chat/
        │   │   ├── ChatPanel.tsx
        │   │   ├── MessageBubble.tsx
        │   │   ├── MessageInput.tsx
        │   │   └── ToolCallCard.tsx
        │   ├── dashboard/
        │   │   ├── DashboardPanel.tsx
        │   │   ├── CatalogList.tsx
        │   │   ├── StatusCard.tsx
        │   │   └── StatsSection.tsx
        │   └── ui/               ← shadcn-style components
        ├── hooks/
        │   ├── useChat.ts        ← chat state + WebSocket
        │   ├── useWebSocket.ts   ← connection management
        │   └── useCatalog.ts     ← React Query hooks
        ├── lib/
        │   ├── api.ts            ← REST fetch wrappers
        │   ├── types.ts          ← TypeScript types
        │   └── utils.ts          ← cn(), formatDate()
        └── styles/
            └── globals.css       ← Tailwind + custom styles
```

## Setup & Run

### Prerequisites

- Python 3.11+
- Node.js 20+
- MCP server running (on-premise or nube)

### Backend

```bash
cd front/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and edit env vars
cp .env.example .env
# Set OPENAI_API_KEY, MCP_SERVER_URL, MCP_API_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd front/frontend
npm install
npm run dev    # → http://localhost:5173
```

Vite proxies `/api` and `/ws` to the backend at `:8000`.

### Docker Compose (all 3 services)

```bash
cd front
OPENAI_API_KEY=sk-... MCP_API_KEY=dev-key docker compose up --build
# Frontend: http://localhost:80
# Backend:  http://localhost:8000
# MCP:      http://localhost:3000
```

### Run Tests

```bash
# Backend
cd front/backend
pip install -e ".[dev]"
pytest

# Frontend
cd front/frontend
npm run build    # type-check
```

## API Endpoints

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws/chat` | Chat with the LangGraph agent. Send `{"message": "...", "history": [...]}`, receive streaming chunks. |

### WebSocket Message Types (server → client)

| Type | Description |
|------|-------------|
| `token` | Text chunk from the LLM |
| `tool_call` | Agent is calling an MCP tool (name + arguments) |
| `tool_result` | Tool execution completed (result) |
| `error` | Error occurred |
| `done` | Response complete |

### REST

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Backend + MCP server health |
| `GET /api/catalog/{collection}` | List items (skills, commands, subagents, mcps) |
| `GET /api/catalog/{collection}/{id}` | Get single item detail |
| `GET /api/stats` | Catalog usage statistics |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `MCP_SERVER_URL` | Yes | `http://localhost:3000/mcp` | MCP server URL |
| `MCP_API_KEY` | Yes | — | MCP server API key |
| `BACKEND_PORT` | No | `8000` | FastAPI port |
| `CORS_ORIGINS` | No | `http://localhost:5173` | CORS origins |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model |
| `LOG_LEVEL` | No | `info` | Log level |

## Key Design Decisions

1. **LangGraph over direct OpenAI**: Structured agent loop with tool node, supports streaming, easy to extend with more nodes
2. **langchain-mcp-adapters**: Bridges MCP tools to LangChain tools natively via `MultiServerMCPClient`
3. **WebSocket for chat**: Real-time streaming of tokens and tool calls (SSE would also work but WS is bidirectional)
4. **REST for dashboard**: Static data that doesn't need streaming, cacheable with React Query
5. **Vite proxy**: In dev, Vite proxies API/WS to the backend. In prod, nginx handles routing.

## Known Fixes & Gotchas

1. **`langchain-mcp-adapters` 0.1.0+ API change** (fixed) — `MultiServerMCPClient` can no longer be used as an async context manager. Calling `__aenter__()`/`__aexit__()` raises `NotImplementedError`. The correct pattern is:
   ```python
   client = MultiServerMCPClient(config)
   tools = await client.get_tools()  # async, opens a session per tool call
   ```
   No explicit close needed. See `app/mcp/client.py`.

2. **`on_tool_start` event contains non-serializable `ToolRuntime`** (fixed) — When streaming via `agent.astream_events(version="v2")`, the `on_tool_start` event's `data["input"]` dict contains a `runtime` key with an internal LangGraph `ToolRuntime` object (state, config, callbacks, etc.). This is not JSON-serializable and will crash `json.dumps()`. The fix in `app/api/chat.py` filters internal keys (`runtime`, `config`, `callbacks`, `store`, `context`) via `_safe_args()` before sending to the WebSocket client.

3. **`chunk.content` can be string or list** (fixed) — In `on_chat_model_stream` events, `chunk.content` from OpenAI is typically a `str`, but can also be a `list[dict]` (e.g. `[{"type": "text", "text": "..."}]`) depending on the model/provider. The `_extract_content()` helper normalizes all variants to a plain string.

4. **Port 8000 may be occupied** — On some dev machines port 8000 is already in use. If so, run the backend on another port (`uvicorn app.main:app --port 8001`) and update `vite.config.ts` proxy targets to match.

5. **Test mocking paths** — The FastAPI lifespan uses local imports (`from app.mcp.client import ...`), so test patches must target `app.mcp.client.create_mcp_client` (not `app.main.create_mcp_client`). See `tests/test_api.py`.

## Test Status

- **Unit tests** (pytest): 3/3 passing
  - `test_agent.py` — 2 tests (graph compilation with mock LLM, system prompt content)
  - `test_api.py` — 1 test (health endpoint returns correct schema)
- **Frontend build**: TypeScript strict + Vite — 0 errors, 387 kB bundle
- **E2E verified** (manual, all passing):
  - MCP connection: 22 tools loaded via `streamable_http`
  - `GET /api/health` → `mcp_status: online, agent_status: ready, tools_count: 22`
  - `GET /api/catalog/skills` → returns catalog data
  - `GET /api/stats` → returns usage stats
  - `WS /ws/chat` with real GPT-4o:
    - "Lista todos los skills" → `mal_list_skills` called → markdown table response
    - "Check server health" → `mal_health_check` called → health report
    - "Search catalog for prueba" → `mal_search_catalog` called → search results
  - Frontend Vite proxy → all `/api/*` and `/ws/*` routes proxied correctly

## Conventions

- Python: PEP 8, type hints, Pydantic v2 models
- TypeScript: strict mode, path aliases (`@/`), Tailwind utility classes
- Components: functional, hooks-based, no class components
- State: React Query for server state, useState/useRef for local state
- Styling: Tailwind CSS with custom `mal-*` color palette

## Roadmap: Next Steps for front/

> Full roadmap details (data model, all 20 new MCP tools, architecture diagrams) are in the root `CLAUDE.md` under **"Roadmap: Team Collaboration Platform"**.

### Summary of What's Coming

The front/ evolves from a 2-panel chat+dashboard into a **multi-page team collaboration platform**:

**Backend — LangGraph Multi-Agent System**:
- 4 new specialized LangGraph agents (all GPT-4o):
  - **Interaction Analyzer** — Summarizes conversations, extracts decisions and action items, auto-links to sprints/work items
  - **Sprint Reporter** — Generates sprint summaries, velocity analysis, retrospectives, burndown data
  - **Next Steps Suggester** — Context-aware suggestions grounded in real MCP data (open items, recent activity, sprint timeline)
  - **Contribution Scorer** — Evaluates commits/interactions/completions, awards XP, checks achievement unlocks
- New REST endpoints for sprints, work items, team, leaderboard, analytics
- New WebSocket events for agent streaming (same pattern as existing chat)
- Git integration module for commit analytics (`git log` parsing)
- Scheduled tasks: achievement checks, Team Pulse digests

**Frontend — Multi-Page App with Gamification**:
- React Router v6 for navigation (/, /chat, /sprint, /backlog, /analytics, /leaderboard, /next-steps, /history, /profile/:id, /catalog)
- Sprint Board — Kanban with drag-and-drop (`@dnd-kit`)
- Work Item management — create, filter, assign, prioritize
- Analytics — Commit graphs, velocity charts, burndown, contribution heatmaps (`recharts`)
- Leaderboard — XP rankings, level progression, streak tracking
- Achievements — Unlockable badges with toast notifications
- Profile pages — Skill radar chart, contribution graph, achievement showcase
- Next Steps page — AI-generated prioritized suggestions with reasoning
- Interaction browser — Full-text search through past conversations
- XP bar + level indicator always visible in header
- Context-aware chat — Agent auto-receives sprint goals, open items, recent decisions
- **Explicit placeholder policy**: Any demo/seed data shows `[SAMPLE DATA]` badge — never silently fake real data

**New Dependencies**:
```
# Backend (Python)
langgraph-checkpoint>=2.0.0
apscheduler>=3.10.0

# Frontend (npm)
react-router-dom@^6
recharts@^2.12
@dnd-kit/core@^6
@dnd-kit/sortable@^8
date-fns@^3
react-hot-toast@^2
framer-motion@^11
```

### Implementation Order

```
Phase 6: LangGraph Agents (backend)
  6.1 Interaction Analyzer agent
  6.2 Sprint Reporter agent
  6.3 Next Steps Suggester agent
  6.4 Contribution Scorer agent
  6.5 Agent orchestration + new REST/WS endpoints

Phase 7: Frontend Core Pages
  7.1 React Router + new layout with sidebar nav
  7.2 Sprint Board (Kanban)
  7.3 Work Item management
  7.4 Interaction browser
  7.5 Analytics dashboards (Recharts)

Phase 8: Gamification
  8.1 XP engine + level calculation
  8.2 Achievement system + toast notifications
  8.3 Leaderboard UI
  8.4 Streak tracking
  8.5 Profile pages + skill radar

Phase 9: Intelligence
  9.1 Next Steps page
  9.2 Context-aware chat (context injection)
  9.3 Sprint health indicator
  9.4 Auto-linking (mentions → entities)
  9.5 Decision journal
  9.6 Team Pulse digests
```

> Phase 5 (Data Foundation + Catalog Seeding) is in the MCP server (on-premise/nube), not in front/.
> Phase 5.5 seeds 14 skills, 14 commands, 5 subagents, 6 external MCPs (Context7, Playwright, GitHub, Memory, Sequential Thinking, Brave Search), and 14 achievements.
> Phases 6-9 are all in front/. Phase 10 (Polish) spans everything.
> See root `CLAUDE.md` for the full catalog seeding spec (every item detailed with descriptions and configurations).
