import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage, AIMessage

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


@router.websocket("/ws/chat")
async def chat_websocket(ws: WebSocket):
    """WebSocket endpoint for chat with the LangGraph agent."""
    await ws.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            user_message = payload.get("message", "")

            if not user_message.strip():
                continue

            from app.main import get_agent

            agent = get_agent()
            if agent is None:
                await ws.send_text(json.dumps({
                    "type": "error",
                    "content": "Agent not initialized. Check MCP server connection.",
                }))
                continue

            messages: list = []
            for msg in payload.get("history", []):
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
            messages.append(HumanMessage(content=user_message))

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
                logger.exception("Agent error")
                await ws.send_text(json.dumps({
                    "type": "error",
                    "content": f"Agent error: {str(e)}",
                }))

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception:
        logger.exception("WebSocket error")
