"""Tests for specialized LangGraph agents."""
from unittest.mock import patch, MagicMock

from langchain_core.tools import tool


# Mock tools matching each agent's required tool names
@tool
def mal_log_interaction(session_id: str) -> str:
    """Log an interaction."""
    return "logged"


@tool
def mal_search_interactions(query: str) -> str:
    """Search interactions."""
    return "results"


@tool
def mal_get_work_item(id: str) -> str:
    """Get work item."""
    return "item"


@tool
def mal_log_contribution(user_id: str) -> str:
    """Log contribution."""
    return "contribution"


@tool
def mal_list_sprints(status: str = "") -> str:
    """List sprints."""
    return "sprints"


@tool
def mal_get_sprint(sprint_id: str) -> str:
    """Get sprint."""
    return "sprint"


@tool
def mal_list_work_items(sprint_id: str = "") -> str:
    """List work items."""
    return "items"


@tool
def mal_list_interactions(user_id: str = "") -> str:
    """List interactions."""
    return "interactions"


@tool
def mal_get_commit_activity(days: int = 30) -> str:
    """Get commit activity."""
    return "activity"


@tool
def mal_get_sprint_report(sprint_id: str) -> str:
    """Get sprint report."""
    return "report"


@tool
def mal_update_sprint(sprint_id: str) -> str:
    """Update sprint."""
    return "updated"


@tool
def mal_get_leaderboard(limit: int = 20) -> str:
    """Get leaderboard."""
    return "leaderboard"


@tool
def mal_get_team_member(id: str) -> str:
    """Get team member."""
    return "member"


@tool
def mal_get_achievements(user_id: str = "") -> str:
    """Get achievements."""
    return "achievements"


@tool
def mal_register_team_member(id: str) -> str:
    """Register team member."""
    return "registered"


ALL_MOCK_TOOLS = [
    mal_log_interaction,
    mal_search_interactions,
    mal_get_work_item,
    mal_log_contribution,
    mal_list_sprints,
    mal_get_sprint,
    mal_list_work_items,
    mal_list_interactions,
    mal_get_commit_activity,
    mal_get_sprint_report,
    mal_update_sprint,
    mal_get_leaderboard,
    mal_get_team_member,
    mal_get_achievements,
    mal_register_team_member,
]


def _patch_llm():
    """Create a mock for ChatOpenAI that supports bind_tools."""
    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    return mock_llm


# --- Interaction Analyzer ---

def test_interaction_analyzer_builds():
    """Interaction Analyzer should compile with its tool subset."""
    with patch("app.agent.interaction_analyzer.ChatOpenAI") as mock_cls:
        mock_cls.return_value = _patch_llm()

        from app.agent.interaction_analyzer import build_interaction_analyzer
        agent = build_interaction_analyzer(ALL_MOCK_TOOLS)
        assert agent is not None
        assert hasattr(agent, "invoke")
        assert hasattr(agent, "astream_events")


def test_interaction_analyzer_filters_tools():
    """Interaction Analyzer should only use its own tool subset."""
    from app.agent.interaction_analyzer import TOOL_NAMES
    assert "mal_log_interaction" in TOOL_NAMES
    assert "mal_log_contribution" in TOOL_NAMES
    assert "mal_search_interactions" in TOOL_NAMES
    # Should NOT have sprint reporter tools
    assert "mal_update_sprint" not in TOOL_NAMES
    assert "mal_get_commit_activity" not in TOOL_NAMES


def test_interaction_analyzer_returns_none_with_no_tools():
    """Interaction Analyzer should return None if no matching tools found."""
    with patch("app.agent.interaction_analyzer.ChatOpenAI"):
        from app.agent.interaction_analyzer import build_interaction_analyzer
        agent = build_interaction_analyzer([])  # empty tools
        assert agent is None


# --- Sprint Reporter ---

def test_sprint_reporter_builds():
    """Sprint Reporter should compile with its tool subset."""
    with patch("app.agent.sprint_reporter.ChatOpenAI") as mock_cls:
        mock_cls.return_value = _patch_llm()

        from app.agent.sprint_reporter import build_sprint_reporter
        agent = build_sprint_reporter(ALL_MOCK_TOOLS)
        assert agent is not None
        assert hasattr(agent, "invoke")


