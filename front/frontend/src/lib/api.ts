import type {
  HealthData,
  CatalogResponse,
  StatsResponse,
  Collection,
  McpDataResponse,
  BoardResponse,
  SprintListResponse,
  ProjectListResponse,
} from "./types";

const BASE = "";

// ─── Existing endpoints ───

export async function fetchHealth(): Promise<HealthData> {
  const res = await fetch(`${BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchCatalog(
  collection: Collection,
  category?: string
): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/catalog/${collection}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchCatalogItem(
  collection: Collection,
  id: string
): Promise<CatalogResponse> {
  const res = await fetch(`${BASE}/api/catalog/${collection}/${id}`);
  if (!res.ok) throw new Error(`Catalog item fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}

// ─── Project endpoints ───

export async function fetchProjectsList(status?: string): Promise<ProjectListResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/projects-list${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Projects list fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchProject(projectId: string): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/projects/${projectId}`);
  if (!res.ok) throw new Error(`Project fetch failed: ${res.status}`);
  return res.json();
}

export async function createProject(data: Record<string, unknown>): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Project create failed: ${res.status}`);
  return res.json();
}

export async function updateProject(
  projectId: string,
  data: Record<string, unknown>
): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Project update failed: ${res.status}`);
  return res.json();
}

export async function deleteProject(
  projectId: string,
  cascade: boolean = false
): Promise<McpDataResponse> {
  const params = cascade ? "?cascade=true" : "";
  const res = await fetch(`${BASE}/api/projects/${projectId}${params}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Project delete failed: ${res.status}`);
  return res.json();
}

// ─── Board endpoint (structured JSON for DnD) ───

export async function fetchBoard(sprintId?: string, projectId?: string): Promise<BoardResponse> {
  const params = new URLSearchParams();
  if (sprintId) params.set("sprint_id", sprintId);
  if (projectId) params.set("project_id", projectId);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/board${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Board fetch failed: ${res.status}`);
  return res.json();
}

// ─── Sprint endpoints ───

export async function fetchSprintsList(status?: string, projectId?: string): Promise<SprintListResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (projectId) params.set("project_id", projectId);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/sprints-list${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Sprints list fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchSprints(status?: string, projectId?: string): Promise<McpDataResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (projectId) params.set("project_id", projectId);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/sprints${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Sprints fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchSprint(sprintId: string): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/sprints/${sprintId}`);
  if (!res.ok) throw new Error(`Sprint fetch failed: ${res.status}`);
  return res.json();
}

export async function createSprint(data: Record<string, unknown>): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/sprints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Sprint create failed: ${res.status}`);
  return res.json();
}

// ─── Work Item endpoints ───

export async function fetchWorkItems(filters?: {
  sprint_id?: string;
  project_id?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
}): Promise<McpDataResponse> {
  const params = new URLSearchParams();
  if (filters?.sprint_id) params.set("sprint_id", filters.sprint_id);
  if (filters?.project_id) params.set("project_id", filters.project_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.assignee_id) params.set("assignee_id", filters.assignee_id);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/work-items${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Work items fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchWorkItem(itemId: string): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/work-items/${itemId}`);
  if (!res.ok) throw new Error(`Work item fetch failed: ${res.status}`);
  return res.json();
}

export async function createWorkItem(data: Record<string, unknown>): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/work-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Work item create failed: ${res.status}`);
  return res.json();
}

export async function updateWorkItem(
  itemId: string,
  data: Record<string, unknown>
): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/work-items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Work item update failed: ${res.status}`);
  return res.json();
}

// ─── Interaction endpoints ───

export async function fetchInteractions(filters?: {
  user_id?: string;
  type?: string;
}): Promise<McpDataResponse> {
  const params = new URLSearchParams();
  if (filters?.user_id) params.set("user_id", filters.user_id);
  if (filters?.type) params.set("type", filters.type);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/interactions${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Interactions fetch failed: ${res.status}`);
  return res.json();
}

export async function searchInteractions(query: string): Promise<McpDataResponse> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`${BASE}/api/interactions/search?${params}`);
  if (!res.ok) throw new Error(`Interaction search failed: ${res.status}`);
  return res.json();
}

// ─── Analytics endpoints ───

export async function fetchCommitActivity(
  days: number = 30,
  repoUrl?: string,
  projectId?: string
): Promise<McpDataResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (repoUrl) params.set("repo_url", repoUrl);
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${BASE}/api/analytics/commits?${params}`);
  if (!res.ok) throw new Error(`Commit activity fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchLeaderboard(limit: number = 20, projectId?: string): Promise<McpDataResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${BASE}/api/analytics/leaderboard?${params}`);
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchSprintReport(sprintId: string): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/analytics/sprint-report/${sprintId}`);
  if (!res.ok) throw new Error(`Sprint report fetch failed: ${res.status}`);
  return res.json();
}

// ─── Decision endpoints ───

export async function createDecision(data: {
  title: string;
  description?: string;
  user_id?: string;
  tags?: string[];
}): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Decision create failed: ${res.status}`);
  return res.json();
}

// ─── Context endpoint ───

export async function fetchProjectContext(): Promise<{ context: string; sections: number }> {
  const res = await fetch(`${BASE}/api/context`);
  if (!res.ok) throw new Error(`Context fetch failed: ${res.status}`);
  return res.json();
}

// ─── Achievement endpoints ───

export async function fetchAchievements(
  userId?: string,
  category?: string
): Promise<McpDataResponse> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  if (category) params.set("category", category);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/achievements${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Achievements fetch failed: ${res.status}`);
  return res.json();
}

// ─── Activity Feed ───

export async function fetchActivityFeed(limit: number = 20): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/api/activity?limit=${limit}`);
  if (!res.ok) throw new Error(`Activity feed fetch failed: ${res.status}`);
  return res.json();
}

// ─── Team endpoints ───

export async function fetchTeamMember(memberId: string): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/team/${memberId}`);
  if (!res.ok) throw new Error(`Team member fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchTeam(): Promise<McpDataResponse> {
  const res = await fetch(`${BASE}/api/team`);
  if (!res.ok) throw new Error(`Team fetch failed: ${res.status}`);
  return res.json();
}
