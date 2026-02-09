import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lightbulb,
  Play,
  Loader2,
  Check,
  SkipForward,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useProjectContext } from "@/hooks/useProjectContext";
import { useSprintsList, useCreateWorkItem } from "@/hooks/useData";
import { cn } from "@/lib/utils";

// ─── Local types ───

interface ParsedSuggestion {
  title: string;
  description: string;
  priority: string;
  type: string;
}

type Phase = "idle" | "streaming" | "reviewing" | "complete";

// ─── Suggestion parser ───

function parseSuggestions(markdown: string): ParsedSuggestion[] {
  const lines = markdown.split("\n");
  const suggestions: ParsedSuggestion[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];
  let inSuggestion = false;

  // Matches: ## 1. Title, ### 2. Title, 1. Title, 1) Title
  const SUGGESTION_RE = /^(?:#{1,3}\s+)?(\d+)[\.\)]\s+(.+)/;

  for (const line of lines) {
    const match = line.match(SUGGESTION_RE);
    if (match) {
      // Save previous suggestion
      if (inSuggestion && currentTitle) {
        suggestions.push(buildSuggestion(currentTitle, currentBody.join("\n")));
      }
      // Clean title: remove **bold** wrappers and trailing pipes
      currentTitle = match[2]
        .replace(/^\*\*(.+?)\*\*.*/, "$1")
        .replace(/\s*\|.*$/, "")
        .trim();
      currentBody = [];
      inSuggestion = true;
    } else if (inSuggestion) {
      currentBody.push(line);
    }
  }

  // Don't forget the last suggestion
  if (inSuggestion && currentTitle) {
    suggestions.push(buildSuggestion(currentTitle, currentBody.join("\n")));
  }

  return suggestions;
}

function buildSuggestion(title: string, body: string): ParsedSuggestion {
  const fullText = title + "\n" + body;
  const pMatch = fullText.match(
    /priority[:\s]*\*{0,2}(high|medium|low|critical)\*{0,2}/i
  );
  const tMatch = fullText.match(
    /type[:\s]*\*{0,2}(task|bug|story|spike|epic)\*{0,2}/i
  );
  return {
    title,
    description: body.trim(),
    priority: pMatch?.[1]?.toLowerCase() ?? "medium",
    type: tMatch?.[1]?.toLowerCase() ?? "task",
  };
}

function generateItemId(): string {
  const hex = crypto
    .getRandomValues(new Uint16Array(1))[0]
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `WI-${hex}`;
}

// ─── Style maps ───

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
};

const TYPE_STYLES: Record<string, string> = {
  bug: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  task: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  story: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  epic: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  spike: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
};

// ─── Component ───

