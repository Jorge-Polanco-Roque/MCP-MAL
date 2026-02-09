import logging
import os
from contextlib import asynccontextmanager

import aiosqlite
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from app.config import settings
from app.api.router import api_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Global agent registry: {"chat": agent, "interaction_analyzer": agent, ...}
_agents: dict = {}


def get_agent(name: str = "chat"):
    """Get a named agent from the registry."""
    return _agents.get(name)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize MCP client and all agents on startup, cleanup on shutdown."""
    global _agents
    from app.mcp.client import create_mcp_client, get_mcp_tools, close_mcp_client
    from app.agent.graph import build_agent
    from app.agent.interaction_analyzer import build_interaction_analyzer
    from app.agent.sprint_reporter import build_sprint_reporter
    from app.agent.next_steps import build_next_steps_suggester
    from app.agent.contribution_scorer import build_contribution_scorer
    from app.agent.code_reviewer import build_code_reviewer
    from app.agent.daily_summary import build_daily_summary

    # Open persistent SQLite connection for chat checkpointer
    db_path = settings.chat_db_path
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    conn = await aiosqlite.connect(db_path)
    checkpointer = AsyncSqliteSaver(conn)
    await checkpointer.setup()

    try:
        await create_mcp_client()
        tools = await get_mcp_tools()
        logger.info("Loaded %d MCP tools", len(tools))

        # Build all agents with the same tool set (each filters its own subset)
        _agents["chat"] = build_agent(tools, checkpointer=checkpointer)
        _agents["interaction_analyzer"] = build_interaction_analyzer(tools)
        _agents["sprint_reporter"] = build_sprint_reporter(tools)
        _agents["next_steps"] = build_next_steps_suggester(tools)
        _agents["contribution_scorer"] = build_contribution_scorer(tools)
        _agents["code_reviewer"] = build_code_reviewer(tools)
        _agents["daily_summary"] = build_daily_summary(tools)

        built = [name for name, agent in _agents.items() if agent is not None]
        logger.info("Agents ready: %s (%d/%d)", ", ".join(built), len(built), len(_agents))
    except Exception:
        logger.exception("Failed to initialize agents — running in degraded mode")
        _agents = {}

    yield

    await close_mcp_client()
    _agents.clear()
    await conn.close()
    logger.info("Shutdown complete")


app = FastAPI(
    title="MAL MCP Hub Frontend API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
