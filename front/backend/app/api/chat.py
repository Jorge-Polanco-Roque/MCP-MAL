import json
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage
from langgraph.types import Command

router = APIRouter()
logger = logging.getLogger(__name__)


def _safe_json(obj: object) -> str:
    """JSON serialize with fallback for non-serializable objects."""
    def default(o: object) -> str:
        return str(o)
    return json.dumps(obj, default=default)


def _extract_content(content: object) -> str:
    """Extract string content from various LangChain content types."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
        return "".join(parts)
    return str(content)


_INTERNAL_KEYS = {"runtime", "config", "callbacks", "store", "context"}


def _safe_args(data: object) -> dict:
    """Extract tool arguments safely, filtering LangGraph internal keys."""
    if isinstance(data, dict):
        result = {}
        for k, v in data.items():
            if k in _INTERNAL_KEYS:
                continue
            try:
                json.dumps(v)
                result[k] = v
            except (TypeError, ValueError):
                result[k] = str(v)
        return result
    return {}


async def _stream_and_check_interrupt(
    ws: WebSocket,
    agent,
    input_data,
    config: dict,
) -> None:
    """Stream agent execution and check for interrupts at the end.

    Sends token/tool_call/tool_result events over WS.
    If the graph pauses (interrupt), sends a 'confirm' event instead of 'done'.
    Otherwise sends 'done'.
    """
    try:
        await _do_stream(ws, agent, input_data, config)
    except Exception as e:
        error_msg = str(e)
        # Detect corrupted thread state (orphaned tool_calls without ToolMessages).
        # This happens when the server crashes mid-tool-call and the checkpointer
        # saved an incomplete conversation. Fix: clear the thread and retry once.
        if "tool_call_id" in error_msg and "did not have response messages" in error_msg:
            logger.warning("Corrupted thread state detected, clearing thread %s",
                           config["configurable"]["thread_id"])
            try:
                await agent.checkpointer.adelete_thread(config["configurable"]["thread_id"])
            except Exception:
                logger.warning("Could not delete thread, continuing with fresh state")
            try:
                await _do_stream(ws, agent, input_data, config)
                return
            except Exception as retry_err:
                logger.exception("Retry after thread clear also failed")
                error_msg = str(retry_err)

        logger.exception("Agent streaming error")
        await ws.send_text(json.dumps({
            "type": "error",
            "content": f"Agent error: {error_msg}",
        }))


async def _do_stream(
    ws: WebSocket,
    agent,
    input_data,
    config: dict,
) -> None:
    """Inner streaming loop — separated so _stream_and_check_interrupt can retry."""
    async for event in agent.astream_events(
        input_data,
        config=config,
        version="v2",
    ):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            chunk = event["data"].get("chunk")
            if chunk and hasattr(chunk, "content"):
                text = _extract_content(chunk.content)
                if text:
                    await ws.send_text(json.dumps({
                        "type": "token",
                        "content": text,
                    }))

        elif kind == "on_tool_start":
            tool_name = event.get("name", "unknown")
            raw_input = event.get("data", {}).get("input", {})
            await ws.send_text(json.dumps({
                "type": "tool_call",
                "content": "",
                "tool_call": {
                    "tool_name": tool_name,
                    "arguments": _safe_args(raw_input),
                },
            }))

        elif kind == "on_tool_end":
            tool_name = event.get("name", "unknown")
            output = event.get("data", {}).get("output", "")
            if hasattr(output, "content"):
                result_text = _extract_content(output.content)
            else:
                result_text = str(output)
            await ws.send_text(json.dumps({
                "type": "tool_result",
                "content": "",
                "tool_call": {
                    "tool_name": tool_name,
                    "arguments": {},
                    "result": result_text,
                },
            }))

    # Check if the graph is paused (interrupt pending)
    state = await agent.aget_state(config)
    if state.next:  # graph paused, not at END
        for task in state.tasks:
            if hasattr(task, "interrupts") and task.interrupts:
                interrupt_value = task.interrupts[0].value
                await ws.send_text(json.dumps({
                    "type": "confirm",
                    "content": "",
                    "confirm": interrupt_value,
                }))
                return  # don't send "done" — waiting for user response

    await ws.send_text(json.dumps({"type": "done", "content": ""}))


async def _stream_agent(ws: WebSocket, agent_name: str, prompt: str) -> None:
    """Stream a named agent's execution over WebSocket."""
    from app.main import get_agent

    agent = get_agent(agent_name)
    if agent is None:
        await ws.send_text(json.dumps({
            "type": "error",
            "content": f"{agent_name} agent is not available.",
        }))
        return

    messages = [HumanMessage(content=prompt)]
    try:
        async for event in agent.astream_events(
            {"messages": messages},
            version="v2",
        ):
            kind = event["event"]

            if kind == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                if chunk and hasattr(chunk, "content"):
                    text = _extract_content(chunk.content)
                    if text:
                        await ws.send_text(json.dumps({
                            "type": "token",
                            "content": text,
                        }))

            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                raw_input = event.get("data", {}).get("input", {})
                await ws.send_text(json.dumps({
                    "type": "tool_call",
                    "content": "",
                    "tool_call": {
                        "tool_name": tool_name,
                        "arguments": _safe_args(raw_input),
                    },
                }))

            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown")
                output = event.get("data", {}).get("output", "")
                if hasattr(output, "content"):
                    result_text = _extract_content(output.content)
                else:
                    result_text = str(output)
                await ws.send_text(json.dumps({
                    "type": "tool_result",
                    "content": "",
                    "tool_call": {
                        "tool_name": tool_name,
                        "arguments": {},
                        "result": result_text,
                    },
                }))

        await ws.send_text(json.dumps({"type": "done", "content": ""}))
    except Exception as e:
        logger.exception("Agent %s streaming error", agent_name)
        await ws.send_text(json.dumps({
            "type": "error",
            "content": f"Agent error: {str(e)}",
        }))


