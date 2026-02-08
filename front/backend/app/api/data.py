"""REST API endpoints that proxy MCP tool calls for data access."""
import json
import logging
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


async def _call_tool(tool_name: str, args: dict | None = None) -> Any:
    """Find an MCP tool by name and invoke it. Returns parsed JSON or raw text."""
    from app.mcp.client import get_mcp_tools

    tools = await get_mcp_tools()
    tool = next((t for t in tools if t.name == tool_name), None)
    if not tool:
        return {"error": f"Tool {tool_name} not found"}

    result = await tool.ainvoke(args or {})

    # Normalize: result can be a list, an object with .content, or a string
    if isinstance(result, list):
        content = result
    elif hasattr(result, "content"):
        content = result.content
    else:
        content = str(result)

    # LangChain MCP tools return content as a list of dicts: [{'type': 'text', 'text': '...'}]
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text_parts.append(item.get("text", ""))
            elif isinstance(item, str):
                text_parts.append(item)
        content = "\n".join(text_parts)

    # Try to extract JSON from markdown-wrapped responses
    if isinstance(content, str):
        try:
            return json.loads(content)
        except (json.JSONDecodeError, ValueError):
            pass
    return {"data": str(content) if not isinstance(content, str) else content}


def _parse_md_table(text: str) -> list[dict]:
    """Parse a markdown table into a list of dicts. Best-effort."""
    lines = text.strip().split("\n")
    table_lines = [ln for ln in lines if ln.strip().startswith("|")]
    if len(table_lines) < 3:
        return []
    headers = [h.strip() for h in table_lines[0].split("|")[1:-1]]
    rows = []
    for line in table_lines[2:]:
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))
    return rows


# ────────────────────────── Sprints ──────────────────────────


@router.get("/sprints")
async def list_sprints(status: str | None = None, limit: int = 20, offset: int = 0):
    """List sprints with optional status filter."""
    args: dict = {"limit": limit, "offset": offset}
    if status:
        args["status"] = status
    return await _call_tool("mal_list_sprints", args)


@router.get("/sprints/{sprint_id}")
async def get_sprint(sprint_id: str):
    """Get sprint details."""
    return await _call_tool("mal_get_sprint", {"sprint_id": sprint_id})


@router.post("/sprints")
async def create_sprint(body: dict):
    """Create a new sprint."""
    return await _call_tool("mal_create_sprint", body)


@router.put("/sprints/{sprint_id}")
async def update_sprint(sprint_id: str, body: dict):
    """Update a sprint."""
    body["sprint_id"] = sprint_id
    return await _call_tool("mal_update_sprint", body)


# ────────────────────────── Work Items ──────────────────────────


