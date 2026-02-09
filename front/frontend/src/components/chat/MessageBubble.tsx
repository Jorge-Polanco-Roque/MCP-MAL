import { useMemo } from "react";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, formatDate } from "@/lib/utils";
import { ToolCallCard } from "./ToolCallCard";
import { ConfirmationCard } from "./ConfirmationCard";
import { findLinks } from "@/lib/autolink";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onConfirmResponse?: (approved: boolean) => void;
}

/** Pre-process text to convert @user, #sprint-id, WI-xxx → markdown links */
function applyAutolinks(text: string): string {
  const links = findLinks(text);
  if (links.length === 0) return text;

  // Build a map: raw → href (first match wins for duplicates)
  const linkMap = new Map<string, string>();
  for (const link of links) {
    if (!linkMap.has(link.raw)) {
      linkMap.set(link.raw, link.href);
    }
  }

  // Use regex to replace all occurrences in a single pass
  const escaped = [...linkMap.keys()].map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text.replace(pattern, (match) => {
    const href = linkMap.get(match);
    return href ? `[${match}](${href})` : match;
  });
}

export function MessageBubble({ message, isStreaming, onConfirmResponse }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const processedContent = useMemo(
    () => (isUser ? message.content : applyAutolinks(message.content)),
    [message.content, isUser]
  );

  // Confirmation-only message (no text content)
  const isConfirmationOnly = message.confirmation && !message.content;

  return (
    <div className={cn("flex gap-3 py-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-mal-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("max-w-[90%] space-y-1 sm:max-w-[80%]", isUser ? "items-end" : "items-start")}>
        {!isConfirmationOnly && (
          <div
            className={cn(
              "rounded-xl px-4 py-2.5",
              isUser
                ? "bg-mal-600 text-white"
                : "bg-white border border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-600/40 dark:text-gray-100"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {processedContent}
                </ReactMarkdown>
                {isStreaming && !message.content && (
                  <span className="inline-block h-4 w-1 animate-pulse bg-gray-400" />
                )}
              </div>
            )}
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full">
            {message.toolCalls.map((tc, i) => (
              <ToolCallCard key={`${tc.toolName}-${i}`} toolCall={tc} />
            ))}
          </div>
        )}

        {message.confirmation && onConfirmResponse && (
          <div className="w-full">
            <ConfirmationCard
              confirmation={message.confirmation}
              onRespond={onConfirmResponse}
              responded={message.confirmationResponded}
            />
          </div>
        )}

        <p className="px-1 text-xs text-gray-400">{formatDate(message.timestamp)}</p>
      </div>
    </div>
  );
}
