import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import type { IStorage } from "../services/storage.js";
import { COLLECTIONS } from "../constants.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { handleToolError } from "../utils/error-handler.js";
import type { SkillEntry } from "../types.js";

export function registerSkillTools(
  server: McpServer,
  db: IDatabase,
  storage: IStorage
): void {
  server.registerTool(
    "mal_search_skills",
    {
      title: "Search Skills",
      description: "Search skills by name, description, or tags using full-text search",
      annotations: { readOnlyHint: true },
      inputSchema: {
        query: z.string().describe("Search query text"),
        limit: z.number().optional().describe("Max results (default 20)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const result = await db.search<SkillEntry>(COLLECTIONS.SKILLS, args.query, options);

        if (result.items.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No skills found matching '${args.query}'. Try: Use broader search terms or mal_list_skills to see all.` }],
          };
        }

        const lines = result.items.map((s) =>
          `- **${s.name}** (\`${s.id}\`) — ${s.description} [${s.category}]`
        );

        return {
          content: [{
            type: "text" as const,
            text: `## Search Results for '${args.query}'\n\n${lines.join("\n")}\n\n*${result.total} results found*`,
          }],
        };
      } catch (error) {
        return handleToolError(error, "mal_search_skills");
      }
    }
  );

  server.registerTool(
    "mal_get_skill_content",
    {
      title: "Get Skill Content",
      description: "Get the raw SKILL.md content for a specific skill",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Skill ID to retrieve content for"),
      },
    },
    async (args) => {
      try {
        const skill = await db.get<SkillEntry>(COLLECTIONS.SKILLS, args.id);
        if (!skill) {
          return {
            content: [{ type: "text" as const, text: `Error: Skill '${args.id}' not found.` }],
            isError: true,
          };
        }

        const exists = await storage.exists(skill.asset_path);
        if (!exists) {
          return {
            content: [{ type: "text" as const, text: `Skill '${args.id}' exists but has no asset file at '${skill.asset_path}'.` }],
          };
        }

        const content = await storage.read(skill.asset_path);
        return {
          content: [{ type: "text" as const, text: `## ${skill.name} — SKILL.md\n\n${content}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_get_skill_content");
      }
    }
  );
}
