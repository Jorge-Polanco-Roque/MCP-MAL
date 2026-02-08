from datetime import datetime

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "tool"
    content: str
    tool_calls: list[dict] | None = None
    timestamp: datetime | None = None


class ToolCallInfo(BaseModel):
    tool_name: str
    arguments: dict
    result: str | None = None
    duration_ms: float | None = None


class StreamChunk(BaseModel):
    type: str  # "token" | "tool_call" | "tool_result" | "error" | "done"
    content: str = ""
    tool_call: ToolCallInfo | None = None


class CatalogItem(BaseModel):
    id: str
    name: str
    description: str
    category: str | None = None
    type: str  # "skill" | "command" | "subagent" | "mcp"
    updated_at: str | None = None


class HealthResponse(BaseModel):
    mcp_status: str
    agent_status: str
    tools_count: int
    agents_available: list[str] = []
    timestamp: datetime


class StatsResponse(BaseModel):
    skills_count: int
    commands_count: int
    subagents_count: int
    mcps_count: int
