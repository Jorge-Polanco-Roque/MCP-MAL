import { z } from "zod";
import { SHELL_TYPES } from "../constants.js";

export const CommandParamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "enum"]),
  description: z.string().min(1),
  required: z.boolean(),
  default: z.string().optional(),
  enum_values: z.array(z.string()).optional(),
}).strict();

export const CommandEntrySchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  category: z.string().min(1),
  shell: z.enum(SHELL_TYPES),
  script_template: z.string().min(1),
  parameters: z.array(CommandParamSchema).default([]),
  requires_confirmation: z.boolean().default(false),
  author: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const CommandUpdateSchema = CommandEntrySchema.partial().omit({ id: true, created_at: true });

export type CommandEntryInput = z.infer<typeof CommandEntrySchema>;
