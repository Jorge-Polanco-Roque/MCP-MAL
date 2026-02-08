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

export interface HealthData {
  mcp_status: string;
  agent_status: string;
  tools_count: number;
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
