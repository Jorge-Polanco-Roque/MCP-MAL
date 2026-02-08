import { useEffect, useRef } from "react";
import { MessageSquare, Trash2, Wifi, WifiOff, RefreshCw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const {
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
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-mal-600" />
          <h2 className="font-semibold">Chat</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleContext}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              contextEnabled
                ? "bg-yellow-100 text-yellow-700"
                : "text-gray-400 hover:text-gray-600"
            )}
            title={
              contextEnabled
                ? "Context-aware: Active sprints & work items injected"
                : "Click to enable context-aware mode"
            }
          >
            <Brain className="h-3.5 w-3.5" />
            {contextEnabled ? "Context ON" : "Context"}
          </button>
          <span className="flex items-center gap-1 text-xs">
            {wsStatus === "connected" ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : wsStatus === "reconnecting" ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-yellow-500" />
                <span className="text-yellow-600">Reconnecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <span className="text-red-600">Disconnected</span>
              </>
            )}
          </span>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearMessages} title="Clear chat">
              <Trash2 className="h-4 w-4 text-gray-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-20 text-center text-gray-400">
            <MessageSquare className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Welcome to MAL MCP Hub</p>
            <p className="mt-1 text-sm">
              Ask me to create projects, manage sprints, track work items, or anything in the catalog.
            </p>
            <div className="mt-6 space-y-2 text-xs text-gray-400">
              <p>"Crea un proyecto llamado Mi App con repo https://github.com/org/repo"</p>
              <p>"Crea el sprint sprint-2026-w09 del 17 al 28 de febrero"</p>
              <p>"Mueve MAL-042 a review"</p>
              <p>"Muestra el leaderboard de bella-italia"</p>
              <p>"Borra el skill docker-compose-patterns"</p>
            </div>
            {contextEnabled && (
              <p className="mt-4 rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700">
                Context mode enabled — project state will be injected automatically
              </p>
            )}
          </div>
        ) : (
          <div className="py-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                onConfirmResponse={
                  msg.confirmation && !msg.confirmationResponded
                    ? respondToConfirmation
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        disabled={isStreaming || !connected || !!pendingConfirmation}
      />
    </div>
  );
}
