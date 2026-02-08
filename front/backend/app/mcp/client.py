import logging

from langchain_mcp_adapters.client import MultiServerMCPClient

from app.config import settings

logger = logging.getLogger(__name__)

_client: MultiServerMCPClient | None = None


def get_mcp_client_config() -> dict:
    """Build MCP client configuration."""
    config: dict = {
        "mal-mcp-hub": {
            "transport": "streamable_http",
            "url": settings.mcp_server_url,
        }
    }
    if settings.mcp_api_key:
        config["mal-mcp-hub"]["headers"] = {"x-api-key": settings.mcp_api_key}
    return config


async def create_mcp_client() -> MultiServerMCPClient:
    """Create the MCP client (no context manager needed in 0.1.0+)."""
    global _client
    config = get_mcp_client_config()
    logger.info("Connecting to MCP server at %s", settings.mcp_server_url)
    _client = MultiServerMCPClient(config)
    logger.info("MCP client created")
    return _client


async def get_mcp_tools() -> list:
    """Get LangChain-compatible tools from the MCP server."""
    if _client is None:
        raise RuntimeError("MCP client not initialized. Call create_mcp_client() first.")
    tools = await _client.get_tools()
    logger.info("Loaded %d MCP tools", len(tools))
    return tools


async def close_mcp_client() -> None:
    """Close the MCP client connection."""
    global _client
    if _client is not None:
        _client = None
        logger.info("MCP client closed")
