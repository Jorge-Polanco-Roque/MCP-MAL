# CLAUDE.md — front/

## Project Overview

`front/` is the web interface for **MAL MCP Hub** (Monterrey Agentic Labs). It consists of:

- **Backend** (Python): FastAPI server with 5 LangGraph agents that connect to the MCP server (47 tools) via `langchain-mcp-adapters`
- **Frontend** (TypeScript): React multi-page app with real-time chat, sprint board, analytics, gamification, and intelligence features

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Browser (React App)                          │
│  ┌────────────────────┐ ┌──────────────────┐ ┌───────────────┐  │
│  │  Chat (WS)         │ │  Sprints/Backlog │ │  Analytics    │  │
│  │  Next Steps (WS)   │ │  Leaderboard     │ │  Profile      │  │
│  │  Sprint Report (WS)│ │  Decisions       │ │  Catalog      │  │
│  └────────┬───────────┘ └────────┬─────────┘ └──────┬────────┘  │
└───────────┼──────────────────────┼───────────────────┼───────────┘
            │ WebSocket            │ REST               │ REST
            ▼                      ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (:8001)                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              5 LangGraph Agents (GPT-4o)                   │  │
│  │  ┌─────────┐ ┌───────────────┐ ┌──────────────────────┐   │  │
│  │  │  Chat   │ │ Interaction   │ │  Sprint Reporter     │   │  │
│  │  │  Agent  │ │ Analyzer      │ │                      │   │  │
│  │  └─────────┘ └───────────────┘ └──────────────────────┘   │  │
│  │  ┌─────────────────┐ ┌────────────────────────────────┐   │  │
│  │  │ Next Steps      │ │ Contribution Scorer            │   │  │
│  │  │ Suggester       │ │                                │   │  │
│  │  └─────────────────┘ └────────────────────────────────┘   │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │       langchain-mcp-adapters (MultiServerMCPClient)        │  │
│  │       transport: streamable_http                           │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTP (Streamable HTTP MCP)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│               mal-mcp-hub (on-premise :3000)                     │
│               47 MCP tools · SQLite · Filesystem                 │
└──────────────────────────────────────────────────────────────────┘
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
│   │   ├── main.py               ← FastAPI + lifespan (MCP init + 5 agents)
│   │   ├── config.py             ← pydantic-settings
│   │   ├── agent/
│   │   │   ├── graph.py          ← Chat agent: StateGraph (call_model + guarded_tools) + MemorySaver + interrupt()
│   │   │   ├── state.py          ← AgentState (MessagesState)
│   │   │   └── prompts.py        ← System prompt (47 tools + Capabilities + Destructive Ops)
│   │   ├── agents/
│   │   │   ├── interaction_analyzer.py  ← Summarizes conversations, extracts decisions
│   │   │   ├── sprint_reporter.py       ← Sprint summaries + velocity analysis
│   │   │   ├── next_steps.py            ← Context-aware AI suggestions
│   │   │   ├── contribution_scorer.py   ← XP scoring + achievement checks
│   │   │   └── prompts.py               ← Agent-specific system prompts
│   │   ├── mcp/
│   │   │   └── client.py         ← MultiServerMCPClient lifecycle
│   │   ├── api/
│   │   │   ├── chat.py           ← WebSocket /ws/chat (with interrupt/confirm), /ws/sprint-report, /ws/next-steps
│   │   │   ├── agents.py         ← POST /api/analyze-interaction, /api/sprint-report, etc.
│   │   │   ├── dashboard.py      ← GET /api/health, /api/catalog, /api/stats
│   │   │   ├── data.py           ← GET/POST sprints, work-items, interactions, analytics, activity
│   │   │   └── router.py         ← APIRouter aggregation
│   │   └── models/
│   │       └── schemas.py        ← Pydantic models
│   └── tests/
│       ├── conftest.py
│       ├── test_agent.py         ← 6 tests (graph, prompt 47 tools, capabilities, destructive ops, DESTRUCTIVE_TOOLS)
│       ├── test_agents.py        ← 11 tests (all 4 agents build + filter tools)
│       └── test_api.py           ← 1 test (health endpoint)
│
└── frontend/
    ├── package.json
    ├── vite.config.ts            ← proxy /api→backend, /ws→backend
    ├── tailwind.config.ts
    ├── Dockerfile                ← multi-stage: node build → nginx:alpine
    ├── nginx.conf                ← SPA routing + API/WS proxy
    ├── index.html
    └── src/
        ├── main.tsx              ← React + BrowserRouter + QueryClient + Toaster
        ├── App.tsx               ← React Router with 10 routes under Layout
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.tsx          ← Header + mobile nav + sidebar + ErrorBoundary
        │   │   └── Sidebar.tsx         ← Collapsible desktop nav (9 items)
        │   ├── chat/
        │   │   ├── ChatPanel.tsx       ← Chat with context toggle + reconnection status + confirm handling
        │   │   ├── MessageBubble.tsx   ← Markdown + autolinks + tool call cards + ConfirmationCard
        │   │   ├── MessageInput.tsx    ← Textarea + send button (disabled during pendingConfirmation)
        │   │   ├── ToolCallCard.tsx    ← Expandible tool call display
        │   │   └── ConfirmationCard.tsx ← Destructive op confirmation (Approve/Cancel)
        │   ├── dashboard/
        │   │   ├── DashboardPanel.tsx  ← Status + activity feed + stats + catalog tabs
        │   │   ├── ActivityFeed.tsx    ← Recent interactions + top contributors
        │   │   ├── CatalogList.tsx     ← Skills/commands/subagents/mcps list
        │   │   ├── StatusCard.tsx      ← MCP health indicator
        │   │   └── StatsSection.tsx    ← Catalog totals
        │   ├── board/
        │   │   ├── WorkItemCard.tsx   ← Draggable card (useSortable from @dnd-kit)
        │   │   └── BoardColumn.tsx    ← Droppable column (useDroppable from @dnd-kit)
        │   ├── gamification/
        │   │   ├── XpBar.tsx           ← XP progress bar with level name
        │   │   ├── LevelBadge.tsx      ← Circular badge color-coded by tier
        │   │   ├── AchievementCard.tsx ← Achievement with tier/category/lock state
        │   │   └── StreakIndicator.tsx ← Fire icon with streak days
        │   ├── intelligence/
        │   │   ├── TeamPulse.tsx       ← 4-metric team activity digest
        │   │   └── SprintHealthBadge.tsx ← Green/yellow/red sprint health
        │   └── ui/               ← shadcn-style: button, card, badge, tabs, scroll-area, error-boundary, data-card
        │
        ├── pages/
        │   ├── ChatPage.tsx            ← Chat + dashboard sidebar
        │   ├── SprintsPage.tsx         ← Sprint board with DnD Kanban (4 cols) + sprint selector + create forms
        │   ├── BacklogPage.tsx         ← Work items with filters + create form
        │   ├── InteractionsPage.tsx    ← Search + type filter
        │   ├── AnalyticsPage.tsx       ← Recharts bar chart + TeamPulse + leaderboard
        │   ├── LeaderboardPage.tsx     ← Ranked table with medals/XP/level/streak
        │   ├── ProfilePage.tsx         ← Team member profile + XP bar + achievements
        │   ├── NextStepsPage.tsx       ← AI suggestions: card-by-card review → accept to Kanban
        │   ├── DecisionsPage.tsx       ← Decision journal with quick filter tags
        │   ├── ProjectsPage.tsx        ← Project CRUD with repo URL, color, cascade delete
        │   └── CatalogPage.tsx         ← Catalog browser (wraps DashboardPanel)
        │
        ├── hooks/
        │   ├── useChat.ts              ← Chat state + WS + context injection + pendingConfirmation + respondToConfirmation
        │   ├── useWebSocket.ts         ← Connection + exponential backoff reconnect
        │   ├── useCatalog.ts           ← React Query: health, catalog, stats
        │   ├── useProjectContext.tsx    ← Project selector context (activeProjectId, activeProject)
        │   └── useData.ts             ← React Query: sprints, board, work-items, interactions, analytics, team, projects, achievements, activity
        │
        ├── lib/
        │   ├── api.ts                  ← 20+ REST fetch wrappers
        │   ├── types.ts               ← TypeScript types (Sprint, WorkItem, Achievement, etc.)
        │   ├── utils.ts               ← cn(), formatDate(), generateId()
        │   ├── gamification.ts         ← calculateLevel(), levelName(), XP formula, tier styles
        │   └── autolink.ts            ← @user, #sprint-id, WI-xxx → markdown links
        │
        └── styles/
            └── globals.css            ← Tailwind + custom scrollbar + typewriter cursor
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
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd front/frontend
npm install
npm run dev    # → http://localhost:5173
```

Vite proxies `/api` and `/ws` to the backend.

### Docker Compose (all 3 services)

```bash
cd front
OPENAI_API_KEY=sk-... MCP_API_KEY=dev-key docker compose up --build
# Frontend: http://localhost:80
# Backend:  http://localhost:8001
# MCP:      http://localhost:3000
```

All 3 services have health checks. Backend waits for MCP to be healthy. Frontend waits for backend.

### Run Tests

```bash
# Backend (18 tests)
cd front/backend
source .venv/bin/activate
python -m pytest tests/ -v

