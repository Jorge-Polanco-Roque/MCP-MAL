export const SERVER_NAME = "mal-mcp-hub";
export const SERVER_VERSION = "1.0.0";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const COLLECTIONS = {
  SKILLS: "skills",
  COMMANDS: "commands",
  SUBAGENTS: "subagents",
  MCPS: "mcps",
  USAGE_LOG: "usage_log",
  TEAM_MEMBERS: "team_members",
  INTERACTIONS: "interactions",
  INTERACTION_MESSAGES: "interaction_messages",
  SPRINTS: "sprints",
  WORK_ITEMS: "work_items",
  CONTRIBUTIONS: "contributions",
  ACHIEVEMENTS: "achievements",
  USER_ACHIEVEMENTS: "user_achievements",
} as const;

export const SKILL_CATEGORIES = ["data", "document", "devops", "frontend", "design", "custom"] as const;

export const SHELL_TYPES = ["bash", "python", "node"] as const;

export const MCP_TRANSPORTS = ["streamable-http", "stdio"] as const;

export const MCP_STATUSES = ["active", "inactive", "error"] as const;

export const OUTPUT_FORMATS = ["text", "json", "markdown"] as const;

export const TEAM_ROLES = ["developer", "lead", "scrum_master", "product_owner"] as const;

export const INTERACTION_SOURCES = ["claude_code", "web_chat", "api"] as const;

export const MESSAGE_ROLES = ["human", "assistant", "tool"] as const;

export const SPRINT_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export const WORK_ITEM_TYPES = ["epic", "story", "task", "bug", "spike"] as const;

export const WORK_ITEM_STATUSES = ["backlog", "todo", "in_progress", "review", "done", "cancelled"] as const;

export const WORK_ITEM_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const CONTRIBUTION_TYPES = ["commit", "interaction", "work_item", "review", "sprint", "achievement"] as const;

export const ACHIEVEMENT_CATEGORIES = ["code", "collaboration", "agile", "exploration", "mastery"] as const;

export const ACHIEVEMENT_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
