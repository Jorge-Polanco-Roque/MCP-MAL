"""Tests for the main chat agent graph construction."""
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
    """System prompt should describe available MCP tools (47 total)."""
    from app.agent.prompts import SYSTEM_PROMPT
    assert "mal_list_skills" in SYSTEM_PROMPT
    assert "mal_search_catalog" in SYSTEM_PROMPT
    assert "mal_health_check" in SYSTEM_PROMPT
    # Phase 5 tools
    assert "mal_log_interaction" in SYSTEM_PROMPT
    assert "mal_get_leaderboard" in SYSTEM_PROMPT
    # Phase 11 project tools
    assert "mal_create_project" in SYSTEM_PROMPT
    assert "mal_delete_project" in SYSTEM_PROMPT
    assert "mal_list_projects" in SYSTEM_PROMPT
    assert "mal_update_project" in SYSTEM_PROMPT
    assert "mal_get_project" in SYSTEM_PROMPT


def test_system_prompt_has_47_tools():
    """System prompt should reference 47 MCP tools."""
    from app.agent.prompts import SYSTEM_PROMPT
    assert "47 MCP tools" in SYSTEM_PROMPT


def test_system_prompt_has_capabilities_section():
    """System prompt should include capabilities section with examples."""
    from app.agent.prompts import SYSTEM_PROMPT
    assert "Capabilities" in SYSTEM_PROMPT
    assert "mal_create_project" in SYSTEM_PROMPT
    assert "mal_update_work_item" in SYSTEM_PROMPT


def test_system_prompt_has_destructive_operations_section():
    """System prompt should list destructive operations."""
    from app.agent.prompts import SYSTEM_PROMPT
    assert "Destructive Operations" in SYSTEM_PROMPT
    assert "mal_delete_skill" in SYSTEM_PROMPT
    assert "mal_delete_project" in SYSTEM_PROMPT
    assert "mal_import_catalog" in SYSTEM_PROMPT
    assert "mal_execute_command" in SYSTEM_PROMPT


def test_destructive_tools_constant():
    """DESTRUCTIVE_TOOLS should contain the 4 expected tools."""
    from app.agent.graph import DESTRUCTIVE_TOOLS
    assert "mal_delete_skill" in DESTRUCTIVE_TOOLS
    assert "mal_delete_project" in DESTRUCTIVE_TOOLS
    assert "mal_import_catalog" in DESTRUCTIVE_TOOLS
    assert "mal_execute_command" in DESTRUCTIVE_TOOLS
    assert len(DESTRUCTIVE_TOOLS) == 4
