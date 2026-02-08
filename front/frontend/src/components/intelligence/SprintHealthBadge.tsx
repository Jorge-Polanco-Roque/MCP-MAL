import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSprintReport } from "@/hooks/useData";

interface SprintHealthBadgeProps {
  sprintId: string;
  className?: string;
}

/**
 * Visual indicator showing sprint health: green (on track), yellow (at risk), red (behind).
 * Parses health data from the sprint report MCP tool response.
 */
export function SprintHealthBadge({ sprintId, className }: SprintHealthBadgeProps) {
  const { data, isLoading } = useSprintReport(sprintId);

  if (!sprintId || isLoading) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-gray-400", className)}>
        <Activity className="h-3.5 w-3.5" />
        Loading...
      </span>
    );
  }

  const content = typeof data?.data === "string" ? data.data : "";
  const health = parseHealth(content);

  const config = {
    "on-track": { color: "text-green-600 bg-green-100", icon: "\ud83d\udfe2", label: "On Track" },
    "at-risk": { color: "text-yellow-600 bg-yellow-100", icon: "\ud83d\udfe1", label: "At Risk" },
    behind: { color: "text-red-600 bg-red-100", icon: "\ud83d\udd34", label: "Behind" },
    unknown: { color: "text-gray-600 bg-gray-100", icon: "\u2b55", label: "Unknown" },
  };

  const c = config[health.status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.color,
        className
      )}
      title={`Sprint health: ${c.label}${health.completion ? ` (${health.completion}% complete)` : ""}`}
    >
      <span>{c.icon}</span>
      {c.label}
      {health.completion !== null && (
        <span className="opacity-75">({health.completion}%)</span>
      )}
    </span>
  );
}

type HealthStatus = "on-track" | "at-risk" | "behind" | "unknown";

function parseHealth(md: string): { status: HealthStatus; completion: number | null } {
  // Look for health indicator emojis in the response
  if (md.includes("\ud83d\udfe2") || md.toLowerCase().includes("on track")) {
    return { status: "on-track", completion: extractCompletion(md) };
  }
  if (md.includes("\ud83d\udfe1") || md.toLowerCase().includes("at risk")) {
    return { status: "at-risk", completion: extractCompletion(md) };
  }
  if (md.includes("\ud83d\udd34") || md.toLowerCase().includes("behind")) {
    return { status: "behind", completion: extractCompletion(md) };
  }
  return { status: "unknown", completion: extractCompletion(md) };
}

function extractCompletion(md: string): number | null {
  // Look for patterns like "56%" or "Completion | **56%**"
  const match = md.match(/(?:completion|progress)[^]*?(\d{1,3})%/i);
  if (match) return parseInt(match[1], 10);
  const genericMatch = md.match(/(\d{1,3})%/);
  if (genericMatch) return parseInt(genericMatch[1], 10);
  return null;
}
