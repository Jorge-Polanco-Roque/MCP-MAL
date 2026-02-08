import { useState } from "react";
import { ListTodo, Filter, RefreshCw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { useWorkItems, useCreateWorkItem } from "@/hooks/useData";
import { useProjectContext } from "@/hooks/useProjectContext";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["", "todo", "in_progress", "done", "blocked"];
const PRIORITY_OPTIONS = ["", "low", "medium", "high", "critical"];

export function BacklogPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { activeProjectId, activeProject } = useProjectContext();

  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;
  if (priorityFilter) filters.priority = priorityFilter;
  if (activeProjectId) filters.project_id = activeProjectId;

  const { data, isLoading, error, refetch, isFetching } = useWorkItems(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const content = typeof data?.data === "string" ? data.data : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">
            Backlog
            {activeProject && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {activeProject.name}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
            {showCreate ? "Cancel" : "New Item"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-1 h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Create form */}
        {showCreate && (
          <CreateWorkItemForm
            onCreated={() => {
              setShowCreate(false);
              refetch();
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {(statusFilter || priorityFilter) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setPriorityFilter("");
              }}
              className="text-xs text-mal-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Work items list */}
        <DataCard
          title="Work Items"
          data={content}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}

function CreateWorkItemForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { activeProjectId } = useProjectContext();
  const createMutation = useCreateWorkItem();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [storyPoints, setStoryPoints] = useState("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const data: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "todo",
      story_points: parseInt(storyPoints, 10) || 1,
      tags: [],
    };
    if (activeProjectId) data.project_id = activeProjectId;
    await createMutation.mutateAsync(data);
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">Create Work Item</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="md:col-span-2">
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <input
          type="number"
          min="1"
          max="21"
          value={storyPoints}
          onChange={(e) => setStoryPoints(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Story Points"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={createMutation.isPending || !title.trim()}>
          {createMutation.isPending ? "Creating..." : "Create"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