# Frontend (type-check + build)
cd front/frontend
npm run build
```

## API Endpoints

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws/chat` | Chat with the main agent. Send `{"message": "...", "history": [...], "context": "..."}`. Supports `confirm`/`confirm_response` for destructive ops. Per-connection `thread_id` for state. |
| `WS /ws/sprint-report` | Stream sprint report. Send `{"sprint_id": "...", "repo_path": "...", "days": 14}`. |
| `WS /ws/next-steps` | Stream AI suggestions. Send `{"user_id": "...", "sprint_id": "..."}`. |

### WebSocket Message Types (server → client)

| Type | Description |
|------|-------------|
| `token` | Text chunk from the LLM |
| `tool_call` | Agent is calling an MCP tool (name + arguments) |
| `tool_result` | Tool execution completed (result) |
| `confirm` | Destructive operation requires user confirmation (`confirm` field has `ConfirmationPayload`) |
| `error` | Error occurred |
| `done` | Response complete |

### WebSocket Message Types (client → server)

| Type | Description |
|------|-------------|
| `message` | User chat message (`{"message": "...", "history": [...], "context": "..."}`) |
| `confirm_response` | User responds to confirmation (`{"type": "confirm_response", "approved": true/false}`) |

### REST — Dashboard

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Backend + MCP server health, tools count, agents available |
| `GET /api/catalog/{collection}` | List items (skills, commands, subagents, mcps) |
| `GET /api/catalog/{collection}/{id}` | Get single item detail |
| `GET /api/stats` | Catalog usage statistics |

