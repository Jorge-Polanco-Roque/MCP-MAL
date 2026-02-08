import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { ChatMessage, ConfirmationPayload, StreamChunk, ToolCallInfo } from "../lib/types";
import { generateId } from "../lib/utils";
import { useWebSocket } from "./useWebSocket";
import { fetchProjectContext } from "../lib/api";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextEnabled, setContextEnabled] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationPayload | null>(null);
  const currentAssistantRef = useRef<string | null>(null);
  const toolCallsRef = useRef<ToolCallInfo[]>([]);

  const wsUrl =
    (window.location.protocol === "https:" ? "wss:" : "ws:") +
    "//" +
    window.location.host +
    "/ws/chat";

  const handleMessage = useCallback((raw: string) => {
    let chunk: StreamChunk;
    try {
      chunk = JSON.parse(raw);
    } catch {
      console.warn("Received malformed WebSocket message:", raw);
      return;
    }

    switch (chunk.type) {
      case "token": {
        const id = currentAssistantRef.current;
        if (!id) {
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

      case "confirm": {
        // Destructive tool confirmation request from the backend
        if (chunk.confirm) {
          const confirmPayload = chunk.confirm;
          setPendingConfirmation(confirmPayload);

          // Add a confirmation message to the chat
          const confirmMsgId = generateId();
          setMessages((prev) => [
            ...prev,
            {
              id: confirmMsgId,
              role: "assistant",
              content: "",
              confirmation: confirmPayload,
              confirmationResponded: false,
              timestamp: new Date(),
            },
          ]);
          // Don't reset streaming — we're waiting for user response
          setIsStreaming(false);
          currentAssistantRef.current = null;
          toolCallsRef.current = [];
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

  const { connected, status: wsStatus, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
  });

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming || pendingConfirmation) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Fetch project context if enabled (first message or on demand)
      let context = "";
      if (contextEnabled) {
        try {
          const ctx = await fetchProjectContext();
          context = ctx.context;
        } catch {
          toast.error("Context fetch failed — sending without context");
        }
      }

      send(JSON.stringify({ message: content, history, context }));
    },
    [send, messages, isStreaming, contextEnabled, pendingConfirmation]
  );

  const respondToConfirmation = useCallback(
    (approved: boolean) => {
      if (!pendingConfirmation) return;

      // Mark the confirmation message as responded
      setMessages((prev) =>
        prev.map((m) =>
          m.confirmation && !m.confirmationResponded
            ? { ...m, confirmationResponded: true }
            : m
        )
      );

      setPendingConfirmation(null);
      setIsStreaming(true);

      // Send the confirmation response to the backend
      send(JSON.stringify({ type: "confirm_response", approved }));
    },
    [pendingConfirmation, send]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingConfirmation(null);
  }, []);

  const toggleContext = useCallback(() => {
    setContextEnabled((prev) => !prev);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isStreaming,
    connected,
    wsStatus,
    contextEnabled,
    toggleContext,
    pendingConfirmation,
    respondToConfirmation,
  };
}
