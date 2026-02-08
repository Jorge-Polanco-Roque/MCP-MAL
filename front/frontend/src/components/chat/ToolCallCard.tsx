import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ToolCallInfo } from "@/lib/types";

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const categoryColor = toolCall.toolName.includes("skill")
    ? "default"
    : toolCall.toolName.includes("command")
      ? "warning"
      : toolCall.toolName.includes("subagent")
        ? "success"
        : "secondary";

  return (
    <div className="my-2 rounded-md border border-gray-200 bg-gray-50 text-sm">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <Wrench className="h-4 w-4 text-mal-500" />
        <Badge variant={categoryColor}>{toolCall.toolName}</Badge>
        {toolCall.result && (
          <span className="ml-auto text-xs text-green-600">completed</span>
        )}
        {!toolCall.result && (
          <span className="ml-auto text-xs text-yellow-600">running...</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-3 py-2 space-y-2">
          {Object.keys(toolCall.arguments).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Arguments</p>
              <pre className="rounded bg-white p-2 text-xs text-gray-700 overflow-x-auto border">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Result</p>
              <pre className="rounded bg-white p-2 text-xs text-gray-700 overflow-x-auto border max-h-48 overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
