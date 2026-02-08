import { z } from "zod";
import { PROJECT_STATUSES } from "../constants.js";

export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);

export const ProjectSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema.default("active"),
  owner_id: z.string().optional(),
  color: z.string().default("blue"),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const ProjectUpdateSchema = ProjectSchema.partial().omit({ id: true, created_at: true });

export type ProjectInput = z.infer<typeof ProjectSchema>;
