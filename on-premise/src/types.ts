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
