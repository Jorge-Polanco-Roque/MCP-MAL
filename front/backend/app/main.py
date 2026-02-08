import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    try:
        await create_mcp_client()
        tools = await get_mcp_tools()
        logger.info("Loaded %d MCP tools", len(tools))

        # Build all agents with the same tool set (each filters its own subset)
        _agents["chat"] = build_agent(tools)
        _agents["interaction_analyzer"] = build_interaction_analyzer(tools)
        _agents["sprint_reporter"] = build_sprint_reporter(tools)
        _agents["next_steps"] = build_next_steps_suggester(tools)
        _agents["contribution_scorer"] = build_contribution_scorer(tools)

        built = [name for name, agent in _agents.items() if agent is not None]
        logger.info("Agents ready: %s (%d/%d)", ", ".join(built), len(built), len(_agents))
    except Exception:
        logger.exception("Failed to initialize agents — running in degraded mode")
        _agents = {}

    yield

    await close_mcp_client()
    _agents.clear()
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