def test_sprint_reporter_filters_tools():
    """Sprint Reporter should only use sprint-related tools."""
    from app.agent.sprint_reporter import TOOL_NAMES
    assert "mal_get_sprint" in TOOL_NAMES
    assert "mal_list_work_items" in TOOL_NAMES
    assert "mal_get_commit_activity" in TOOL_NAMES
    assert "mal_update_sprint" in TOOL_NAMES
    assert "mal_get_sprint_report" in TOOL_NAMES
    # Should NOT have contribution tools
    assert "mal_register_team_member" not in TOOL_NAMES


# --- Next Steps Suggester ---

def test_next_steps_builds():
    """Next Steps Suggester should compile with its tool subset."""
    with patch("app.agent.next_steps.ChatOpenAI") as mock_cls:
        mock_cls.return_value = _patch_llm()

        from app.agent.next_steps import build_next_steps_suggester
        agent = build_next_steps_suggester(ALL_MOCK_TOOLS)
        assert agent is not None
        assert hasattr(agent, "invoke")


def test_next_steps_filters_tools():
    """Next Steps Suggester should use context-gathering tools."""
    from app.agent.next_steps import TOOL_NAMES
    assert "mal_list_work_items" in TOOL_NAMES
    assert "mal_list_sprints" in TOOL_NAMES
    assert "mal_get_leaderboard" in TOOL_NAMES
    assert "mal_get_commit_activity" in TOOL_NAMES
    # Should NOT have write tools
    assert "mal_log_contribution" not in TOOL_NAMES
    assert "mal_update_sprint" not in TOOL_NAMES


# --- Contribution Scorer ---

def test_contribution_scorer_builds():
    """Contribution Scorer should compile with its tool subset."""
    with patch("app.agent.contribution_scorer.ChatOpenAI") as mock_cls:
        mock_cls.return_value = _patch_llm()

        from app.agent.contribution_scorer import build_contribution_scorer
        agent = build_contribution_scorer(ALL_MOCK_TOOLS)
        assert agent is not None
        assert hasattr(agent, "invoke")


def test_contribution_scorer_filters_tools():
    """Contribution Scorer should use gamification tools."""
    from app.agent.contribution_scorer import TOOL_NAMES
    assert "mal_log_contribution" in TOOL_NAMES
    assert "mal_get_team_member" in TOOL_NAMES
    assert "mal_get_achievements" in TOOL_NAMES
    assert "mal_register_team_member" in TOOL_NAMES
    # Should NOT have sprint tools
    assert "mal_get_sprint" not in TOOL_NAMES
    assert "mal_list_work_items" not in TOOL_NAMES


# --- Prompts ---

def test_prompts_exist_for_all_agents():
    """All specialized agents should have system prompts defined."""
    from app.agent.prompts import (
        SYSTEM_PROMPT,
        INTERACTION_ANALYZER_PROMPT,
        SPRINT_REPORTER_PROMPT,
        NEXT_STEPS_PROMPT,
        CONTRIBUTION_SCORER_PROMPT,
    )
    assert len(SYSTEM_PROMPT) > 100
    assert len(INTERACTION_ANALYZER_PROMPT) > 100
    assert len(SPRINT_REPORTER_PROMPT) > 100
    assert len(NEXT_STEPS_PROMPT) > 100
    assert len(CONTRIBUTION_SCORER_PROMPT) > 100


def test_system_prompt_describes_47_tools():
    """System prompt should describe all 47 MCP tools including Projects."""
    from app.agent.prompts import SYSTEM_PROMPT
    # Original tools
    assert "mal_list_skills" in SYSTEM_PROMPT
    assert "mal_search_catalog" in SYSTEM_PROMPT
    # Phase 5 tools
    assert "mal_log_interaction" in SYSTEM_PROMPT
    assert "mal_create_sprint" in SYSTEM_PROMPT
    assert "mal_create_work_item" in SYSTEM_PROMPT
    assert "mal_get_leaderboard" in SYSTEM_PROMPT
    assert "mal_get_commit_activity" in SYSTEM_PROMPT
    assert "mal_register_team_member" in SYSTEM_PROMPT
    # Phase 11 project tools
    assert "mal_create_project" in SYSTEM_PROMPT
    assert "mal_delete_project" in SYSTEM_PROMPT
    assert "47 MCP tools" in SYSTEM_PROMPT