### REST — Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/sprints` | List sprints (optional `?status=active`) |
| `GET /api/sprints-list` | List sprints as structured JSON for sprint selector (optional `?status=`) |
| `GET /api/sprints/{id}` | Get sprint details |
| `POST /api/sprints` | Create sprint |
| `PUT /api/sprints/{id}` | Update sprint |
| `GET /api/board` | Structured work items grouped by status for Kanban DnD (optional `?sprint_id=`) |
| `GET /api/work-items` | List work items (optional `?sprint_id=&status=&priority=&assignee_id=`) |
| `GET /api/work-items/{id}` | Get work item |
| `POST /api/work-items` | Create work item |
| `PUT /api/work-items/{id}` | Update work item |
| `GET /api/interactions` | List interactions (optional `?user_id=&type=`) |
| `GET /api/interactions/search?q=` | Full-text search interactions |
| `GET /api/analytics/commits?days=30&repo_url=&project_id=` | Commit activity (auto-clones GitHub repos via `_ensure_repo()`) |
| `GET /api/analytics/leaderboard?limit=20` | Team leaderboard |
| `GET /api/analytics/sprint-report/{id}` | Sprint analytics report |
| `GET /api/team` | List team members |
| `GET /api/team/{id}` | Get team member profile |
| `GET /api/achievements` | List achievements (optional `?user_id=&category=`) |
| `GET /api/context` | Project context for chat injection |
| `GET /api/activity?limit=20` | Activity feed (interactions + top contributors) |
| `GET /api/projects` | List projects (optional `?status=`) |
| `GET /api/projects-list` | Projects as structured JSON (optional `?status=`) |
| `GET /api/projects/{id}` | Get project details |
| `POST /api/projects` | Create project (supports `metadata: {repo_url: "..."}`) |
| `PUT /api/projects/{id}` | Update project |
| `DELETE /api/projects/{id}?cascade=` | Delete project (cascade deletes sprints+items) |

### REST — Agents