@router.websocket("/ws/chat")
async def chat_websocket(ws: WebSocket):
    """WebSocket endpoint for chat with the LangGraph agent.

    Supports human-in-the-loop confirmation for destructive operations.
    Each connection gets a unique thread_id for checkpointer-based state.
    """
    await ws.accept()
    logger.info("WebSocket client connected")

    # Default thread_id if client doesn't provide one
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type", "message")

            # Use client-provided thread_id for persistent memory
            client_thread = payload.get("thread_id")
            if client_thread and client_thread != thread_id:
                thread_id = client_thread
                config = {"configurable": {"thread_id": thread_id}}

            # --- Handle confirmation response (resume interrupted graph) ---
            if msg_type == "confirm_response":
                approved = payload.get("approved", False)
                from app.main import get_agent
                agent = get_agent("chat")
                if agent is None:
                    await ws.send_text(json.dumps({
                        "type": "error",
                        "content": "Agent not initialized.",
                    }))
                    continue

                resume_input = Command(resume={"approved": approved})
                await _stream_and_check_interrupt(ws, agent, resume_input, config)
                continue

            # --- Handle normal chat message ---
            user_message = payload.get("message", "")
            if not user_message.strip():
                continue

            from app.main import get_agent
            agent = get_agent("chat")
            if agent is None:
                await ws.send_text(json.dumps({
                    "type": "error",
                    "content": "Agent not initialized. Check MCP server connection.",
                }))
                continue

            # Only send the new user message — MemorySaver checkpointer
            # already persists conversation history across turns within
            # the same thread_id. Sending full history would cause
            # quadratic message growth (history both sent AND stored).
            context = payload.get("context", "")
            if context:
                enriched = (
                    f"[PROJECT CONTEXT — use this to ground your answers]\n"
                    f"{context}\n"
                    f"[END CONTEXT]\n\n"
                    f"{user_message}"
                )
                new_message = HumanMessage(content=enriched)
            else:
                new_message = HumanMessage(content=user_message)

            await _stream_and_check_interrupt(
                ws, agent, {"messages": [new_message]}, config
            )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception:
        logger.exception("WebSocket error")


@router.websocket("/ws/sprint-report")
async def ws_sprint_report(ws: WebSocket):
    """Stream sprint report generation in real-time."""
    await ws.accept()
    try:
        data = await ws.receive_text()
        payload = json.loads(data)
        sprint_id = payload.get("sprint_id", "")
        repo_path = payload.get("repo_path")
        days = payload.get("days", 14)

        prompt = f"""Generate a comprehensive sprint report.

Sprint ID: {sprint_id}
Repository path: {repo_path or "(default)"}
Commit activity lookback: {days} days

Fetch all data, analyze, generate report, and store results."""

        await _stream_agent(ws, "sprint_reporter", prompt)
    except WebSocketDisconnect:
        logger.info("Sprint report WS disconnected")
    except Exception:
        logger.exception("Sprint report WS error")


@router.websocket("/ws/next-steps")
async def ws_next_steps(ws: WebSocket):
    """Stream next steps suggestions in real-time."""
    await ws.accept()
    try:
        data = await ws.receive_text()
        payload = json.loads(data)
        user_id = payload.get("user_id")
        sprint_id = payload.get("sprint_id")
        project_id = payload.get("project_id")

        project_line = f"Project ID: {project_id}" if project_id else ""
        prompt = f"""Generate next step suggestions.

User ID: {user_id or "(all team)"}
Sprint ID: {sprint_id or "(active sprint)"}
{project_line}

Gather context, analyze priorities, and generate 5-10 actionable suggestions."""

        await _stream_agent(ws, "next_steps", prompt)
    except WebSocketDisconnect:
        logger.info("Next steps WS disconnected")
    except Exception:
        logger.exception("Next steps WS error")


@router.websocket("/ws/code-review")
async def ws_code_review(ws: WebSocket):
    """Stream code review analysis in real-time."""
    await ws.accept()
    try:
        data = await ws.receive_text()
        payload = json.loads(data)
        code = payload.get("code", "")
        language = payload.get("language", "")
        context = payload.get("context", "")

        prompt = f"""Review the following code and provide structured feedback.

Language: {language or "(auto-detect)"}
Context: {context or "(none provided)"}

```
{code}
```

Check for security issues (OWASP Top 10), performance, readability, and testing. Reference team standards from the skills catalog when available."""

        await _stream_agent(ws, "code_reviewer", prompt)
    except WebSocketDisconnect:
        logger.info("Code review WS disconnected")
    except Exception:
        logger.exception("Code review WS error")


@router.websocket("/ws/daily-summary")
async def ws_daily_summary(ws: WebSocket):
    """Stream daily/weekly team summary in real-time."""
    await ws.accept()
    try:
        data = await ws.receive_text()
        payload = json.loads(data)
        period = payload.get("period", "daily")
        project_id = payload.get("project_id")
        sprint_id = payload.get("sprint_id")

        project_line = f"Project ID: {project_id}" if project_id else ""
        sprint_line = f"Sprint ID: {sprint_id}" if sprint_id else ""
        prompt = f"""Generate a {period} team summary.

{project_line}
{sprint_line}

Check active sprints, recent work items, commit activity, interactions, and leaderboard. Format as a structured digest with Yesterday/Today/Blockers sections."""

        await _stream_agent(ws, "daily_summary", prompt)
    except WebSocketDisconnect:
        logger.info("Daily summary WS disconnected")
    except Exception:
        logger.exception("Daily summary WS error")
