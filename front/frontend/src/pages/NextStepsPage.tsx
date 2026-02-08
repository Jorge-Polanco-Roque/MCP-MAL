import { useState, useCallback, useRef, useEffect } from "react";
import { Lightbulb, Play, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/useWebSocket";

export function NextStepsPage() {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sprintId, setSprintId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const wsUrl =
    (window.location.protocol === "https:" ? "wss:" : "ws:") +
    "//" +
    window.location.host +
    "/ws/next-steps";

  const handleMessage = useCallback((raw: string) => {
    let chunk: Record<string, unknown>;
    try {
      chunk = JSON.parse(raw);
    } catch {
      return;
    }
    const tc = chunk.tool_call as Record<string, unknown> | undefined;
    switch (chunk.type) {
      case "token":
        setContent((prev) => prev + String(chunk.content ?? ""));
        break;
      case "tool_call":
        setContent(
          (prev) =>
            prev + `\n\n> **Gathering data:** \`${tc?.tool_name ?? "tool"}\`...\n\n`
        );
        break;
      case "done":
        setIsStreaming(false);
        break;
      case "error":
        setContent((prev) => prev + `\n\n**Error:** ${String(chunk.content ?? "Unknown error")}`);
        setIsStreaming(false);
        break;
    }
  }, []);

  const { connected, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
  });

  const generate = useCallback(() => {
    setContent("");
    setIsStreaming(true);
    send(
      JSON.stringify({
        sprint_id: sprintId || undefined,
      })
    );
  }, [send, sprintId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Next Steps</h2>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            AI-Powered
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Sprint ID (optional)"
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="w-40 rounded-md border px-2 py-1.5 text-sm"
          />
          <Button
            size="sm"
            onClick={generate}
            disabled={isStreaming || !connected}
          >
            {isStreaming ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {content ? (
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block h-4 w-1 animate-pulse bg-gray-400" />
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <Lightbulb className="mb-4 h-16 w-16" />
            <p className="text-lg font-medium">AI-Powered Next Steps</p>
            <p className="mt-2 max-w-md text-sm">
              Click "Generate" to analyze your project state and get prioritized,
              actionable suggestions based on real data from sprints, work items,
              interactions, and team activity.
            </p>
            <p className="mt-4 text-xs">
              The AI agent will call multiple MCP tools to gather context before
              generating recommendations.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
