import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter

from app.config import settings
from app.models.schemas import HealthResponse

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


def _extract_text(content: Any) -> str:
    """Extract plain text from LangChain MCP tool content (list of dicts or string)."""
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts)
    return str(content)


def _mcp_health_url() -> str:
    """Derive /health URL from MCP server URL."""
    base = settings.mcp_server_url
    # http://localhost:3000/mcp -> http://localhost:3000/health
    if base.endswith("/mcp"):
        return base[:-4] + "/health"
    return base.rstrip("/") + "/health"


@router.get("/health")
async def health() -> HealthResponse:
    """Check health of backend, MCP server, and agents."""
    mcp_status = "unknown"
    tools_count = 0

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(_mcp_health_url())
            if resp.status_code == 200:
                mcp_status = "online"
            else:
                mcp_status = "degraded"
    except Exception:
        mcp_status = "offline"

    try:
        from app.mcp.client import get_mcp_tools
        tools = await get_mcp_tools()
        tools_count = len(tools)
        agent_status = "ready"
    except Exception:
        agent_status = "not_ready"

    # Report which agents are available
    from app.main import _agents
    agents_available = [name for name, agent in _agents.items() if agent is not None]

    return HealthResponse(
        mcp_status=mcp_status,
        agent_status=agent_status,
        tools_count=tools_count,
        agents_available=agents_available,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/catalog/{collection}")
async def list_catalog(collection: str, category: str | None = None, limit: int = 50):
    """List items from a catalog collection via the MCP agent."""
    tool_map = {
        "skills": "mal_list_skills",
        "commands": "mal_list_commands",
        "subagents": "mal_list_subagents",
        "mcps": "mal_list_mcps",
    }

    tool_name = tool_map.get(collection)
    if not tool_name:
        return {"error": f"Unknown collection: {collection}"}

    try:
        from app.mcp.client import get_mcp_tools
        tools = await get_mcp_tools()
        tool = next((t for t in tools if t.name == tool_name), None)
        if not tool:
            return {"error": f"Tool {tool_name} not found"}

        args: dict = {"limit": limit}
        if category:
            args["category"] = category

        result = await tool.ainvoke(args)
        content = result if isinstance(result, list) else (result.content if hasattr(result, "content") else str(result))
        return {"collection": collection, "data": _extract_text(content)}

    except Exception as e:
        logger.exception("Catalog list error")
        return {"error": str(e)}


@router.get("/catalog/{collection}/{item_id}")
async def get_catalog_item(collection: str, item_id: str):
    """Get a single catalog item detail."""
    tool_map = {
        "skills": "mal_get_skill",
        "commands": "mal_get_command",
        "subagents": "mal_get_subagent",
    }

    tool_name = tool_map.get(collection)
    if not tool_name:
        return {"error": f"Unknown collection: {collection}"}

    try:
        from app.mcp.client import get_mcp_tools
        tools = await get_mcp_tools()
        tool = next((t for t in tools if t.name == tool_name), None)
        if not tool:
            return {"error": f"Tool {tool_name} not found"}

        result = await tool.ainvoke({"id": item_id})
        content = result if isinstance(result, list) else (result.content if hasattr(result, "content") else str(result))
        return {"collection": collection, "id": item_id, "data": _extract_text(content)}

    except Exception as e:
        logger.exception("Catalog get error")
        return {"error": str(e)}


@router.get("/stats")
async def get_stats():
    """Get catalog usage statistics."""
    try:
        from app.mcp.client import get_mcp_tools
        tools = await get_mcp_tools()
        tool = next((t for t in tools if t.name == "mal_get_usage_stats"), None)
        if not tool:
            return {"error": "mal_get_usage_stats tool not found"}

        result = await tool.ainvoke({})
        content = result if isinstance(result, list) else (result.content if hasattr(result, "content") else str(result))
        return {"data": _extract_text(content)}

    except Exception as e:
        logger.exception("Stats error")
        return {"error": str(e)}
