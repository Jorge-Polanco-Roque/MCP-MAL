import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardFiltersProps {
  assignee: string;
  priority: string;
  type: string;
  onAssigneeChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  assignees: string[];
}

export function BoardFilters({
  assignee,
  priority,
  type,
  onAssigneeChange,
  onPriorityChange,
  onTypeChange,
  assignees,
}: BoardFiltersProps) {
  const hasFilters = assignee || priority || type;

  return (
    <div className="flex items-center gap-2 text-xs">
      <Filter className={cn("h-3.5 w-3.5", hasFilters ? "text-mal-600 dark:text-mal-400" : "text-gray-400")} />

      <select
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="rounded-md border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        <option value="">All Assignees</option>
        {assignees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="rounded-md border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        <option value="">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="rounded-md border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        <option value="">All Types</option>
        <option value="epic">Epic</option>
        <option value="story">Story</option>
        <option value="task">Task</option>
        <option value="bug">Bug</option>
        <option value="spike">Spike</option>
      </select>

      {hasFilters && (
        <button
          onClick={() => {
            onAssigneeChange("");
            onPriorityChange("");
            onTypeChange("");
          }}
          className="text-xs text-mal-600 hover:underline dark:text-mal-400"
        >
          Clear
        </button>
      )}
    </div>
  );
}
