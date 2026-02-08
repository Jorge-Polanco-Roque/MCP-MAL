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

_agent = None


def get_agent():
    return _agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize MCP client and agent on startup, cleanup on shutdown."""
    global _agent
    from app.mcp.client import create_mcp_client, get_mcp_tools, close_mcp_client
    from app.agent.graph import build_agent

    try:
        await create_mcp_client()
        tools = await get_mcp_tools()
        _agent = build_agent(tools)
        logger.info("Agent ready with %d tools", len(tools))
    except Exception:
        logger.exception("Failed to initialize agent — running in degraded mode")
        _agent = None

    yield

    await close_mcp_client()
    _agent = None
    logger.info("Shutdown complete")


app = FastAPI(
    title="MAL MCP Hub Frontend API",
    version="0.1.0",
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
