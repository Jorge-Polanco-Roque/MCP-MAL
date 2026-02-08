import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { ContributionSchema } from "../schemas/gamification.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { TeamMember, Contribution, Achievement, UserAchievement } from "../types.js";

function calculateLevel(xp: number): number {
  if (xp <= 500) return Math.max(1, Math.ceil(xp / 100));
  if (xp <= 2000) return 5 + Math.ceil((xp - 500) / 300);
  if (xp <= 5000) return 10 + Math.ceil((xp - 2000) / 600);
  if (xp <= 10000) return 15 + Math.ceil((xp - 5000) / 1000);
  return 20 + Math.ceil((xp - 10000) / 2000);
}

export function registerGamificationTools(server: McpServer, db: IDatabase): void {

  // --- mal_get_leaderboard ---
  server.registerTool(
    "mal_get_leaderboard",
    {
      title: "Get Leaderboard",
      description: "Get the team leaderboard ranked by XP. Shows each member's level, XP, streak, and role. Use for gamification rankings and team motivation.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        limit: z.number().optional().describe("Max results (default 20)"),
      },
    },
    async (args) => {
      try {
        const result = await db.list<TeamMember>(COLLECTIONS.TEAM_MEMBERS, {
          order_by: "xp",
          order_dir: "desc",
          limit: args.limit ?? 20,
        });

        if (result.items.length === 0) {
          return {
            content: [{ type: "text" as const, text: "## Leaderboard\n\nNo team members registered yet. Use mal_register_team_member to add members." }],
          };
        }

        const lines: string[] = ["## 🏆 Leaderboard", ""];
        lines.push("| Rank | Member | Level | XP | Streak | Role |");
        lines.push("|------|--------|-------|-----|--------|------|");

        result.items.forEach((member, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;
          const streak = member.streak_days > 0 ? `🔥 ${member.streak_days}d` : "—";
          lines.push(`| ${medal} | **${member.name}** | Lv.${member.level} | ${member.xp} | ${streak} | ${member.role} |`);
        });

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_get_leaderboard");
      }
    }
  );

  // --- mal_get_achievements ---
  server.registerTool(
    "mal_get_achievements",
    {
      title: "Get Achievements",
      description: "List available achievements and a user's unlocked badges. Shows icon, tier, category, and XP reward for each achievement.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        user_id: z.string().optional().describe("Filter to show which achievements a specific user has unlocked"),
        category: z.string().optional().describe("Filter by category: code, collaboration, agile, exploration, mastery"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({ category: args.category });
        options.order_by = "tier";
        const allAchievements = await db.list<Achievement>(COLLECTIONS.ACHIEVEMENTS, { ...options, limit: 100 });

        if (allAchievements.items.length === 0) {
          return {
            content: [{ type: "text" as const, text: "## Achievements\n\nNo achievements defined yet." }],
          };
        }

        let unlockedIds: Set<string> = new Set();
        if (args.user_id) {
          const userAchievements = await db.list<UserAchievement>(COLLECTIONS.USER_ACHIEVEMENTS, {
            filters: { user_id: args.user_id },
            limit: 100,
          });
          unlockedIds = new Set(userAchievements.items.map(a => a.achievement_id));
        }

        const tierOrder: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
        const sorted = [...allAchievements.items].sort((a, b) =>
          (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0)
        );

        const lines: string[] = ["## 🎯 Achievements", ""];
        if (args.user_id) {
          lines.push(`*Showing for user: ${args.user_id} (${unlockedIds.size}/${sorted.length} unlocked)*\n`);
        }

        lines.push("| Status | Icon | Name | Tier | Category | XP | Description |");
        lines.push("|--------|------|------|------|----------|----|-------------|");

        for (const a of sorted) {
          const status = unlockedIds.has(a.id) ? "✅" : "🔒";
          const tierEmoji = a.tier === "platinum" ? "💎" : a.tier === "gold" ? "🥇" : a.tier === "silver" ? "🥈" : "🥉";
          lines.push(`| ${status} | ${a.icon} | **${a.name}** | ${tierEmoji} ${a.tier} | ${a.category} | +${a.xp_reward} | ${a.description} |`);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_get_achievements");
      }
    }
  );

  // --- mal_log_contribution ---
  server.registerTool(
    "mal_log_contribution",
    {
      title: "Log Contribution",
      description: "Record a contribution event and award XP to a team member. Updates the member's XP, level, and streak. Types: commit, interaction, work_item, review, sprint, achievement.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        user_id: z.string().describe("Team member ID receiving the XP"),
        type: z.string().describe("Contribution type: commit, interaction, work_item, review, sprint, achievement"),
        reference_id: z.string().optional().describe("ID of the related entity (commit SHA, interaction ID, work item ID, etc.)"),
        points: z.number().describe("XP points to award"),
        description: z.string().optional().describe("Human-readable description of the contribution"),
        metadata: z.record(z.unknown()).optional().describe("Extra metadata (lines_changed, files_touched, etc.)"),
      },
    },
    async (args) => {
      try {
        const validated = ContributionSchema.parse(args);

        // Verify team member exists
        const member = await db.get<TeamMember>(COLLECTIONS.TEAM_MEMBERS, validated.user_id);
        if (!member) {
          return {
            content: [{ type: "text" as const, text: `Error: Team member '${validated.user_id}' not found. Try: Use mal_register_team_member first.` }],
            isError: true,
          };
        }

        // Log the contribution
        await db.create(COLLECTIONS.CONTRIBUTIONS, "", validated);

        // Update member XP, level, and streak
        const newXp = member.xp + validated.points;
        const newLevel = calculateLevel(newXp);
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        let newStreak = member.streak_days;
        if (member.streak_last_date === today) {
          // Already contributed today, no streak change
        } else if (member.streak_last_date === yesterday) {
          newStreak = member.streak_days + 1;
        } else {
          newStreak = 1;
        }

        await db.update<TeamMember>(COLLECTIONS.TEAM_MEMBERS, validated.user_id, {
          xp: newXp,
          level: newLevel,
          streak_days: newStreak,
          streak_last_date: today,
        } as Partial<TeamMember>);

        const levelUp = newLevel > member.level ? `\n\n🎉 **LEVEL UP!** ${member.name} is now Level ${newLevel}!` : "";

        return {
          content: [{ type: "text" as const, text: `Contribution logged: +${validated.points} XP for ${member.name}\n\n**Total XP**: ${newXp} (Level ${newLevel})\n**Streak**: ${newStreak} days 🔥${levelUp}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_log_contribution");
      }
    }
  );
}
