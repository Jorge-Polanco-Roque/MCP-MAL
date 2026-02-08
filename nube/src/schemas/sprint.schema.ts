import { z } from "zod";
import { SPRINT_STATUSES } from "../constants.js";

export const SprintStatusSchema = z.enum(SPRINT_STATUSES);

export const SprintSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  status: SprintStatusSchema.default("planned"),
  velocity: z.number().int().optional(),
  team_capacity: z.number().int().optional(),
  summary: z.string().optional(),
  retrospective: z.string().optional(),
  created_by: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const SprintUpdateSchema = SprintSchema.partial().omit({ id: true, created_at: true });

export type SprintInput = z.infer<typeof SprintSchema>;
