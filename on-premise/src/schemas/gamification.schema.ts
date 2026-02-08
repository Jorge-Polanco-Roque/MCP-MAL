import { z } from "zod";
import { CONTRIBUTION_TYPES, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_TIERS } from "../constants.js";

export const ContributionTypeSchema = z.enum(CONTRIBUTION_TYPES);
export const AchievementCategorySchema = z.enum(ACHIEVEMENT_CATEGORIES);
export const AchievementTierSchema = z.enum(ACHIEVEMENT_TIERS);

export const ContributionSchema = z.object({
  user_id: z.string().min(1),
  type: ContributionTypeSchema,
  reference_id: z.string().optional(),
  points: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).default({}),
  project_id: z.string().optional(),
}).strict();

export const AchievementSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1).max(10),
  category: AchievementCategorySchema.default("code"),
  tier: AchievementTierSchema.default("bronze"),
  xp_reward: z.number().int().min(0).default(10),
  criteria: z.record(z.unknown()).default({}),
  created_at: z.string().optional(),
}).strict();

export type ContributionInput = z.infer<typeof ContributionSchema>;
export type AchievementInput = z.infer<typeof AchievementSchema>;
