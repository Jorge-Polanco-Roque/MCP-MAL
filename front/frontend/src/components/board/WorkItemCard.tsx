import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { BoardItem } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

const PRIORITY_BORDER: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-blue-500",
  low: "border-l-gray-300 dark:border-l-gray-600",
};

const TYPE_LABELS: Record<string, string> = {
  epic: "Epic",
  story: "Story",
  task: "Task",
  bug: "Bug",
  spike: "Spike",
};

interface WorkItemCardProps {
  item: BoardItem;
}

export function WorkItemCard({ item }: WorkItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab rounded-lg border border-l-[3px] bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800",
        PRIORITY_BORDER[item.priority] ?? PRIORITY_BORDER.medium,
        isDragging && "z-50 rotate-2 shadow-lg opacity-90"
      )}
    >
      {/* Header: ID + type */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{item.id}</span>
        {item.type && (
          <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {TYPE_LABELS[item.type] ?? item.type}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="mb-2 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
        {item.title || "(untitled)"}
      </p>

      {/* Footer: priority + assignee + points */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.medium
          )}
        >
          {item.priority}
        </span>

        {item.assignee && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-mal-100 text-[10px] font-bold text-mal-700 dark:bg-mal-900/40 dark:text-mal-300"
            title={item.assignee}
          >
            {item.assignee.charAt(0).toUpperCase()}
          </span>
        )}

        {item.story_points != null && (
          <span className="ml-auto rounded bg-mal-50 px-1.5 py-0.5 text-[10px] font-bold text-mal-600">
            {item.story_points} pts
          </span>
        )}
      </div>

      {/* Labels */}
      {item.labels && item.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.labels.map((label) => (
            <span
              key={label}
              className="rounded bg-gray-50 px-1 py-0.5 text-[10px] text-gray-500"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
