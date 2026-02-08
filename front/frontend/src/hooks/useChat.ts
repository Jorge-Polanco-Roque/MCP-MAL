import { useCallback, useRef, useState } from "react";
import type { ChatMessage, StreamChunk, ToolCallInfo } from "../lib/types";
import { generateId } from "../lib/utils";
import { useWebSocket } from "./useWebSocket";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const currentAssistantRef = useRef<string | null>(null);
  const toolCallsRef = useRef<ToolCallInfo[]>([]);

  const wsUrl =
    (window.location.protocol === "https:" ? "wss:" : "ws:") +
    "//" +
    window.location.host +
    "/ws/chat";

  const handleMessage = useCallback((raw: string) => {
    const chunk: StreamChunk = JSON.parse(raw);

    switch (chunk.type) {
      case "token": {
        const id = currentAssistantRef.current;
        if (!id) {
          // First token — create assistant message
          const newId = generateId();
          currentAssistantRef.current = newId;
          setMessages((prev) => [
            ...prev,
            {
              id: newId,
              role: "assistant",
              content: chunk.content,
              toolCalls: [],
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, content: m.content + chunk.content } : m
            )
          );
        }
        break;
      }

      case "tool_call": {
        if (chunk.tool_call) {
          const info: ToolCallInfo = {
            toolName: chunk.tool_call.tool_name,
            arguments: chunk.tool_call.arguments,
          };
          toolCallsRef.current = [...toolCallsRef.current, info];

          // Ensure assistant message exists
          if (!currentAssistantRef.current) {
            const newId = generateId();
            currentAssistantRef.current = newId;
            setMessages((prev) => [
              ...prev,
              {
                id: newId,
                role: "assistant",
                content: "",
                toolCalls: [info],
                timestamp: new Date(),
              },
            ]);
          } else {
            const id = currentAssistantRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id
                  ? { ...m, toolCalls: [...toolCallsRef.current] }
                  : m
              )
            );
          }
        }
        break;
      }

      case "tool_result": {
        if (chunk.tool_call) {
          // Update last tool call with result
          const calls = toolCallsRef.current;
          const lastIdx = calls.findIndex(
            (tc) =>
              tc.toolName === chunk.tool_call!.tool_name && !tc.result
          );
          if (lastIdx >= 0) {
            calls[lastIdx] = {
              ...calls[lastIdx],
              result: chunk.tool_call.result,
            };
            toolCallsRef.current = [...calls];
            const id = currentAssistantRef.current;
            if (id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id
                    ? { ...m, toolCalls: [...toolCallsRef.current] }
                    : m
                )
              );
            }
          }
        }
        break;
      }

      case "error": {
        const id = currentAssistantRef.current || generateId();
        if (!currentAssistantRef.current) {
          currentAssistantRef.current = id;
        }
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === id);
          if (existing) {
            return prev.map((m) =>
              m.id === id
                ? { ...m, content: m.content + `\n\n**Error:** ${chunk.content}` }
                : m
            );
          }
          return [
            ...prev,
            {
              id,
              role: "assistant",
              content: `**Error:** ${chunk.content}`,
              timestamp: new Date(),
            },
          ];
        });
        setIsStreaming(false);
        currentAssistantRef.current = null;
        toolCallsRef.current = [];
        break;
      }

      case "done":
        setIsStreaming(false);
        currentAssistantRef.current = null;
        toolCallsRef.current = [];
        break;
    }
  }, []);

  const { connected, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      // Send with history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      send(JSON.stringify({ message: content, history }));
    },
    [send, messages, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, sendMessage, clearMessages, isStreaming, connected };
}
