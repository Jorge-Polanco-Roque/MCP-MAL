import { MessageSquare, GitCommit, CheckCircle, Award, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  id: string;
  type: "interaction" | "commit" | "work_item" | "achievement" | "contribution";
  title: string;
  description?: string;
  user?: string;
  time: string;
}

const ICONS: Record<string, React.ElementType> = {
  interaction: MessageSquare,
  commit: GitCommit,
  work_item: CheckCircle,
  achievement: Award,
  contribution: Clock,
};

const ICON_COLORS: Record<string, string> = {
  interaction: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  commit: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  work_item: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  achievement: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  contribution: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

interface ActivityTimelineProps {
  entries: TimelineEntry[];
  isLoading?: boolean;
}

export function ActivityTimeline({ entries, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        No recent activity
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 h-full w-px bg-gray-200 dark:bg-gray-700" />

      {entries.map((entry, idx) => {
        const Icon = ICONS[entry.type] ?? Clock;
        const colorClass = ICON_COLORS[entry.type] ?? ICON_COLORS.contribution;

        return (
          <div
            key={entry.id}
            className={cn(
              "relative flex items-start gap-3 py-2.5 pl-1",
              idx === 0 && "pt-0"
            )}
          >
            <div className={cn("z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full", colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {entry.title}
                {entry.user && (
                  <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                    by {entry.user}
                  </span>
                )}
              </p>
              {entry.description && (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {entry.description}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{entry.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Parse activity feed data from the API into timeline entries.
 */
export function parseActivityEntries(data: {
  interactions?: Array<Record<string, string>>;
  top_contributors?: Array<Record<string, string | number>>;
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const i of data.interactions ?? []) {
    entries.push({
      id: i.id || String(Math.random()),
      type: "interaction",
      title: i.title || "Conversation",
      description: i.summary,
      user: i.user_id,
      time: i.created_at || "",
    });
  }

  return entries.sort((a, b) => b.time.localeCompare(a.time));
}
