# MAL MCP Hub — Web Interface

Web interface for **MAL MCP Hub** (Monterrey Agentic Labs). Chat with an AI agent that has access to all 22 MCP tools, and browse the catalog through an interactive dashboard.

## Architecture

```
Browser (React)                 FastAPI Backend              MCP Server
┌─────────────────┐        ┌─────────────────────┐      ┌──────────────┐
│  Chat Panel     │──WS───▶│  LangGraph Agent    │──HTTP▶│ mal-mcp-hub  │
│  Dashboard      │──REST─▶│  (GPT-4o + tools)   │      │ 22 tools     │
└─────────────────┘        └─────────────────────┘      └──────────────┘
```

- **Chat**: WebSocket streaming — tokens, tool calls, and results arrive in real time
- **Dashboard**: REST endpoints for catalog browsing, server health, and usage stats
- **Agent**: LangGraph StateGraph with GPT-4o, connected to the MCP server via `langchain-mcp-adapters`

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- MCP server running (`cd ../on-premise && npm run start:http`)

### 1. Start the MCP Server

```bash
cd ../on-premise
API_KEY=dev-key TRANSPORT=http npm run start:http
# → http://localhost:3000
```

### 2. Start the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, MCP_SERVER_URL, MCP_API_KEY

uvicorn app.main:app --reload --port 8001
# → http://localhost:8001
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Vite proxies `/api` and `/ws` requests to the backend automatically.

### Docker Compose (all 3 services)

```bash
cd front
OPENAI_API_KEY=sk-... MCP_API_KEY=dev-key docker compose up --build
# Frontend: http://localhost:80
# Backend:  http://localhost:8000
# MCP:      http://localhost:3000
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `MCP_SERVER_URL` | Yes | `http://localhost:3000/mcp` | MCP server URL |
| `MCP_API_KEY` | Yes | — | MCP server API key |
| `BACKEND_PORT` | No | `8000` | FastAPI port |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Allowed CORS origins |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model |
| `LOG_LEVEL` | No | `info` | Log level |

## API

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws/chat` | Chat with the agent. Send `{"message": "...", "history": [...]}` |

Server sends these message types: `token`, `tool_call`, `tool_result`, `error`, `done`.

### REST

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Backend + MCP server health |
| `GET /api/catalog/{collection}` | List items (skills, commands, subagents, mcps) |
| `GET /api/catalog/{collection}/{id}` | Get single item detail |
| `GET /api/stats` | Catalog usage statistics |

## Project Structure

```
front/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI + lifespan
│   │   ├── config.py          # pydantic-settings
│   │   ├── agent/             # LangGraph agent (graph, state, prompts)
│   │   ├── mcp/               # MCP client (MultiServerMCPClient)
│   │   ├── api/               # WebSocket + REST endpoints
│   │   └── models/            # Pydantic schemas
│   └── tests/
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── chat/          # ChatPanel, MessageBubble, ToolCallCard
│       │   └── dashboard/     # DashboardPanel, CatalogList, StatusCard
│       ├── hooks/             # useChat, useWebSocket, useCatalog
│       └── lib/               # API wrappers, types, utils
│
├── docker-compose.yml
└── CLAUDE.md                  # Detailed technical documentation
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, LangGraph, langchain-mcp-adapters |
| LLM | OpenAI GPT-4o |
| Data | React Query (client), MCP server (server) |
| Deploy | Docker Compose, nginx |

## Testing

```bash
# Backend unit tests
cd backend && pytest

# Frontend type check + build
cd frontend && npm run build
```

## License

Internal project — Monterrey Agentic Labs.
