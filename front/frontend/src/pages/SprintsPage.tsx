import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import {
  LayoutGrid,
  RefreshCw,
  Plus,
  X,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { BoardColumn } from "@/components/board/BoardColumn";
import { WorkItemCard } from "@/components/board/WorkItemCard";
import {
  useSprintsList,
  useBoard,
  useUpdateWorkItem,
  useCreateWorkItem,
  useCreateSprint,
} from "@/hooks/useData";
import { useProjectContext } from "@/hooks/useProjectContext";
import { cn } from "@/lib/utils";
import type {
  BoardItem,
  BoardStatus,
  BoardResponse,
  Sprint,
} from "@/lib/types";

const BOARD_STATUSES: BoardStatus[] = ["todo", "in_progress", "review", "done"];

const SPRINT_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  planned: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-500",
};

export function SprintsPage() {
  const [activeSprint, setActiveSprint] = useState<string>("");
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [sprintDropdown, setSprintDropdown] = useState(false);

  const { activeProjectId, activeProject } = useProjectContext();
  const sprintsList = useSprintsList(undefined, activeProjectId ?? undefined);
  const board = useBoard(activeSprint || undefined, activeProjectId ?? undefined);
  const updateMutation = useUpdateWorkItem();
  const queryClient = useQueryClient();

  const [activeItem, setActiveItem] = useState<BoardItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Current selected sprint info
  const selectedSprint = sprintsList.data?.items.find(
    (s) => s.id === activeSprint
  );

  const findItemColumn = useCallback(
    (itemId: string): BoardStatus | null => {
      if (!board.data) return null;
      for (const status of BOARD_STATUSES) {
        if (board.data.columns[status].some((it) => it.id === itemId)) {
          return status;
        }
      }
      return null;
    },
    [board.data]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      if (!board.data) return;
      for (const status of BOARD_STATUSES) {
        const item = board.data.columns[status].find((it) => it.id === id);
        if (item) {
          setActiveItem(item);
          return;
        }
      }
    },
    [board.data]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !board.data) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const sourceCol = findItemColumn(activeId);
      const destCol = BOARD_STATUSES.includes(overId as BoardStatus)
        ? (overId as BoardStatus)
        : findItemColumn(overId);

      if (!sourceCol || !destCol || sourceCol === destCol) return;

      queryClient.setQueryData<BoardResponse>(
        ["board", activeSprint || undefined, activeProjectId ?? undefined],
        (old) => {
          if (!old) return old;
          const item = old.columns[sourceCol].find(
            (it) => it.id === activeId
          );
          if (!item) return old;
          return {
            ...old,
            columns: {
              ...old.columns,
              [sourceCol]: old.columns[sourceCol].filter(
                (it) => it.id !== activeId
              ),
              [destCol]: [
                ...old.columns[destCol],
                { ...item, status: destCol },
              ],
            },
          };
        }
      );
    },
    [board.data, findItemColumn, queryClient, activeSprint, activeProjectId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);

      const { active, over } = event;
      if (!over || !board.data) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const destCol = BOARD_STATUSES.includes(overId as BoardStatus)
        ? (overId as BoardStatus)
        : findItemColumn(overId);

      if (!destCol) return;

      const currentData = queryClient.getQueryData<BoardResponse>([
        "board",
        activeSprint || undefined,
      ]);
      const item = currentData?.columns[destCol]?.find(
        (it) => it.id === activeId
      );
      if (!item) return;

      const originalCol = (() => {
        if (!board.data) return null;
        for (const s of BOARD_STATUSES) {
          if (board.data.columns[s].some((it) => it.id === activeId)) return s;
        }
        return null;
      })();

      if (originalCol === destCol) return;

      const snapshot = queryClient.getQueryData<BoardResponse>([
        "board",
        activeSprint || undefined,
      ]);

      updateMutation.mutate(
        { id: activeId, data: { status: destCol } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            queryClient.invalidateQueries({ queryKey: ["work-items"] });
          },
          onError: () => {
            if (snapshot) {
              queryClient.setQueryData(
                ["board", activeSprint || undefined, activeProjectId ?? undefined],
                snapshot
              );
            }
            toast.error("Failed to move work item — reverted");
          },
        }
      );
    },
    [board.data, findItemColumn, queryClient, activeSprint, activeProjectId, updateMutation]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">
            Sprint Board
            {activeProject && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {activeProject.name}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCreateItem(!showCreateItem);
              if (!showCreateItem) setShowCreateSprint(false);
            }}
          >
            {showCreateItem ? (
              <X className="mr-1 h-4 w-4" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            {showCreateItem ? "Cancel" : "New Item"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sprintsList.refetch();
              board.refetch();
            }}
            disabled={sprintsList.isFetching || board.isFetching}
          >
            <RefreshCw
              className={cn(
                "mr-1 h-4 w-4",
                (sprintsList.isFetching || board.isFetching) && "animate-spin"
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Create forms */}
        {showCreateSprint && (
          <CreateSprintForm
            onCreated={() => {
              setShowCreateSprint(false);
              sprintsList.refetch();
            }}
            onCancel={() => setShowCreateSprint(false)}
          />
        )}
        {showCreateItem && (
          <CreateBoardItemForm
            sprintId={activeSprint || undefined}
            onCreated={() => {
              setShowCreateItem(false);
              board.refetch();
            }}
            onCancel={() => setShowCreateItem(false)}
          />
        )}

        {/* Sprint selector */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Sprint</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateSprint(!showCreateSprint);
                if (!showCreateSprint) setShowCreateItem(false);
              }}
              className="text-xs"
            >
              {showCreateSprint ? (
                <X className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Calendar className="mr-1 h-3.5 w-3.5" />
              )}
              {showCreateSprint ? "Cancel" : "New Sprint"}
            </Button>
          </div>

          {sprintsList.isLoading ? (
            <div className="h-10 w-64 animate-pulse rounded-md bg-gray-200" />
          ) : sprintsList.error ? (
            <p className="text-xs text-red-500">Failed to load sprints</p>
          ) : (
            <div className="relative">
              {/* Dropdown trigger */}
              <button
                type="button"
                onClick={() => setSprintDropdown(!sprintDropdown)}
                className="flex w-full max-w-md items-center justify-between rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                {selectedSprint ? (
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        SPRINT_STATUS_STYLES[selectedSprint.status] ??
                          "bg-gray-100 text-gray-500"
                      )}
                    >
                      {selectedSprint.status}
                    </span>
                    <span className="font-medium">{selectedSprint.name}</span>
                    <span className="text-gray-400">
                      {selectedSprint.start_date} → {selectedSprint.end_date}
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-400">
                    All sprints ({sprintsList.data?.total ?? 0})
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* Dropdown menu */}
              {sprintDropdown && (
                <div className="absolute z-20 mt-1 w-full max-w-md rounded-md border bg-white shadow-lg">
                  {/* "All" option */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSprint("");
                      setSprintDropdown(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
                      !activeSprint && "bg-mal-50 font-medium"
                    )}
                  >
                    All sprints
                  </button>
                  <div className="border-t" />
                  {(sprintsList.data?.items ?? []).map((sprint) => (
                    <SprintDropdownItem
                      key={sprint.id}
                      sprint={sprint}
                      isSelected={sprint.id === activeSprint}
                      onSelect={() => {
                        setActiveSprint(sprint.id);
                        setSprintDropdown(false);
                      }}
                    />
                  ))}
                  {(sprintsList.data?.items ?? []).length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-gray-400">
                      No sprints yet — create one above
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected sprint summary */}
          {selectedSprint && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {selectedSprint.goal && (
                <span>
                  Goal: <span className="text-gray-700">{selectedSprint.goal}</span>
                </span>
              )}
              {selectedSprint.team_capacity && (
                <span>
                  Capacity:{" "}
                  <span className="font-medium text-gray-700">
                    {selectedSprint.team_capacity} pts
                  </span>
                </span>
              )}
              <span>
                Items:{" "}
                <span className="font-medium text-gray-700">
                  {board.data?.total ?? "..."}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Kanban board with DnD */}
        <div className="mb-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Work Items by Status
            {board.data ? ` (${board.data.total})` : ""}
          </h3>

          {board.isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {BOARD_STATUSES.map((s) => (
                <div key={s} className="rounded-lg border bg-gray-50 p-4">
                  <div className="mb-4 h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-16 animate-pulse rounded bg-gray-200" />
                    <div className="h-16 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : board.error ? (
            <p className="text-sm text-red-500">
              Failed to load board: {(board.error as Error).message}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {BOARD_STATUSES.map((status) => (
                  <BoardColumn
                    key={status}
                    status={status}
                    items={board.data?.columns[status] ?? []}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeItem ? <WorkItemCard item={activeItem} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sprint dropdown item ─── */

function SprintDropdownItem({
  sprint,
  isSelected,
  onSelect,
}: {
  sprint: Sprint;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
        isSelected && "bg-mal-50 font-medium"
      )}
    >
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          SPRINT_STATUS_STYLES[sprint.status] ?? "bg-gray-100 text-gray-500"
        )}
      >
        {sprint.status}
      </span>
      <span className="flex-1 truncate">{sprint.name}</span>
      <span className="text-[10px] text-gray-400">
        {sprint.start_date} → {sprint.end_date}
      </span>
    </button>
  );
}

/* ─── Create Sprint form ─── */

function generateSprintId(): string {
  const now = new Date();
  const week = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  return `sprint-${now.getFullYear()}-w${String(week).padStart(2, "0")}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function twoWeeksLaterISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function CreateSprintForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { activeProjectId } = useProjectContext();
  const createMutation = useCreateSprint();
  const [id, setId] = useState(generateSprintId);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(twoWeeksLaterISO);
  const [status, setStatus] = useState("planned");
  const [capacity, setCapacity] = useState("40");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) return;

    const data: Record<string, unknown> = {
      id: id.trim(),
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      status,
    };
    if (goal.trim()) data.goal = goal.trim();
    const cap = parseInt(capacity, 10);
    if (cap > 0) data.team_capacity = cap;
    if (activeProjectId) data.project_id = activeProjectId;

    await createMutation.mutateAsync(data);
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-blue-200 bg-blue-50/30 p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold">New Sprint</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* ID */}
        <input
          type="text"
          placeholder="ID (e.g. sprint-2026-w07)"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm font-mono"
          required
        />
        {/* Name */}
        <div className="lg:col-span-3">
          <input
            type="text"
            placeholder="Sprint name (e.g. Sprint 7 — Gamification)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
            autoFocus
          />
        </div>
        {/* Goal */}
        <div className="sm:col-span-2 lg:col-span-4">
          <textarea
            placeholder="Sprint goal (optional)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        {/* Start */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        {/* End */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500">
            End date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {/* Capacity */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500">
            Capacity (pts)
          </label>
          <input
            type="number"
            min="0"
            max="200"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending || !name.trim() || !id.trim()}
        >
          {createMutation.isPending ? "Creating..." : "Create Sprint"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ─── Create Work Item form ─── */

function generateItemId(): string {
  const hex = crypto
    .getRandomValues(new Uint16Array(1))[0]
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `WI-${hex}`;
}

function CreateBoardItemForm({
  sprintId,
  onCreated,
  onCancel,
}: {
  sprintId?: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { activeProjectId } = useProjectContext();
  const createMutation = useCreateWorkItem();
  const [id, setId] = useState(generateItemId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [storyPoints, setStoryPoints] = useState("1");
  const [assignee, setAssignee] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !title.trim()) return;

    const data: Record<string, unknown> = {
      id: id.trim(),
      title: title.trim(),
      type,
      status,
      priority,
      story_points: parseInt(storyPoints, 10) || 1,
    };
    if (description.trim()) data.description = description.trim();
    if (sprintId) data.sprint_id = sprintId;
    if (activeProjectId) data.project_id = activeProjectId;
    if (assignee.trim()) data.assignee = assignee.trim();

    await createMutation.mutateAsync(data);
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold">New Work Item</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="ID (e.g. BI-016)"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm font-mono"
          required
        />
        <div className="sm:col-span-1 lg:col-span-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
            autoFocus
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="task">Task</option>
          <option value="story">Story</option>
          <option value="bug">Bug</option>
          <option value="epic">Epic</option>
          <option value="spike">Spike</option>
        </select>
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
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
          <option value="backlog">Backlog</option>
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
        <input
          type="text"
          placeholder="Assignee (e.g. jorge)"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending || !title.trim() || !id.trim()}
        >
          {createMutation.isPending ? "Creating..." : "Create"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
