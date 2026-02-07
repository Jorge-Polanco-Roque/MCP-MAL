import { z } from "zod";
import { SKILL_CATEGORIES } from "../constants.js";

export const SkillCategorySchema = z.enum(SKILL_CATEGORIES);

export const SkillEntrySchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver format"),
  category: SkillCategorySchema,
  trigger_patterns: z.array(z.string()).default([]),
  asset_path: z.string().min(1),
  dependencies: z.array(z.string()).default([]),
  author: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const SkillUpdateSchema = SkillEntrySchema.partial().omit({ id: true, created_at: true });

export type SkillEntryInput = z.infer<typeof SkillEntrySchema>;
