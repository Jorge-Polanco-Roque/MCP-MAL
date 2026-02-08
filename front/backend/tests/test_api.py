"""Tests for FastAPI endpoints."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client with mocked lifespan (MCP client + agent)."""
    with patch("app.mcp.client.create_mcp_client", new_callable=AsyncMock) as mock_create, \
         patch("app.mcp.client.get_mcp_tools", new_callable=AsyncMock, return_value=[]) as mock_tools, \
         patch("app.agent.graph.build_agent", return_value=None) as mock_build, \
         patch("app.mcp.client.close_mcp_client", new_callable=AsyncMock):
        from app.main import app
        with TestClient(app) as c:
            yield c


def test_health_endpoint(client):
    """Health endpoint should return status."""
    with patch("app.api.dashboard.httpx.AsyncClient") as mock_http:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(return_value=mock_resp)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_http.return_value = mock_instance

        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "mcp_status" in data
        assert "agent_status" in data
        assert "timestamp" in data
