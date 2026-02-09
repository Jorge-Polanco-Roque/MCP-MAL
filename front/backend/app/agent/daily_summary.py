import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.agent.prompts import DAILY_SUMMARY_PROMPT
from app.agent.state import AgentState
from app.config import settings

logger = logging.getLogger(__name__)

TOOL_NAMES = {
    "mal_get_commit_activity",
    "mal_list_work_items",
    "mal_list_interactions",
    "mal_get_sprint_report",
    "mal_get_leaderboard",
    "mal_list_sprints",
}


def build_daily_summary(all_tools: list):
    """Build a LangGraph agent specialized in generating daily/weekly team digests."""
    tools = [t for t in all_tools if t.name in TOOL_NAMES]
    if not tools:
        logger.warning("No matching tools found for Daily Summary")
        return None

    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        streaming=True,
    )
    model_with_tools = llm.bind_tools(tools)

    async def call_model(state: AgentState) -> dict:
        messages = state["messages"]
        system = SystemMessage(content=DAILY_SUMMARY_PROMPT)
        response = await model_with_tools.ainvoke([system] + messages)
        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("call_model", call_model)
    graph.add_node("tools", ToolNode(tools))
    graph.set_entry_point("call_model")
    graph.add_conditional_edges("call_model", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "call_model")

    logger.info("Daily Summary built with %d tools", len(tools))
    return graph.compile()
