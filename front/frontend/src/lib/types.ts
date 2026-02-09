// ─── Chat types (existing) ───

export interface ConfirmationPayload {
  type: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallInfo[];
  confirmation?: ConfirmationPayload;
  confirmationResponded?: boolean;
  timestamp: Date;
}

export interface ToolCallInfo {
  toolName: string;
  arguments: Record<string, unknown>;
  result?: string;
  durationMs?: number;
}

export interface StreamChunk {
  type: "token" | "tool_call" | "tool_result" | "error" | "done" | "confirm";
  content: string;
  tool_call?: {
    tool_name: string;
    arguments: Record<string, unknown>;
    result?: string;
    duration_ms?: number;
  };
  confirm?: ConfirmationPayload;
}

// ─── Health / Catalog (existing) ───

export interface HealthData {
  mcp_status: string;
  agent_status: string;
  tools_count: number;
  agents_available?: string[];
  timestamp: string;
}

export interface CatalogResponse {
  collection: string;
  data: string;
  error?: string;
}

export interface StatsResponse {
  data: string;
  error?: string;
}

export type Collection = "skills" | "commands" | "subagents" | "mcps";

// ─── Project types ───

export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "archived";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id?: string;
  color?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
}

// ─── Sprint types ───

export type SprintStatus = "planned" | "active" | "completed" | "cancelled";

export interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  goal?: string;
  start_date: string;
  end_date: string;
  team_capacity?: number;
  velocity?: number;
  created_by?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SprintListResponse {
  items: Sprint[];
  total: number;
}

// ─── Work Item types ───

export type WorkItemStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled";
export type WorkItemPriority = "low" | "medium" | "high" | "critical";

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  sprint_id?: string;
  project_id?: string;
  assignee_id?: string;
  story_points?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ─── Interaction types ───

export interface Interaction {
  id: string;
  session_id: string;
  user_id: string;
  type: "chat" | "review" | "planning" | "retrospective" | "standup";
  title?: string;
  summary?: string;
  decisions: string[];
  action_items: string[];
  tags: string[];
  created_at: string;
}

// ─── Team / Gamification types ───

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  xp: number;
  level: number;
  streak_days: number;
  joined_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  xp: number;
  level: number;
  rank: number;
  contributions: number;
}

// ─── Achievement types ───

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "code" | "collaboration" | "agile" | "exploration" | "mastery";
  tier: "bronze" | "silver" | "gold" | "platinum";
  xp_reward: number;
  unlocked?: boolean;
  unlocked_at?: string;
}

export interface Contribution {
  type: "commit" | "interaction" | "work_item" | "review" | "sprint" | "achievement";
  points: number;
  description?: string;
  reference_id?: string;
  created_at: string;
}

// ─── Analytics types ───

export interface CommitActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
  author?: string;
}

// ─── Board types (Kanban DnD) ───

export type BoardStatus = "todo" | "in_progress" | "review" | "done";

export interface BoardItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  story_points?: number;
  assignee?: string;
  sprint_id?: string;
  labels?: string[];
  type?: string;
  parent_id?: string;
}

export type BoardColumns = Record<BoardStatus, BoardItem[]>;

export interface BoardResponse {
  columns: BoardColumns;
  total: number;
}

// ─── Generic MCP response wrapper ───

export interface McpDataResponse {
  data: string;
  error?: string;
}