| Endpoint | Description |
|----------|-------------|
| `POST /api/analyze-interaction` | Run interaction analyzer agent |
| `POST /api/sprint-report` | Run sprint reporter agent |
| `POST /api/next-steps` | Run next steps suggester agent |
| `POST /api/score-contribution` | Run contribution scorer agent |

## LangGraph Agents (5 total)

All agents follow: `StateGraph(AgentState) → call_model → conditional → tools → loop → END`

| Agent | File | Tools | Purpose |
|-------|------|-------|---------|
| **Chat** | `agent/graph.py` | All 47 MCP tools | Main chat interface + MemorySaver checkpointer + interrupt() for destructive ops |
| **Interaction Analyzer** | `agents/interaction_analyzer.py` | 5 tools | Summarize conversations, extract decisions |
| **Sprint Reporter** | `agents/sprint_reporter.py` | 6 tools | Sprint summaries, velocity, retrospectives |
| **Next Steps Suggester** | `agents/next_steps.py` | 6 tools | AI-powered prioritized recommendations |
| **Contribution Scorer** | `agents/contribution_scorer.py` | 5 tools | Score contributions, award XP, unlock achievements |

## Frontend Pages (11 routes)

| Route | Page | Features |
|-------|------|----------|
| `/` | Chat | 2-column: chat panel + dashboard sidebar, context toggle |
| `/sprints` | Sprint Board | Sprint selector + DnD Kanban (todo/in_progress/review/done) + create forms + optimistic updates |
| `/backlog` | Backlog | Work items with status/priority filters, inline create form |
| `/interactions` | History | Full-text search + type filter |
| `/analytics` | Analytics | Recharts bar chart (commits), TeamPulse, leaderboard, sprint overview |
| `/leaderboard` | Leaderboard | Per-project rankings, Sync Commits button, repo info bar, dev branch * note |
| `/profile/:userId` | Profile | Team member card, XP bar, stats, achievements |
| `/next-steps` | Next Steps | Card-by-card review: stream → accept/skip → create work items → Kanban |
| `/decisions` | Decisions | Decision journal with quick filter tags |
| `/projects` | Projects | Project CRUD with repo URL, color picker, cascade delete, status dropdown, inline editing (EditProjectForm) |
| `/catalog` | Catalog | Skills/commands/subagents/mcps browser with tabs |

## Gamification System

XP formula (mirrors server-side `calculateLevel()`):

| XP Range | XP per Level | Levels |
|----------|-------------|--------|
| 0–500 | 100 | 1–5 |
| 500–2000 | 300 | 6–10 |
| 2000–5000 | 600 | 11–15 |
| 5000–10000 | 1000 | 16–20 |
| 10000+ | 2000 | 21+ |

20 level names: Apprentice → Initiate → Novice → Acolyte → Practitioner → Journeyman → Artisan → Specialist → Expert → Veteran → Master → Champion → Hero → Legend → Sage → Oracle → Titan → Paragon → Luminary → Architect

4 tiers: Bronze (levels 1-5), Silver (6-10), Gold (11-15), Platinum (16+)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `MCP_SERVER_URL` | Yes | `http://localhost:3000/mcp` | MCP server URL |
| `MCP_API_KEY` | Yes | — | MCP server API key |
| `BACKEND_PORT` | No | `8001` | FastAPI port |
| `CORS_ORIGINS` | No | `http://localhost:5173` | CORS origins |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model |
| `LOG_LEVEL` | No | `info` | Log level |

## Key Design Decisions

1. **LangGraph multi-agent**: 5 specialized agents with tool filtering (not all 47 tools per agent)
2. **langchain-mcp-adapters**: Bridges MCP tools to LangChain tools via `MultiServerMCPClient`
3. **WebSocket for streaming**: Real-time token + tool call streaming for chat, sprint reports, next steps
4. **REST for data**: Cacheable endpoints with React Query (30s stale time)
5. **Context-aware chat**: Optional project context injection (active sprints, open items, commits)
6. **Auto-linking**: `@user`, `#sprint-id`, `WI-xxx` converted to markdown links in messages
7. **ErrorBoundary**: React class component wraps page content for graceful error recovery
8. **Exponential backoff**: WebSocket reconnection with 1s→2s→4s...30s cap, max 10 retries
9. **Human-in-the-loop confirmation**: Destructive ops (`mal_delete_skill`, `mal_delete_project`, `mal_import_catalog`, `mal_execute_command`) use LangGraph `interrupt()` + `MemorySaver` checkpointer with per-connection `thread_id`. WebSocket sends `confirm` message → frontend shows `ConfirmationCard` → user clicks Approve/Cancel → client sends `confirm_response` → graph resumes via `Command(resume={"approved": bool})`

