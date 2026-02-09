import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { BoardItem, BoardStatus } from "@/lib/types";
import { WorkItemCard } from "./WorkItemCard";

const STATUS_CONFIG: Record<
  BoardStatus,
  { label: string; dot: string; dropHighlight: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-gray-400",
    dropHighlight: "border-gray-400",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-blue-500",
    dropHighlight: "border-blue-400",
  },
  review: {
    label: "Review",
    dot: "bg-amber-500",
    dropHighlight: "border-amber-400",
  },
  done: {
    label: "Done",
    dot: "bg-green-500",
    dropHighlight: "border-green-400",
  },
};

const WIP_LIMIT: Record<BoardStatus, number> = {
  todo: 0,
  in_progress: 5,
  review: 3,
  done: 0,
};

interface BoardColumnProps {
  status: BoardStatus;
  items: BoardItem[];
}

export function BoardColumn({ status, items }: BoardColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const itemIds = items.map((item) => item.id);
  const wipLimit = WIP_LIMIT[status];
  const overWip = wipLimit > 0 && items.length > wipLimit;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border-2 bg-gray-50 transition-colors dark:bg-gray-900",
        isOver ? config.dropHighlight : "border-transparent",
        overWip && "border-red-300 dark:border-red-700"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5 dark:border-gray-700">
        <span className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
        <span className="text-sm font-semibold">{config.label}</span>
        {wipLimit > 0 && (
          <span className={cn(
            "text-[10px] font-medium",
            overWip ? "text-red-500" : "text-gray-400 dark:text-gray-500"
          )}>
            WIP {items.length}/{wipLimit}
          </span>
        )}
        <span className={cn(
          "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
          overWip
            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        )}>
          {items.length}
        </span>
      </div>

      {/* Droppable area */}
      <div ref={setNodeRef} className="min-h-[120px] flex-1 space-y-2 p-2">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <WorkItemCard key={item.id} item={item} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <p
            className={cn(
              "py-8 text-center text-xs text-gray-400 transition-colors dark:text-gray-500",
              isOver && "text-gray-600 dark:text-gray-300"
            )}
          >
            {isOver ? "Drop here" : "No items"}
          </p>
        )}
      </div>
    </div>
  );
}
