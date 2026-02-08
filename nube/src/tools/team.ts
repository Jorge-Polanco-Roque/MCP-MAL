import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { TeamMemberSchema, TeamMemberUpdateSchema } from "../schemas/team.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { TeamMember, Contribution, UserAchievement } from "../types.js";

export function registerTeamTools(server: McpServer, db: IDatabase): void {

  // --- mal_register_team_member ---
  server.registerTool(
    "mal_register_team_member",
    {
      title: "Register Team Member",
      description: "Register a new team member in the hub. Creates a profile with XP tracking, level, and contribution streak. Can also update an existing member's profile.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique member ID (lowercase slug, e.g. 'jorge')"),
        name: z.string().describe("Full display name (e.g. 'Jorge Polanco')"),
        email: z.string().optional().describe("Email address (for git author matching)"),
        avatar_url: z.string().optional().describe("Avatar image URL"),
        role: z.string().optional().describe("Role: developer (default), lead, scrum_master, product_owner"),
        metadata: z.record(z.unknown()).optional().describe("Custom metadata"),
      },
    },
    async (args) => {
      try {
        const existing = await db.get<TeamMember>(COLLECTIONS.TEAM_MEMBERS, args.id);
        if (existing) {
          // Update existing member
          const { id, ...updateData } = args;
          const validated = TeamMemberUpdateSchema.parse(updateData);
          const updated = await db.update<TeamMember>(COLLECTIONS.TEAM_MEMBERS, id, validated);
          return {
            content: [{ type: "text" as const, text: `Team member '${id}' updated.\n\n${formatDetailAsMarkdown(updated as unknown as Record<string, unknown>, "Updated Team Member")}` }],
          };
        }

        const validated = TeamMemberSchema.parse(args);
        const created = await db.create(COLLECTIONS.TEAM_MEMBERS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Team member '${validated.id}' registered successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Registered Team Member")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_register_team_member");
      }
    }
  );

  // --- mal_get_team_member ---
  server.registerTool(
    "mal_get_team_member",
    {
      title: "Get Team Member Profile",
      description: "Get a team member's full profile including XP, level, streak, achievements, and recent contribution history.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Team member ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const member = await db.get<TeamMember>(COLLECTIONS.TEAM_MEMBERS, args.id);
        if (!member) {
          return {
            content: [{ type: "text" as const, text: `Error: Team member '${args.id}' not found. Try: Use mal_list_team_members to see all members.` }],
            isError: true,
          };
        }

        const detail = formatDetailAsMarkdown(member as unknown as Record<string, unknown>, `Team Member: ${member.name}`);

        // Get recent contributions
        const contributions = await db.list<Contribution>(COLLECTIONS.CONTRIBUTIONS, {
          filters: { user_id: args.id },
          order_by: "created_at",
          order_dir: "desc",
          limit: 10,
        });

        let contribText = "";
        if (contributions.items.length > 0) {
          contribText = "\n\n---\n\n## Recent Contributions\n\n";
          for (const c of contributions.items) {
            contribText += `- **+${c.points} XP** [${c.type}] ${c.description ?? c.reference_id ?? ""} — ${c.created_at}\n`;
          }
        }

        // Get achievements
        const achievements = await db.list<UserAchievement>(COLLECTIONS.USER_ACHIEVEMENTS, {
          filters: { user_id: args.id },
          limit: 50,
        });

        let achieveText = "";
        if (achievements.items.length > 0) {
          achieveText = "\n\n---\n\n## Achievements (" + achievements.items.length + ")\n\n";
          for (const a of achievements.items) {
            achieveText += `- 🏅 **${a.achievement_id}** — unlocked ${a.unlocked_at}\n`;
          }
        }

        return { content: [{ type: "text" as const, text: detail + contribText + achieveText }] };
      } catch (error) {
        return handleToolError(error, "mal_get_team_member");
      }
    }
  );

  // --- mal_list_team_members ---
  server.registerTool(
    "mal_list_team_members",
    {
      title: "List Team Members",
      description: "List all team members with their XP, level, and role. Can sort by XP for leaderboard view.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        limit: z.number().optional().describe("Max results (default 20)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({ limit: args.limit, offset: args.offset });
        options.order_by = "xp";
        options.order_dir = "desc";
        const result = await db.list<TeamMember>(COLLECTIONS.TEAM_MEMBERS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Team Members") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_team_members");
      }
    }
  );
}