## Known Fixes & Gotchas

1. **`langchain-mcp-adapters` 0.1.0+ API change** (fixed) — `MultiServerMCPClient` cannot be used as async context manager. Pattern: `client = MultiServerMCPClient(config)` → `await client.get_tools()`.

2. **`on_tool_start` non-serializable `ToolRuntime`** (fixed) — `_safe_args()` filters internal keys (`runtime`, `config`, `callbacks`, `store`, `context`) before JSON serialization.

3. **`chunk.content` polymorphism** (fixed) — `_extract_content()` normalizes string/list/dict variants to plain string.

4. **Port 8000 may be occupied** — Run backend on another port and update `vite.config.ts` proxy targets.

5. **Test mocking paths** — Patches must target `app.mcp.client.create_mcp_client`.

6. **WebSocket JSON.parse crash** (fixed Phase 10) — `useChat.ts` wraps `JSON.parse()` in try-catch with console.warn fallback.

7. **Weak ID generation** (fixed Phase 10) — Replaced `Math.random().toString(36)` with `crypto.randomUUID()`.

8. **Context fetch failure silent** (fixed Phase 10) — Shows toast notification "Context fetch failed — sending without context".

9. **`tool.ainvoke()` returns `list`, not object with `.content`** (fixed) — `langchain-mcp-adapters` `tool.ainvoke()` returns a raw Python `list` of dicts `[{'type': 'text', 'text': '...'}]`, **not** an object with a `.content` attribute. The original code did `result.content if hasattr(result, "content") else str(result)`, which fell through to `str()` producing Python repr strings like `"[{'type': 'text', ...}]"`. Fix: always check `isinstance(result, list)` first, then extract text from each dict. Applied in both `data.py` (`_call_tool()`) and `dashboard.py` (`_extract_text()` helper).

10. **Backend port default changed to 8001** — Port 8000 was occupied by another project in the dev environment. Default `BACKEND_PORT` is now `8001`. The `vite.config.ts` proxy targets and `.env` are aligned to this port.

11. **uvicorn `--reload` required for development** — Without the `--reload` flag, code changes to FastAPI endpoints are not picked up until manual restart. Always start with `uvicorn app.main:app --reload --port 8001` during development.

12. **Leaderboard auto-sync from git** — `mal_get_commit_activity` now auto-syncs git authors to `team_members` and logs contributions. The leaderboard reflects real git activity without manual intervention. Git authors are matched by email first, then by name prefix. Commits are deduped by SHA hash so calling the tool multiple times is safe. XP formula: 10 base + 1 per 100 lines changed (cap 50).

13. **Board columns use "review" not "blocked"** — The SQLite `work_items.status` CHECK constraint only allows `backlog, todo, in_progress, review, done, cancelled`. The Kanban board uses 4 columns: `todo`, `in_progress`, `review`, `done`. There is no "blocked" status in the DB.

14. **DnD optimistic updates with rollback** — When dragging a card between columns, `SprintsPage.tsx` performs an optimistic update via `queryClient.setQueryData()` before the API call. On failure, it reverts to the previous board state and shows an error toast. The `useUpdateWorkItem` hook invalidates both `["work-items"]` and `["board"]` queries on success.

15. **Backend `data.py` param name must be `id`** — MCP tools `mal_get_work_item`, `mal_update_work_item`, and `mal_update_sprint` expect the parameter name `id` (not `item_id` or `sprint_id`). The backend endpoints extract the path param and set `body["id"]` before calling `_call_tool()`.

16. **`/api/board` returns structured JSON** — The backend calls `mal_list_work_items` with `format=json` and groups items into 4 columns (`todo`, `in_progress`, `review`, `done`). Items with unrecognized statuses (e.g. `backlog`) are excluded from the board response.

17. **`/api/sprints-list` returns structured JSON** — Calls `mal_list_sprints` with `format=json` for the sprint selector dropdown. Returns `{ items: Sprint[], total: number }`.

