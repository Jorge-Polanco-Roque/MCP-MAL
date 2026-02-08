"""Tests for agent graph construction."""
from unittest.mock import patch, MagicMock

from langchain_core.tools import tool


@tool
def mock_tool(query: str) -> str:
    """A mock tool for testing."""
    return f"Result for {query}"


def test_build_agent_creates_compiled_graph():
    """build_agent should return a compiled graph with nodes."""
    with patch("app.agent.graph.ChatOpenAI") as mock_llm_cls:
        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        mock_llm_cls.return_value = mock_llm

        from app.agent.graph import build_agent
        agent = build_agent([mock_tool])
        assert agent is not None
        # CompiledGraph has an invoke method
        assert hasattr(agent, "invoke")
        assert hasattr(agent, "astream_events")


def test_system_prompt_contains_tool_descriptions():
    """System prompt should describe available MCP tools."""
    from app.agent.prompts import SYSTEM_PROMPT
    assert "mal_list_skills" in SYSTEM_PROMPT
    assert "mal_search_catalog" in SYSTEM_PROMPT
    assert "mal_health_check" in SYSTEM_PROMPT
