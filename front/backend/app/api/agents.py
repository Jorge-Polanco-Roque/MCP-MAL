import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# --- Request/Response models ---

class AnalyzeInteractionRequest(BaseModel):
    """Request to analyze a completed conversation."""
    user_id: str
    session_id: str
    source: str = "web_chat"
    messages: list[dict]  # [{"role": "user"|"assistant", "content": "..."}]
    sprint_id: str | None = None
    work_item_id: str | None = None


class SprintReportRequest(BaseModel):
    """Request to generate a sprint report."""
    sprint_id: str
    repo_path: str | None = None
    days: int = 14


class NextStepsRequest(BaseModel):
    """Request for next step suggestions."""
    user_id: str | None = None
    sprint_id: str | None = None


class ScoreContributionRequest(BaseModel):
    """Request to score a contribution and award XP."""
    user_id: str
    contribution_type: str  # commit, interaction, work_item, review, sprint
    reference_id: str | None = None
    metadata: dict = {}


class AgentResponse(BaseModel):
    """Generic response from a specialized agent."""
    agent: str
    result: str
    timestamp: str


# --- Helpers ---

def _build_prompt_from_request(data: dict, template: str) -> str:
    """Build a human message from request data and template."""
    parts = [template]
    for key, value in data.items():
        if value is not None:
            parts.append(f"- {key}: {json.dumps(value, default=str)}")
    return "\n".join(parts)


async def _run_agent(agent_name: str, prompt: str) -> AgentResponse:
    """Run a named agent with a prompt and return the final response."""
    from app.main import get_agent

    agent = get_agent(agent_name)
    if agent is None:
        return AgentResponse(
            agent=agent_name,
            result=f"Error: {agent_name} agent is not available. Check server logs.",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    messages = [HumanMessage(content=prompt)]
    try:
        result = await agent.ainvoke({"messages": messages})
        last_message = result["messages"][-1]
        content = last_message.content if hasattr(last_message, "content") else str(last_message)
        return AgentResponse(
            agent=agent_name,
            result=content,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        logger.exception("Agent %s error", agent_name)
        return AgentResponse(
            agent=agent_name,
            result=f"Error running {agent_name}: {str(e)}",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


# --- REST Endpoints ---

@router.post("/analyze-interaction", response_model=AgentResponse)
async def analyze_interaction(req: AnalyzeInteractionRequest):
    """Analyze a completed conversation and extract structured metadata."""
    conversation = "\n".join(
        f"[{m['role']}]: {m['content']}" for m in req.messages
    )
    prompt = f"""Analyze this conversation and store it as an interaction.

User ID: {req.user_id}
Session ID: {req.session_id}
Source: {req.source}
Sprint ID: {req.sprint_id or "(none)"}
Work Item ID: {req.work_item_id or "(none)"}

--- CONVERSATION ---
{conversation}
--- END ---

Instructions:
1. Generate a title, summary, decisions, action items, and tags
2. Store the interaction using mal_log_interaction with ALL the messages
3. Award XP to the user using mal_log_contribution (base 5 + 3 per tool used + 5 if decisions found, cap 30)
4. Return a summary of what was stored and XP awarded"""

    return await _run_agent("interaction_analyzer", prompt)


@router.post("/sprint-report", response_model=AgentResponse)
async def generate_sprint_report(req: SprintReportRequest):
    """Generate a comprehensive sprint report with AI analysis."""
    prompt = f"""Generate a comprehensive sprint report.

Sprint ID: {req.sprint_id}
Repository path: {req.repo_path or "(default)"}
Commit activity lookback: {req.days} days

Instructions:
1. Fetch the sprint details
2. Get all work items for this sprint
3. Get commit activity data
4. Get the sprint analytics report
5. Generate a full report with velocity, health, retrospective
6. Store the summary and retrospective back to the sprint using mal_update_sprint"""

    return await _run_agent("sprint_reporter", prompt)


@router.post("/next-steps", response_model=AgentResponse)
async def suggest_next_steps(req: NextStepsRequest):
    """Generate AI-powered next step suggestions based on current project state."""
    prompt = f"""Generate prioritized next step suggestions for the team.

User ID: {req.user_id or "(all team)"}
Sprint ID: {req.sprint_id or "(active sprint)"}

Instructions:
1. Check active sprints
2. List open/in-progress work items
3. Review recent interactions for pending decisions
4. Check commit activity patterns
5. Generate 5-10 specific, actionable suggestions ranked by priority
6. Each suggestion must reference real data (item IDs, sprint names, etc.)"""

    return await _run_agent("next_steps", prompt)


@router.post("/score-contribution", response_model=AgentResponse)
async def score_contribution(req: ScoreContributionRequest):
    """Score a contribution, award XP, and check achievement unlocks."""
    metadata_str = json.dumps(req.metadata) if req.metadata else "{}"
    prompt = f"""Score this contribution and award XP.

User ID: {req.user_id}
Contribution type: {req.contribution_type}
Reference ID: {req.reference_id or "(none)"}
Metadata: {metadata_str}

Instructions:
1. Calculate XP using the scoring rules
2. Log the contribution with mal_log_contribution
3. Check if any achievements should unlock
4. Return: XP awarded, new total XP, level, streak, and any achievements unlocked"""

    return await _run_agent("contribution_scorer", prompt)