@router.get("/work-items")
async def list_work_items(
    sprint_id: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """List work items with filters."""
    args: dict = {"limit": limit, "offset": offset}
    if sprint_id:
        args["sprint_id"] = sprint_id
    if status:
        args["status"] = status
    if priority:
        args["priority"] = priority
    if assignee_id:
        args["assignee_id"] = assignee_id
    return await _call_tool("mal_list_work_items", args)


@router.get("/work-items/{item_id}")
async def get_work_item(item_id: str):
    """Get work item details."""
    return await _call_tool("mal_get_work_item", {"item_id": item_id})


@router.post("/work-items")
async def create_work_item(body: dict):
    """Create a new work item."""
    return await _call_tool("mal_create_work_item", body)


@router.put("/work-items/{item_id}")
async def update_work_item(item_id: str, body: dict):
    """Update a work item."""
    body["item_id"] = item_id
    return await _call_tool("mal_update_work_item", body)


# ────────────────────────── Interactions ──────────────────────────


@router.get("/interactions")
async def list_interactions(
    user_id: str | None = None,
    type: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    """List interactions with optional filters."""
    args: dict = {"limit": limit, "offset": offset}
    if user_id:
        args["user_id"] = user_id
    if type:
        args["type"] = type
    return await _call_tool("mal_list_interactions", args)


@router.get("/interactions/search")
async def search_interactions(q: str, limit: int = 20):
    """Full-text search across interactions."""
    return await _call_tool("mal_search_interactions", {"query": q, "limit": limit})


# ────────────────────────── Analytics ──────────────────────────


@router.get("/analytics/commits")
async def get_commit_activity(days: int = 30, repo_path: str | None = None):
    """Get commit activity data."""
    args: dict = {"days": days}
    if repo_path:
        args["repo_path"] = repo_path
    return await _call_tool("mal_get_commit_activity", args)


@router.get("/analytics/leaderboard")
async def get_leaderboard(limit: int = 20):
    """Get team leaderboard."""
    return await _call_tool("mal_get_leaderboard", {"limit": limit})


@router.get("/analytics/sprint-report/{sprint_id}")
async def get_sprint_report(sprint_id: str):
    """Get sprint analytics report."""
    return await _call_tool("mal_get_sprint_report", {"sprint_id": sprint_id})


# ────────────────────────── Team ──────────────────────────


@router.get("/team/{member_id}")
async def get_team_member(member_id: str):
    """Get team member details."""
    return await _call_tool("mal_get_team_member", {"member_id": member_id})


@router.get("/team")
async def list_team(limit: int = 50):
    """List team via leaderboard (includes all registered members)."""
    return await _call_tool("mal_get_leaderboard", {"limit": limit})


# ────────────────────────── Achievements ──────────────────────────


# ────────────────────────── Context ──────────────────────────


@router.get("/context")
async def get_project_context():
    """Gather current project context for context-aware chat injection."""
    context_parts = []

    # Active sprints
    try:
        sprints_data = await _call_tool("mal_list_sprints", {"status": "active", "limit": 3})
        sprint_text = sprints_data.get("data", "") if isinstance(sprints_data, dict) else str(sprints_data)
        if sprint_text:
            context_parts.append(f"## Active Sprints\n{sprint_text}")
    except Exception:
        pass

    # Open work items
    try:
        items_data = await _call_tool("mal_list_work_items", {"status": "in_progress", "limit": 10})
        items_text = items_data.get("data", "") if isinstance(items_data, dict) else str(items_data)
        if items_text:
            context_parts.append(f"## In-Progress Work Items\n{items_text}")
    except Exception:
        pass

    # Recent commit activity
    try:
        commits_data = await _call_tool("mal_get_commit_activity", {"days": 7})
        commits_text = commits_data.get("data", "") if isinstance(commits_data, dict) else str(commits_data)
        if commits_text:
            context_parts.append(f"## Recent Commits (7 days)\n{commits_text}")
    except Exception:
        pass

    context = "\n\n".join(context_parts) if context_parts else ""
    return {"context": context, "sections": len(context_parts)}


# ────────────────────────── Activity Feed ──────────────────────────


@router.get("/activity")
async def get_activity_feed(limit: int = 20):
    """Aggregate recent activity: usage stats + recent interactions."""
    feed = {"items": [], "generated_at": None}
    import datetime

    feed["generated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Recent usage stats (tool calls)
    try:
        stats = await _call_tool("mal_get_usage_stats", {"days": 1})
        if isinstance(stats, dict):
            feed["stats"] = stats.get("data", stats)
    except Exception:
        pass

    # Recent interactions as activity items
    try:
        interactions = await _call_tool(
            "mal_list_interactions", {"limit": limit}
        )
        if isinstance(interactions, dict):
            feed["interactions"] = interactions.get("data", "")
    except Exception:
        pass

    # Recent leaderboard changes
    try:
        lb = await _call_tool("mal_get_leaderboard", {"limit": 5})
        if isinstance(lb, dict):
            feed["top_contributors"] = lb.get("data", "")
    except Exception:
        pass

    return feed


@router.get("/achievements")
async def list_achievements(
    user_id: str | None = None,
    category: str | None = None,
):
    """List achievements, optionally filtered by user or category."""
    args: dict = {}
    if user_id:
        args["user_id"] = user_id
    if category:
        args["category"] = category
    return await _call_tool("mal_get_achievements", args)
