import { z } from "zod";
import { TEAM_ROLES } from "../constants.js";

export const TeamRoleSchema = z.enum(TEAM_ROLES);

export const TeamMemberSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
  role: TeamRoleSchema.default("developer"),
  xp: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  streak_days: z.number().int().min(0).default(0),
  streak_last_date: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const TeamMemberUpdateSchema = TeamMemberSchema.partial().omit({ id: true, created_at: true });

export type TeamMemberInput = z.infer<typeof TeamMemberSchema>;
