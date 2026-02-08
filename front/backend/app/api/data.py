"""REST API endpoints that proxy MCP tool calls for data access."""
import json
import logging
import os
import subprocess
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

REPO_CACHE_DIR = Path(os.environ.get("REPO_CACHE_DIR", "/tmp/mal-repo-cache"))


def _ensure_repo(repo_url: str, branch: str = "dev") -> str:
    """Clone or pull a GitHub repo into a local cache directory. Returns local path."""
    REPO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Derive a stable folder name from the repo URL
    # e.g. https://github.com/Jorge-Polanco-Roque/MCP-MAL/tree/dev -> Jorge-Polanco-Roque-MCP-MAL
    clean = repo_url.replace("https://github.com/", "").split("/tree/")[0]
    folder_name = clean.replace("/", "-")
    local_path = REPO_CACHE_DIR / folder_name

    # Extract the clone URL (strip /tree/branch if present)
    clone_url = repo_url.split("/tree/")[0]
    if not clone_url.endswith(".git"):
        clone_url = clone_url + ".git"

    if (local_path / ".git").exists():
        # Pull latest
        logger.info(f"Pulling latest for {folder_name} (branch {branch})")
        subprocess.run(
            ["git", "-C", str(local_path), "fetch", "--all"],
            capture_output=True, timeout=30,
        )
        subprocess.run(
            ["git", "-C", str(local_path), "checkout", branch],
            capture_output=True, timeout=10,
        )
        subprocess.run(
            ["git", "-C", str(local_path), "pull", "origin", branch],
            capture_output=True, timeout=30,
        )
    else:
        # Clone
        logger.info(f"Cloning {clone_url} (branch {branch}) into {local_path}")
        subprocess.run(
            ["git", "clone", "--branch", branch, clone_url, str(local_path)],
            capture_output=True, timeout=60,
        )

    return str(local_path)


async def _call_tool(tool_name: str, args: dict | None = None) -> Any:
    """Find an MCP tool by name and invoke it. Returns parsed JSON or raw text."""
    from app.mcp.client import get_mcp_tools

    tools = await get_mcp_tools()
    tool = next((t for t in tools if t.name == tool_name), None)
    if not tool:
        raise HTTPException(status_code=502, detail=f"Tool {tool_name} not found on MCP server")

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
async def list_sprints(status: str | None = None, project_id: str | None = None, limit: int = 20, offset: int = 0):
    """List sprints with optional status and project filter."""
    args: dict = {"limit": limit, "offset": offset}
    if status:
        args["status"] = status
    if project_id:
        args["project_id"] = project_id
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
    body["id"] = sprint_id
    return await _call_tool("mal_update_sprint", body)


# ────────────────────────── Sprints (structured JSON) ──────────────────────────


@router.get("/sprints-list")
async def list_sprints_json(status: str | None = None, project_id: str | None = None, limit: int = 50):
    """Return sprints as structured JSON for the sprint selector."""
    args: dict = {"format": "json", "limit": limit}
    if status:
        args["status"] = status
    if project_id:
        args["project_id"] = project_id
    result = await _call_tool("mal_list_sprints", args)
    items = result.get("items", []) if isinstance(result, dict) and "items" in result else []
    return {"items": items, "total": len(items)}


# ────────────────────────── Board (structured JSON for DnD) ──────────────────────────


@router.get("/board")
async def get_board(sprint_id: str | None = None, project_id: str | None = None):
    """Return structured work items grouped by status for the Kanban board."""
    args: dict = {"format": "json", "limit": 100}
    if sprint_id:
        args["sprint_id"] = sprint_id
    if project_id:
        args["project_id"] = project_id

    result = await _call_tool("mal_list_work_items", args)

    # With format=json, _call_tool's json.loads() will parse it into a dict
    items = result.get("items", []) if isinstance(result, dict) and "items" in result else []

    columns: dict[str, list] = {"todo": [], "in_progress": [], "review": [], "done": []}
    for item in items:
        status = item.get("status", "backlog") if isinstance(item, dict) else "backlog"
        if status in columns:
            columns[status].append(item)

    return {"columns": columns, "total": len(items)}


