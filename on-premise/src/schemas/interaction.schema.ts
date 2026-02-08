import { z } from "zod";
import { INTERACTION_SOURCES, MESSAGE_ROLES } from "../constants.js";

export const InteractionSourceSchema = z.enum(INTERACTION_SOURCES);
export const MessageRoleSchema = z.enum(MESSAGE_ROLES);

export const InteractionMessageInputSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1),
  tool_calls: z.string().optional(),
  token_count: z.number().int().optional(),
}).strict();

export const InteractionSchema = z.object({
  id: z.string().min(1),
  session_id: z.string().min(1),
  user_id: z.string().min(1),
  source: InteractionSourceSchema.default("claude_code"),
  title: z.string().max(200).optional(),
  summary: z.string().optional(),
  decisions: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),
  tools_used: z.array(z.string()).default([]),
  sprint_id: z.string().optional(),
  work_item_id: z.string().optional(),
  tags: z.array(z.string()).default([]),
  message_count: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const InteractionUpdateSchema = InteractionSchema.partial().omit({ id: true, session_id: true, user_id: true, created_at: true });

export type InteractionInput = z.infer<typeof InteractionSchema>;
export type InteractionMessageInput = z.infer<typeof InteractionMessageInputSchema>;
