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

interface BoardColumnProps {
  status: BoardStatus;
  items: BoardItem[];
}

export function BoardColumn({ status, items }: BoardColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const itemIds = items.map((item) => item.id);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border-2 bg-gray-50 transition-colors",
        isOver ? config.dropHighlight : "border-transparent"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
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
              "py-8 text-center text-xs text-gray-400 transition-colors",
              isOver && "text-gray-600"
            )}
          >
            {isOver ? "Drop here" : "No items"}
          </p>
        )}
      </div>
    </div>
  );
}