# ────────────────────────── Work Items ──────────────────────────


@router.get("/work-items")
async def list_work_items(
    sprint_id: str | None = None,
    project_id: str | None = None,
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
    if project_id:
        args["project_id"] = project_id
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
    return await _call_tool("mal_get_work_item", {"id": item_id})


@router.post("/work-items")
async def create_work_item(body: dict):
    """Create a new work item."""
    return await _call_tool("mal_create_work_item", body)


@router.put("/work-items/{item_id}")
async def update_work_item(item_id: str, body: dict):
    """Update a work item."""
    body["id"] = item_id
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


# ────────────────────────── Decisions ──────────────────────────


@router.post("/decisions")
async def create_decision(body: dict):
    """Create a decision by logging it as an interaction with decision tags."""
    title = body.get("title", "").strip()
    description = body.get("description", "").strip()
    user_id = body.get("user_id", "system")
    tags = body.get("tags", [])

    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    decision_id = str(uuid.uuid4())
    # Ensure "decision" tag is always present
    if "decision" not in tags:
        tags = ["decision"] + tags

    return await _call_tool("mal_log_interaction", {
        "id": decision_id,
        "session_id": f"decision-{decision_id}",
        "user_id": user_id,
        "source": "web_chat",
        "title": title,
        "summary": description or title,
        "decisions": [title],
        "action_items": [],
        "tools_used": [],
        "tags": tags,
        "messages": [],
    })


# ────────────────────────── Analytics ──────────────────────────


@router.get("/analytics/commits")
async def get_commit_activity(
    days: int = 30,
    repo_path: str | None = None,
    repo_url: str | None = None,
    project_id: str | None = None,
):
    """Get commit activity data. If repo_url is provided, clone/pull the repo first."""
    args: dict = {"days": days}

    if repo_url:
        local_path = _ensure_repo(repo_url, branch="dev")
        args["repo_path"] = local_path
    elif repo_path:
        args["repo_path"] = repo_path

    if project_id:
        args["project_id"] = project_id

    return await _call_tool("mal_get_commit_activity", args)


@router.get("/analytics/leaderboard")
async def get_leaderboard(limit: int = 20, project_id: str | None = None):
    """Get team leaderboard. Optionally filter by project."""
    args: dict = {"limit": limit}
    if project_id:
        args["project_id"] = project_id
    return await _call_tool("mal_get_leaderboard", args)


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



# ────────────────────────── Projects ──────────────────────────


@router.get("/projects")
async def list_projects(status: str | None = None, limit: int = 20, offset: int = 0):
    """List projects with optional status filter."""
    args: dict = {"limit": limit, "offset": offset}
    if status:
        args["status"] = status
    return await _call_tool("mal_list_projects", args)


@router.get("/projects-list")
async def list_projects_json(status: str | None = None, limit: int = 50):
    """Return projects as structured JSON for the project selector."""
    args: dict = {"format": "json", "limit": limit}
    if status:
        args["status"] = status
    result = await _call_tool("mal_list_projects", args)
    items = result.get("items", []) if isinstance(result, dict) and "items" in result else []
    return {"items": items, "total": len(items)}


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details."""
    return await _call_tool("mal_get_project", {"id": project_id})


@router.post("/projects")
async def create_project(body: dict):
    """Create a new project."""
    return await _call_tool("mal_create_project", body)


@router.put("/projects/{project_id}")
async def update_project(project_id: str, body: dict):
    """Update a project."""
    body["id"] = project_id
    return await _call_tool("mal_update_project", body)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, cascade: bool = False):
    """Delete a project. Set cascade=true to also delete sprints and work items."""
    return await _call_tool("mal_delete_project", {"id": project_id, "cascade": cascade})


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
