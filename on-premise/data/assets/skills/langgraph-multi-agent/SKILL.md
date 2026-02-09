# LangGraph Multi-Agent Systems

## Overview

Build specialized AI agents using LangGraph's `StateGraph`. Each agent has its own system prompt, tool subset, and state management. Used in MAL Hub for 5 agents: Chat, Interaction Analyzer, Sprint Reporter, Next Steps Suggester, Contribution Scorer.

## Architecture Pattern

```python
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def build_agent(tools: list, system_prompt: str) -> StateGraph:
    llm = ChatOpenAI(model="gpt-4o", temperature=0, streaming=True)
    llm_with_tools = llm.bind_tools(tools)

    def call_model(state: AgentState):
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        return {"messages": [llm_with_tools.invoke(messages)]}

    def should_continue(state: AgentState):
        last = state["messages"][-1]
        return "tools" if last.tool_calls else END

    graph = StateGraph(AgentState)
    graph.add_node("call_model", call_model)
    graph.add_node("tools", ToolNode(tools))
    graph.set_entry_point("call_model")
    graph.add_conditional_edges("call_model", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "call_model")
    return graph.compile()
```

## Tool Filtering Per Agent

Not all agents need all tools. Filter tools by name prefix:

```python
AGENT_TOOLS = {
    "chat": None,  # All tools
    "interaction_analyzer": ["mal_log_interaction", "mal_search_interactions", "mal_get_work_item", "mal_log_contribution", "mal_get_team_member"],
    "sprint_reporter": ["mal_get_sprint", "mal_list_work_items", "mal_list_interactions", "mal_get_commit_activity", "mal_update_sprint", "mal_get_leaderboard"],
    "next_steps": ["mal_list_work_items", "mal_list_sprints", "mal_list_interactions", "mal_get_commit_activity", "mal_get_leaderboard", "mal_get_sprint"],
    "contribution_scorer": ["mal_log_contribution", "mal_get_team_member", "mal_get_achievements", "mal_register_team_member", "mal_list_team_members"],
}

def filter_tools(all_tools: list, allowed: list[str] | None) -> list:
    if allowed is None:
        return all_tools
    return [t for t in all_tools if t.name in allowed]
```

## Streaming with astream_events v2

```python
async for event in agent.astream_events(
    {"messages": [HumanMessage(content=user_input)]},
    version="v2",
):
    kind = event["event"]
    if kind == "on_chat_model_stream":
        chunk = event["data"]["chunk"]
        content = _extract_content(chunk.content)
        if content:
            yield {"type": "token", "content": content}
    elif kind == "on_tool_start":
        args = _safe_args(event["data"].get("input", {}))
        yield {"type": "tool_call", "name": event["name"], "arguments": args}
    elif kind == "on_tool_end":
        yield {"type": "tool_result", "name": event["name"], "output": str(event["data"].get("output", ""))}
```

## Key Gotchas

1. **`on_tool_start` contains non-serializable `ToolRuntime`** — Filter out internal keys (`runtime`, `config`, `callbacks`, `store`, `context`) before JSON serialization.

2. **`chunk.content` can be str, list, or dict** — Normalize with `_extract_content()`:
   ```python
   def _extract_content(content) -> str:
       if isinstance(content, str):
           return content
       if isinstance(content, list):
           return "".join(c.get("text", "") for c in content if isinstance(c, dict))
       return ""
   ```

3. **`tool.ainvoke()` returns list, not object** — `langchain-mcp-adapters` returns `[{'type': 'text', 'text': '...'}]`, not an object with `.content`.

4. **langchain-mcp-adapters 0.1.0+ removed context manager** — Use `client = MultiServerMCPClient(config)` directly, no `async with`.

## Agent System Prompts

Keep prompts focused:
- Describe the agent's role in 1-2 sentences
- List available tools and when to use each
- Define output format expectations
- Include constraints (e.g., "only use data from tools, never fabricate")

## Testing Agents

```python
def test_agent_builds():
    mock_tools = [create_mock_tool("mal_list_skills")]
    agent = build_agent(mock_tools, "You are a test agent.")
    assert agent is not None

def test_tool_filtering():
    all_tools = [create_mock_tool(name) for name in ["mal_a", "mal_b", "mal_c"]]
    filtered = filter_tools(all_tools, ["mal_a", "mal_c"])
    assert len(filtered) == 2
```
