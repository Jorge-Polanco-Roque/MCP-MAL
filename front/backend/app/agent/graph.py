from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.state import AgentState
from app.config import settings

# Tools that require user confirmation before execution
DESTRUCTIVE_TOOLS = frozenset({
    "mal_delete_skill",
    "mal_delete_project",
    "mal_import_catalog",
    "mal_execute_command",
})


def build_agent(tools: list):
    """Build the LangGraph agent with MCP tools and human-in-the-loop confirmation."""
    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        streaming=True,
    )
    model_with_tools = llm.bind_tools(tools)
    base_tool_node = ToolNode(tools)

    async def call_model(state: AgentState) -> dict:
        messages = state["messages"]
        system = SystemMessage(content=SYSTEM_PROMPT)
        response = await model_with_tools.ainvoke([system] + messages)
        return {"messages": [response]}

    async def guarded_tools(state: AgentState) -> dict:
        """Tool node that intercepts destructive tool calls with interrupt()."""
        last = state["messages"][-1]
        for tc in getattr(last, "tool_calls", None) or []:
            if tc["name"] in DESTRUCTIVE_TOOLS:
                # Pause the graph and ask the user for confirmation
                response = interrupt({
                    "type": "destructive_tool_confirmation",
                    "tool_name": tc["name"],
                    "arguments": tc["args"],
                    "message": f"This will execute a destructive operation: {tc['name']}. Do you want to proceed?",
                })
                # User denied — return cancellation message for each destructive call
                if not response.get("approved"):
                    return {
                        "messages": [
                            ToolMessage(
                                content="Operation cancelled by user.",
                                tool_call_id=tc["id"],
                            )
                        ]
                    }
        # All destructive calls approved (or no destructive calls) — run normally
        return await base_tool_node.ainvoke(state)

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("call_model", call_model)
    graph.add_node("tools", guarded_tools)

    graph.set_entry_point("call_model")
    graph.add_conditional_edges("call_model", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "call_model")

    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)
