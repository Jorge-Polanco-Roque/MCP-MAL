export type SkillCategory = "data" | "document" | "devops" | "frontend" | "design" | "custom";

export interface SkillEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  trigger_patterns: string[];
  asset_path: string;
  dependencies: string[];
  author: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CommandParam {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  description: string;
  required: boolean;
  default?: string;
  enum_values?: string[];
}

export interface CommandEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  shell: "bash" | "python" | "node";
  script_template: string;
  parameters: CommandParam[];
  requires_confirmation: boolean;
  author: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SubagentConfig {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  tools_allowed: string[];
  max_turns: number;
  input_schema: Record<string, unknown>;
  output_format: "text" | "json" | "markdown";
  author: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface MCPRegistryEntry {
  id: string;
  name: string;
  description: string;
  transport: "streamable-http" | "stdio";
  endpoint_url?: string;
  command?: string;
  args?: string[];
  env_vars: Record<string, string>;
  health_check_url?: string;
  status: "active" | "inactive" | "error";
  tools_exposed: string[];
  author: string;
  created_at: string;
  updated_at: string;
}

// --- Phase 5: Team Collaboration Platform types ---

export type TeamRole = "developer" | "lead" | "scrum_master" | "product_owner";

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  role: TeamRole;
  xp: number;
  level: number;
  streak_days: number;
  streak_last_date?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type InteractionSource = "claude_code" | "web_chat" | "api";

export interface Interaction {
  id: string;
  session_id: string;
  user_id: string;
  source: InteractionSource;
  title?: string;
  summary?: string;
  decisions: string[];
  action_items: string[];
  tools_used: string[];
  sprint_id?: string;
  work_item_id?: string;
  tags: string[];
  message_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "human" | "assistant" | "tool";

export interface InteractionMessage {
  id: number;
  interaction_id: string;
  role: MessageRole;
  content: string;
  tool_calls?: string;
  token_count?: number;
  created_at: string;
}

export type SprintStatus = "planned" | "active" | "completed" | "cancelled";

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  velocity?: number;
  team_capacity?: number;
  summary?: string;
  retrospective?: string;
  created_by?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WorkItemType = "epic" | "story" | "task" | "bug" | "spike";
export type WorkItemStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled";
export type WorkItemPriority = "critical" | "high" | "medium" | "low";

export interface WorkItem {
  id: string;
  sprint_id?: string;
  title: string;
  description?: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  story_points?: number;
  assignee?: string;
  reporter?: string;
  labels: string[];
  parent_id?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type ContributionType = "commit" | "interaction" | "work_item" | "review" | "sprint" | "achievement";

export interface Contribution {
  id: number;
  user_id: string;
  type: ContributionType;
  reference_id?: string;
  points: number;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AchievementCategory = "code" | "collaboration" | "agile" | "exploration" | "mastery";
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  xp_reward: number;
  criteria: Record<string, unknown>;
  created_at: string;
}

export interface UserAchievement {
  id: number;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// --- End Phase 5 types ---

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  has_more: boolean;
  next_offset?: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: "asc" | "desc";
  filters?: Record<string, unknown>;
}
