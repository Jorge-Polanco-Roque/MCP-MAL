import { useEffect, useRef } from "react";
import { MessageSquare, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { useChat } from "@/hooks/useChat";

export function ChatPanel() {
  const { messages, sendMessage, clearMessages, isStreaming, connected } = useChat();
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
          <span className="flex items-center gap-1 text-xs">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Connected</span>
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
              Ask me about skills, commands, subagents, or anything in the catalog.
            </p>
            <div className="mt-6 space-y-2 text-xs text-gray-400">
              <p>"List all DevOps skills"</p>
              <p>"Search for deployment commands"</p>
              <p>"Show me the catalog stats"</p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={isStreaming || !connected} />
    </div>
  );
}
