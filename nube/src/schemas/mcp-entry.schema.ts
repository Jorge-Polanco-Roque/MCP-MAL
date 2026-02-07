import { z } from "zod";
import { MCP_TRANSPORTS, MCP_STATUSES } from "../constants.js";

export const MCPRegistryEntrySchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  transport: z.enum(MCP_TRANSPORTS),
  endpoint_url: z.string().url().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env_vars: z.record(z.string()).default({}),
  health_check_url: z.string().url().optional(),
  status: z.enum(MCP_STATUSES).default("active"),
  tools_exposed: z.array(z.string()).default([]),
  author: z.string().min(1),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const MCPRegistryUpdateSchema = MCPRegistryEntrySchema.partial().omit({ id: true, created_at: true });

export type MCPRegistryEntryInput = z.infer<typeof MCPRegistryEntrySchema>;
