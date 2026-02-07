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
} as const;

export const SKILL_CATEGORIES = ["data", "document", "devops", "frontend", "design", "custom"] as const;

export const SHELL_TYPES = ["bash", "python", "node"] as const;

export const MCP_TRANSPORTS = ["streamable-http", "stdio"] as const;

export const MCP_STATUSES = ["active", "inactive", "error"] as const;

export const OUTPUT_FORMATS = ["text", "json", "markdown"] as const;
