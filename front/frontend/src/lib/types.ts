// ─── Chat types (existing) ───

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallInfo[];
  timestamp: Date;
}

export interface ToolCallInfo {
  toolName: string;
  arguments: Record<string, unknown>;
  result?: string;
  durationMs?: number;
}

export interface StreamChunk {
  type: "token" | "tool_call" | "tool_result" | "error" | "done";
  content: string;
  tool_call?: {
    tool_name: string;
    arguments: Record<string, unknown>;
    result?: string;
    duration_ms?: number;
  };
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

// ─── Sprint types ───

export interface Sprint {
  id: string;
  name: string;
  status: "planning" | "active" | "completed";
  start_date: string;
  end_date: string;
  goals: string[];
  velocity?: number;
  created_at: string;
  updated_at: string;
}

// ─── Work Item types ───

export type WorkItemStatus = "todo" | "in_progress" | "done" | "blocked";
export type WorkItemPriority = "low" | "medium" | "high" | "critical";

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  sprint_id?: string;
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

// ─── Generic MCP response wrapper ───

export interface McpDataResponse {
  data: string;
  error?: string;
}