export function NextStepsPage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("idle");
  const [rawContent, setRawContent] = useState("");
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<ParsedSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accepted, setAccepted] = useState<ParsedSuggestion[]>([]);
  const [skipped, setSkipped] = useState<ParsedSuggestion[]>([]);
  const [sprintId, setSprintId] = useState("");
  const [cardKey, setCardKey] = useState(0);

  const rawContentRef = useRef("");

  const { activeProjectId, activeProject } = useProjectContext();
  const { data: sprintsData } = useSprintsList(
    undefined,
    activeProjectId ?? undefined
  );
  const sprints = sprintsData?.items ?? [];
  const createMutation = useCreateWorkItem();

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

    switch (chunk.type) {
      case "token":
        rawContentRef.current += String(chunk.content ?? "");
        setRawContent(rawContentRef.current);
        break;
      case "tool_call": {
        const tc = chunk.tool_call as Record<string, unknown> | undefined;
        setToolCalls((prev) => [
          ...prev,
          String(tc?.tool_name ?? "tool"),
        ]);
        break;
      }
      case "done": {
        const parsed = parseSuggestions(rawContentRef.current);
        if (parsed.length > 0) {
          setSuggestions(parsed);
          setCurrentIndex(0);
          setAccepted([]);
          setSkipped([]);
          setCardKey(0);
          setPhase("reviewing");
        } else {
          // Could not parse structured suggestions — show raw output
          setPhase("complete");
        }
        break;
      }
      case "error":
        toast.error(String(chunk.content ?? "Unknown error"));
        setPhase("idle");
        break;
    }
  }, []);

  const { connected, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
  });

  const generate = useCallback(() => {
    rawContentRef.current = "";
    setRawContent("");
    setToolCalls([]);
    setSuggestions([]);
    setAccepted([]);
    setSkipped([]);
    setCurrentIndex(0);
    setPhase("streaming");
    send(
      JSON.stringify({
        project_id: activeProjectId || undefined,
        sprint_id: sprintId || undefined,
      })
    );
  }, [send, activeProjectId, sprintId]);

  const advanceToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= suggestions.length) {
        setPhase("complete");
        return prev;
      }
      setCardKey((k) => k + 1);
      return next;
    });
  }, [suggestions.length]);

  const handleAccept = useCallback(async () => {
    const suggestion = suggestions[currentIndex];
    if (!suggestion) return;

    const data: Record<string, unknown> = {
      id: generateItemId(),
      title: suggestion.title,
      description: suggestion.description,
      type: suggestion.type,
      priority: suggestion.priority,
      status: "todo",
      story_points: 1,
    };
    if (sprintId) data.sprint_id = sprintId;
    if (activeProjectId) data.project_id = activeProjectId;

    try {
      await createMutation.mutateAsync(data);
      setAccepted((prev) => [...prev, suggestion]);
      advanceToNext();
    } catch {
      // Toast already shown by the mutation hook
    }
  }, [
    suggestions,
    currentIndex,
    sprintId,
    activeProjectId,
    createMutation,
    advanceToNext,
  ]);

  const handleSkip = useCallback(() => {
    const suggestion = suggestions[currentIndex];
    if (!suggestion) return;
    setSkipped((prev) => [...prev, suggestion]);
    advanceToNext();
  }, [suggestions, currentIndex, advanceToNext]);

  const current = suggestions[currentIndex];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold dark:text-gray-100">
            Next Steps
            {activeProject && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                — {activeProject.name}
              </span>
            )}
          </h2>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
            AI-Powered
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="w-44 rounded-md border px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">All sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={generate}
            disabled={phase === "streaming" || !connected}
          >
            {phase === "streaming" ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Analyzing...
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
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* ── Idle: empty state ── */}
        {phase === "idle" && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 dark:text-gray-500">
            <Lightbulb className="mb-4 h-16 w-16" />
            <p className="text-lg font-medium dark:text-gray-300">AI-Powered Next Steps</p>
            <p className="mt-2 max-w-md text-sm">
              Click &quot;Generate&quot; to analyze your project and get
              prioritized, actionable suggestions. You can accept them one by
              one and they&apos;ll appear as work items in your Sprint Board.
            </p>
          </div>
        )}

        {/* ── Streaming: progress card ── */}
        {phase === "streaming" && (
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 animate-pulse text-yellow-500" />
                  <h3 className="text-base font-semibold dark:text-gray-100">
                    Analyzing your project...
                  </h3>
                </div>

                {toolCalls.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {toolCalls.map((tool, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        <span className="font-mono text-xs">{tool}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  </div>
                )}

                {rawContent && (
                  <div className="mt-4 border-t pt-4">
                    <span className="mr-1 inline-block h-3 w-0.5 animate-pulse bg-gray-400" />
                    <span className="text-xs text-gray-400">
                      Generating suggestions...
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Reviewing: one suggestion at a time ── */}
        {phase === "reviewing" && current && (
          <div className="mx-auto max-w-2xl">
            {/* Progress header */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Suggestion {currentIndex + 1} of {suggestions.length}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {accepted.length} accepted · {skipped.length} skipped
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-6 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-1.5 rounded-full bg-mal-500 transition-all duration-300"
                style={{
                  width: `${(currentIndex / suggestions.length) * 100}%`,
                }}
              />
            </div>

            {/* Suggestion card */}
            <Card key={cardKey} className="animate-card-in border-2">
              <CardContent className="p-6">
                {/* Type & priority pills */}
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                      TYPE_STYLES[current.type] ?? TYPE_STYLES.task
                    )}
                  >
                    {current.type}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                      PRIORITY_STYLES[current.priority] ??
                        PRIORITY_STYLES.medium
                    )}
                  >
                    {current.priority}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {current.title}
                </h3>

                {/* Description */}
                {current.description && (
                  <div className="prose prose-sm max-w-none text-gray-600 dark:prose-invert dark:text-gray-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {current.description}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-6 flex items-center gap-3 border-t pt-4 dark:border-gray-600">
                  <Button
                    onClick={handleAccept}
                    disabled={createMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={createMutation.isPending}
                  >
                    <SkipForward className="mr-1.5 h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Complete: summary ── */}
        {phase === "complete" && (
          <div className="mx-auto max-w-2xl">
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold dark:text-gray-100">Review Complete</h3>

                {accepted.length > 0 || skipped.length > 0 ? (
                  <>
                    {/* Counters */}
                    <div className="mb-6 flex justify-center gap-8 text-sm">
                      <div>
                        <span className="text-2xl font-bold text-green-600">
                          {accepted.length}
                        </span>
                        <p className="text-gray-500 dark:text-gray-400">accepted</p>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                          {skipped.length}
                        </span>
                        <p className="text-gray-500 dark:text-gray-400">skipped</p>
                      </div>
                    </div>

                    {/* Accepted list */}
                    {accepted.length > 0 && (
                      <div className="mb-6 text-left">
                        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Created Work Items:
                        </h4>
                        <div className="space-y-1.5">
                          {accepted.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded bg-green-50 px-3 py-1.5 text-sm dark:bg-green-900/20"
                            >
                              <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                              <span className="flex-1 font-medium">
                                {s.title}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                                  PRIORITY_STYLES[s.priority] ??
                                    PRIORITY_STYLES.medium
                                )}
                              >
                                {s.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Fallback: could not parse suggestions */
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No structured suggestions could be extracted. Here is the
                      raw output:
                    </p>
                    <div className="prose prose-sm mt-4 max-w-none rounded-lg border bg-gray-50 p-4 text-left dark:prose-invert dark:border-gray-600 dark:bg-gray-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rawContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-center gap-3">
                  {accepted.length > 0 && (
                    <Button onClick={() => navigate("/sprints")}>
                      <ArrowRight className="mr-1.5 h-4 w-4" />
                      View Sprint Board
                    </Button>
                  )}
                  <Button variant="outline" onClick={generate}>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Generate Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