18. **Per-project leaderboard from GitHub repos** (enhancement) — Projects store `repo_url` in their `metadata` field. `GET /api/analytics/commits` accepts `repo_url` and `project_id` params. `_ensure_repo()` in `data.py` clones/pulls GitHub repos to `/tmp/mal-repo-cache/`. LeaderboardPage has "Sync Commits" button, repo info bar, and dev branch note (`*`). ProjectsPage create form includes repo URL field.

19. **Next Steps card-by-card review** (enhancement) — NextStepsPage rewritten with 4 phases: idle, streaming, reviewing, complete. AI suggestions stream via WS then are parsed into individual cards. Each card has Accept/Skip buttons. Accept creates a work item. Complete phase shows summary with link to Sprint Board.

20. **Project management** (enhancement) — 5 new MCP tools for project CRUD. Projects group sprints and work items. `metadata.repo_url` links a project to a GitHub repo for commit-based leaderboard. ProjectsPage has create form with color/status/repo, project cards with status dropdown, menu with cascade delete.

21. **Chat-first architecture with human-in-the-loop confirmation** (enhancement) — All 47 MCP tools accessible via chat with natural language. System prompt includes Capabilities section with bilingual examples. 4 destructive tools trigger `interrupt()` → frontend `ConfirmationCard` → `Command(resume={"approved": bool})`. Graph uses `MemorySaver` checkpointer with per-connection `thread_id`. WebSocket protocol extended with `confirm`/`confirm_response` message types.

22. **`StructuredTool` does not support sync invocation** (fixed) — MCP adapter tools from `langchain-mcp-adapters` are async-only. Graph nodes `call_model` and `guarded_tools` must be `async def` using `ainvoke()`. Using sync `.invoke()` raises `NotImplementedError`.

23. **Project inline editing** (enhancement) — ProjectsPage supports inline editing via `EditProjectForm` component. Only changed fields sent to API. Create project simplified to only require name (ID auto-generated).

## Team Members

Registered in the on-premise SQLite database:

| ID | Name | Role | Email (git match) |
|----|------|------|--------------------|
| `jorge` | Jorge | lead | `55784702+Jorge-Polanco-Roque@users.noreply.github.com` |
| `enrique` | Enrique | lead | — |
| `emilio` | Emilio | lead | — |
| `roman` | Román | lead | — |

XP is auto-synced from git commits via `mal_get_commit_activity`. To add new members, use `mal_register_team_member` or insert into `team_members` table. Set `email` to the git author email for automatic matching.

## Test Status

- **Backend tests** (pytest): 18/18 passing
  - `test_agent.py` — 6 tests (graph compilation, system prompt 47 tools, capabilities section, destructive ops section, DESTRUCTIVE_TOOLS constant)
  - `test_agents.py` — 11 tests (4 agents build, filter tools, prompt validation, 47 tool count)
  - `test_api.py` — 1 test (health endpoint schema)
- **Frontend build**: TypeScript strict + Vite — 0 errors, ~832 kB bundle

## Conventions

- Python: PEP 8, type hints, Pydantic v2 models
- TypeScript: strict mode, path aliases (`@/`), Tailwind utility classes
- Components: functional, hooks-based, no class components
- State: React Query for server state, useState/useRef for local state
- Styling: Tailwind CSS with custom `mal-*` color palette
- Mutations: toast notifications on success/error via `react-hot-toast`
- DnD: `@dnd-kit/core` + `@dnd-kit/sortable` for Kanban board drag-and-drop with optimistic updates
- Mobile: responsive padding (`px-4 sm:px-6`), hidden columns on small screens, horizontal scroll for tables

## Implementation Phases (all complete)

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 6 | LangGraph Agents (4 specialized + orchestration) | Done |
| Phase 7 | Frontend Core Pages (Sprint Board, Backlog, Interactions, Analytics) | Done |
| Phase 8 | Gamification (XP engine, achievements, leaderboard, profiles) | Done |
| Phase 9 | Intelligence (Next Steps, context-aware chat, auto-linking, decisions, TeamPulse) | Done |
| Phase 10 | Polish (activity feed, toasts, error boundary, mobile responsive, Docker, docs) | Done |
| Phase 11 | Project Management + Repos (5 MCP tools, per-project leaderboard, GitHub integration) | Done |
| Phase 12 | Chat-First Architecture (all 47 tools via chat, interrupt/confirm for destructive ops, project inline editing) | Done |
