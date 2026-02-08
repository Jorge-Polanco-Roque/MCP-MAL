import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  X,
  RefreshCw,
  Circle,
  Trash2,
  MoreVertical,
  GitBranch,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useProjectsList,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useData";
import { useProjectContext } from "@/hooks/useProjectContext";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/lib/types";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-500",
  archived: "bg-gray-100 text-gray-400",
};

const COLOR_DOT: Record<string, string> = {
  blue: "text-blue-500",
  green: "text-green-500",
  red: "text-red-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
  pink: "text-pink-500",
  indigo: "text-indigo-500",
};

const STATUS_OPTIONS: ProjectStatus[] = [
  "planning",
  "active",
  "paused",
  "completed",
  "archived",
];

const COLOR_OPTIONS = [
  "blue",
  "green",
  "red",
  "purple",
  "orange",
  "yellow",
  "pink",
  "indigo",
];

export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data, isLoading, isFetching, refetch } = useProjectsList(
    statusFilter || undefined
  );
  const { activeProjectId, setActiveProjectId } = useProjectContext();
  const navigate = useNavigate();

  const projects = data?.items ?? [];

  const selectProject = (project: Project) => {
    setActiveProjectId(project.id);
    navigate("/sprints");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? (
              <X className="mr-1 h-4 w-4" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            {showCreate ? "Cancel" : "New Project"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("mr-1 h-4 w-4", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Create form */}
        {showCreate && (
          <CreateProjectForm
            onCreated={() => {
              setShowCreate(false);
              refetch();
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Filters */}
        <div className="mb-4 flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter("")}
              className="text-xs text-mal-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Project cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <FolderKanban className="mb-4 h-16 w-16" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="mt-2 text-sm">
              Create your first project to organize sprints and work items.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
                onSelect={() => selectProject(project)}
                onChanged={() => refetch()}
                onDeleted={() => {
                  if (activeProjectId === project.id) {
                    setActiveProjectId(null);
                  }
                  refetch();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Project Card with actions ─── */

function ProjectCard({
  project,
  isActive,
  onSelect,
  onChanged,
  onDeleted,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate(
      { id: project.id, data: { status: newStatus } },
      { onSuccess: onChanged }
    );
    setShowMenu(false);
  };

  const handleDelete = (cascade: boolean) => {
    deleteMutation.mutate(
      { id: project.id, cascade },
      { onSuccess: onDeleted }
    );
    setConfirmDelete(false);
    setShowMenu(false);
  };

  if (editing) {
    return (
      <Card className={cn("relative", isActive && "ring-2 ring-mal-400")}>
        <CardContent className="p-0">
          <EditProjectForm
            project={project}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative transition-shadow hover:shadow-md",
        isActive && "ring-2 ring-mal-400"
      )}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="mb-2 flex items-center gap-2">
          <Circle
            className={cn(
              "h-3.5 w-3.5 shrink-0 fill-current",
              COLOR_DOT[project.color ?? "blue"] ?? "text-blue-500"
            )}
          />
          <h3
            className="flex-1 cursor-pointer truncate font-semibold hover:text-mal-600"
            onClick={onSelect}
          >
            {project.name}
          </h3>

          {/* Status badge as dropdown */}
          <div className="relative">
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "cursor-pointer appearance-none rounded-full border-0 px-2 py-0.5 pr-5 text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-mal-400",
                STATUS_STYLES[project.status] ?? "bg-gray-100 text-gray-500"
              )}
              onClick={(e) => e.stopPropagation()}
              disabled={updateMutation.isPending}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Menu button */}
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
              setConfirmDelete(false);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        {project.description && (
          <p
            className="mb-2 cursor-pointer line-clamp-2 text-sm text-gray-600"
            onClick={onSelect}
          >
            {project.description}
          </p>
        )}

        {/* Repo URL */}
        {(project.metadata?.repo_url as string | undefined) && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-500">
            <GitBranch className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate font-mono">
              {(project.metadata!.repo_url as string)
                .replace("https://github.com/", "")
                .replace("/tree/dev", "")}
            </span>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex cursor-pointer items-center justify-between text-xs text-gray-400"
          onClick={onSelect}
        >
          {project.owner_id && <span>Owner: {project.owner_id}</span>}
          <span className="font-mono">{project.id}</span>
        </div>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            className="absolute right-2 top-12 z-10 w-48 rounded-md border bg-white py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {!confirmDelete ? (
              <>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setEditing(true);
                    setShowMenu(false);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit project
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete project
                </button>
              </>
            ) : (
              <div className="px-3 py-2">
                <p className="mb-2 text-xs font-medium text-gray-700">
                  Delete "{project.name}"?
                </p>
                <div className="flex flex-col gap-1">
                  <button
                    className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    onClick={() => handleDelete(true)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending
                      ? "Deleting..."
                      : "Delete with sprints & items"}
                  </button>
                  <button
                    className="rounded border px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => handleDelete(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete project only
                  </button>
                  <button
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setConfirmDelete(false);
                      setShowMenu(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Edit Project form (inline on card) ─── */

function EditProjectForm({
  project,
  onSaved,
  onCancel,
}: {
  project: Project;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const updateMutation = useUpdateProject();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [repoUrl, setRepoUrl] = useState(
    (project.metadata?.repo_url as string) ?? ""
  );
  const [color, setColor] = useState(project.color ?? "blue");
  const [status, setStatus] = useState(project.status);
  const [ownerId, setOwnerId] = useState(project.owner_id ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: Record<string, unknown> = {};
    if (name.trim() !== project.name) data.name = name.trim();
    if (description.trim() !== (project.description ?? ""))
      data.description = description.trim();
    if (color !== (project.color ?? "blue")) data.color = color;
    if (status !== project.status) data.status = status;
    if (ownerId.trim() !== (project.owner_id ?? ""))
      data.owner_id = ownerId.trim() || undefined;

    const currentRepo = (project.metadata?.repo_url as string) ?? "";
    if (repoUrl.trim() !== currentRepo) {
      data.metadata = { ...(project.metadata ?? {}), repo_url: repoUrl.trim() || undefined };
    }

    // Only call API if something changed
    if (Object.keys(data).length === 0) {
      onCancel();
      return;
    }

    await updateMutation.mutateAsync({ id: project.id, data });
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit Project</h3>
        <span className="font-mono text-xs text-gray-400">{project.id}</span>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          required
          autoFocus
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={2}
        />
        <input
          type="url"
          placeholder="Repository URL (e.g. https://github.com/org/repo/tree/dev)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Owner ID (e.g. jorge)"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Color:</span>
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                color === c ? "border-gray-900 scale-110" : "border-transparent"
              )}
              title={c}
            >
              <Circle
                className={cn(
                  "h-full w-full fill-current",
                  COLOR_DOT[c] ?? "text-blue-500"
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={updateMutation.isPending || !name.trim()}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ─── Create Project form ─── */

function CreateProjectForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [color, setColor] = useState("blue");
  const [status, setStatus] = useState("active");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = slugify(name);
    const data: Record<string, unknown> = {
      id,
      name: name.trim(),
      status,
      color,
    };
    if (description.trim()) data.description = description.trim();
    if (repoUrl.trim()) {
      data.metadata = { repo_url: repoUrl.trim() };
    }

    await createMutation.mutateAsync(data);
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-mal-200 bg-mal-50/30 p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold">New Project</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <input
            type="text"
            placeholder="Project name (e.g. Bella Italia)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
            autoFocus
          />
          {name.trim() && (
            <p className="mt-1 text-[10px] text-gray-400">
              ID: <span className="font-mono">{slugify(name)}</span>
            </p>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Color:</span>
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                color === c ? "border-gray-900 scale-110" : "border-transparent"
              )}
              title={c}
            >
              <Circle
                className={cn(
                  "h-full w-full fill-current",
                  COLOR_DOT[c] ?? "text-blue-500"
                )}
              />
            </button>
          ))}
        </div>
        <div className="sm:col-span-2">
          <input
            type="url"
            placeholder="Repository URL (optional, e.g. https://github.com/org/repo/tree/dev)"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending || !name.trim()}
        >
          {createMutation.isPending ? "Creating..." : "Create Project"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
