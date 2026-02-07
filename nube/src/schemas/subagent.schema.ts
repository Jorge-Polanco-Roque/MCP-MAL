import { z } from "zod";
import { OUTPUT_FORMATS } from "../constants.js";

export const SubagentConfigSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  system_prompt: z.string().min(1),
  model: z.string().default("claude-sonnet-4-5-20250929"),
  tools_allowed: z.array(z.string()).default([]),
  max_turns: z.number().int().min(1).max(50).default(5),
  input_schema: z.record(z.unknown()).default({}),
  output_format: z.enum(OUTPUT_FORMATS).default("markdown"),
  author: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const SubagentUpdateSchema = SubagentConfigSchema.partial().omit({ id: true, created_at: true });

export type SubagentConfigInput = z.infer<typeof SubagentConfigSchema>;
