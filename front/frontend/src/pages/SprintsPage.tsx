import { useState } from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { useSprints, useWorkItems } from "@/hooks/useData";
import { cn } from "@/lib/utils";

const STATUSES = ["todo", "in_progress", "done", "blocked"] as const;

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  done: { label: "Done", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
} as const;

export function SprintsPage() {
  const [activeSprint] = useState<string>("");
  const sprints = useSprints();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">Sprint Board</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sprints.refetch()}
            disabled={sprints.isFetching}
          >
            <RefreshCw className={cn("mr-1 h-4 w-4", sprints.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sprint list + board */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Sprint selector */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Sprints</h3>
          <DataCard
            title="Sprints"
            data={typeof sprints.data?.data === "string" ? sprints.data.data : undefined}
            isLoading={sprints.isLoading}
            error={sprints.error}
          />
        </div>

        {/* Kanban columns */}
        <div className="mb-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Work Items by Status</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((status) => (
              <KanbanColumn key={status} status={status} sprintId={activeSprint} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ status, sprintId }: { status: typeof STATUSES[number]; sprintId?: string }) {
  const config = STATUS_CONFIG[status];
  const filters: Record<string, string> = { status };
  if (sprintId) filters.sprint_id = sprintId;
  const { data, isLoading, error } = useWorkItems(filters);

  const content = typeof data?.data === "string" ? data.data : undefined;

  return (
    <div className="flex flex-col rounded-lg border bg-gray-50">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
        <span className="text-sm font-semibold">{config.label}</span>
      </div>
      <div className="min-h-[120px] flex-1 p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            <div className="h-16 animate-pulse rounded bg-gray-200" />
            <div className="h-16 animate-pulse rounded bg-gray-200" />
          </div>
        ) : error ? (
          <p className="p-2 text-xs text-red-500">Failed to load</p>
        ) : content ? (
          <div className="prose prose-sm max-w-none text-xs prose-table:w-full prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
            <div
              className="overflow-auto text-xs"
              dangerouslySetInnerHTML={{
                __html: markdownTableToHtml(content),
              }}
            />
          </div>
        ) : (
          <p className="p-3 text-center text-xs text-gray-400">No items</p>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal markdown table → HTML converter for Kanban column cards.
 * Handles the simple table format returned by MCP tools.
 */
function markdownTableToHtml(md: string): string {
  const lines = md.split("\n");
  const parts: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      if (trimmed.replace(/[|\-\s:]/g, "").length === 0) continue; // separator
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (!inTable) {
        parts.push('<table class="w-full text-xs"><tbody>');
        inTable = true;
      }
      parts.push("<tr>" + cells.map((c) => `<td class="px-1 py-1 border-b border-gray-200">${escapeHtml(c)}</td>`).join("") + "</tr>");
    } else {
      if (inTable) {
        parts.push("</tbody></table>");
        inTable = false;
      }
      if (trimmed.startsWith("##")) {
        // skip headers — we have our own column title
      } else if (trimmed.startsWith(">")) {
        parts.push(`<p class="text-gray-400 text-xs mt-1">${escapeHtml(trimmed.slice(1).trim())}</p>`);
      } else if (trimmed) {
        parts.push(`<p class="text-xs">${escapeHtml(trimmed)}</p>`);
      }
    }
  }
  if (inTable) parts.push("</tbody></table>");
  return parts.join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
