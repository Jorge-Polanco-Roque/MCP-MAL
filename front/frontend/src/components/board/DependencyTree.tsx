import { cn } from "@/lib/utils";
import type { BoardItem } from "@/lib/types";

interface DependencyTreeProps {
  items: BoardItem[];
}

const STATUS_DOT: Record<string, string> = {
  backlog: "bg-gray-400",
  todo: "bg-gray-500",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-green-500",
  cancelled: "bg-red-400",
};

/**
 * Simple tree visualization of work items grouped by parent_id.
 * Epics are top-level, child items (stories/tasks/bugs) nested below.
 */
export function DependencyTree({ items }: DependencyTreeProps) {
  // Group: top-level items (no parent_id) and children (has parent_id)
  const rootItems = items.filter((i) => !i.parent_id);
  const childMap = new Map<string, BoardItem[]>();
  for (const item of items) {
    if (item.parent_id) {
      const children = childMap.get(item.parent_id) ?? [];
      children.push(item);
      childMap.set(item.parent_id, children);
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        No items to display
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {rootItems.map((item) => (
        <TreeNode key={item.id} item={item} childMap={childMap} depth={0} />
      ))}
    </div>
  );
}

function TreeNode({
  item,
  childMap,
  depth,
}: {
  item: BoardItem;
  childMap: Map<string, BoardItem[]>;
  depth: number;
}) {
  const children = childMap.get(item.id) ?? [];
  const dot = STATUS_DOT[item.status ?? "backlog"] ?? "bg-gray-400";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {children.length > 0 && (
          <span className="text-[10px] text-gray-400">
            {depth === 0 ? "▼" : "├"}
          </span>
        )}
        <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", dot)} />
        <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">{item.id}</span>
        <span className="flex-1 truncate text-gray-800 dark:text-gray-200">
          {item.title || "(untitled)"}
        </span>
        {item.story_points != null && (
          <span className="text-[10px] font-medium text-mal-600 dark:text-mal-400">
            {item.story_points}pt
          </span>
        )}
        <span className="text-[10px] text-gray-400">{item.status}</span>
      </div>
      {children.map((child) => (
        <TreeNode key={child.id} item={child} childMap={childMap} depth={depth + 1} />
      ))}
    </div>
  );
}
