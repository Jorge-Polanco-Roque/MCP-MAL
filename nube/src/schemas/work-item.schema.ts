import { z } from "zod";
import { WORK_ITEM_TYPES, WORK_ITEM_STATUSES, WORK_ITEM_PRIORITIES } from "../constants.js";

export const WorkItemTypeSchema = z.enum(WORK_ITEM_TYPES);
export const WorkItemStatusSchema = z.enum(WORK_ITEM_STATUSES);
export const WorkItemPrioritySchema = z.enum(WORK_ITEM_PRIORITIES);

export const WorkItemSchema = z.object({
  id: z.string().min(1).regex(/^[A-Za-z0-9-]+$/, "ID must be alphanumeric with hyphens (e.g. MAL-001)"),
  sprint_id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: WorkItemTypeSchema.default("task"),
  status: WorkItemStatusSchema.default("backlog"),
  priority: WorkItemPrioritySchema.default("medium"),
  story_points: z.number().int().min(0).max(100).optional(),
  assignee: z.string().optional(),
  reporter: z.string().optional(),
  labels: z.array(z.string()).default([]),
  parent_id: z.string().optional(),
  due_date: z.string().optional(),
  completed_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const WorkItemUpdateSchema = WorkItemSchema.partial().omit({ id: true, created_at: true });

export type WorkItemInput = z.infer<typeof WorkItemSchema>;
