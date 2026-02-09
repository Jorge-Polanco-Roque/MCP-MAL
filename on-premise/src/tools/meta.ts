import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { handleToolError } from "../utils/error-handler.js";
import { buildQueryOptions } from "../utils/pagination.js";
import type { SkillEntry, CommandEntry, SubagentConfig, MCPRegistryEntry } from "../types.js";

interface CatalogExport {
  version: string;
  exported_at: string;
  skills: SkillEntry[];
  commands: CommandEntry[];
  subagents: SubagentConfig[];
  mcps: MCPRegistryEntry[];
}

export function registerMetaTools(
  server: McpServer,
  db: IDatabase
): void {
  server.registerTool(
    "mal_search_catalog",
    {
      title: "Search Catalog",
      description: "Full-text search across all catalog collections (skills, commands, subagents, MCPs)",
      annotations: { readOnlyHint: true },
      inputSchema: {
        query: z.string().describe("Search query text"),
        collection: z.string().optional().describe("Limit search to one collection: skills, commands, subagents, mcps"),
        limit: z.number().optional().describe("Max results per collection"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const collections = args.collection
          ? [args.collection]
          : [COLLECTIONS.SKILLS, COLLECTIONS.COMMANDS, COLLECTIONS.SUBAGENTS, COLLECTIONS.MCPS];

        const allResults: Array<{ collection: string; id: string; name: string; description: string }> = [];

        for (const col of collections) {
          const result = await db.search<Record<string, unknown>>(col, args.query, options);
          for (const item of result.items) {
            allResults.push({
              collection: col,
              id: item.id as string,
              name: item.name as string,
              description: item.description as string,
            });
          }
        }

        if (allResults.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No results found for '${args.query}'. Try: Use broader search terms.` }],
          };
        }

        const lines = allResults.map((r) =>
          `- [${r.collection}] **${r.name}** (\`${r.id}\`) — ${r.description}`
        );

        return {
          content: [{
            type: "text" as const,
            text: `## Catalog Search: '${args.query}'\n\n${lines.join("\n")}\n\n*${allResults.length} total results*`,
          }],
        };
      } catch (error) {
        return handleToolError(error, "mal_search_catalog");
      }
    }
  );

  server.registerTool(
    "mal_export_catalog",
    {
      title: "Export Catalog",
      description: "Export the entire catalog (skills, commands, subagents, MCPs) as JSON",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      try {
        const [skills, commands, subagents, mcps] = await Promise.all([
          db.list<SkillEntry>(COLLECTIONS.SKILLS, { limit: 1000 }),
          db.list<CommandEntry>(COLLECTIONS.COMMANDS, { limit: 1000 }),
          db.list<SubagentConfig>(COLLECTIONS.SUBAGENTS, { limit: 1000 }),
          db.list<MCPRegistryEntry>(COLLECTIONS.MCPS, { limit: 1000 }),
        ]);

        const exportData: CatalogExport = {
          version: "1.0.0",
          exported_at: new Date().toISOString(),
          skills: skills.items,
          commands: commands.items,
          subagents: subagents.items,
          mcps: mcps.items,
        };

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(exportData, null, 2),
          }],
        };
      } catch (error) {
        return handleToolError(error, "mal_export_catalog");
      }
    }
  );

  server.registerTool(
    "mal_import_catalog",
    {
      title: "Import Catalog",
      description: "Import a catalog from JSON. Merges with existing data (skips duplicates).",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        data: z.string().describe("JSON string of the catalog export (from mal_export_catalog)"),
      },
    },
    async (args) => {
      try {
        const importData = JSON.parse(args.data) as CatalogExport;
        let imported = 0;
        let skipped = 0;

        for (const skill of importData.skills ?? []) {
          const existing = await db.get(COLLECTIONS.SKILLS, skill.id);
          if (!existing) {
            await db.create(COLLECTIONS.SKILLS, skill.id, skill);
            imported++;
          } else {
            skipped++;
          }
        }

        for (const command of importData.commands ?? []) {
          const existing = await db.get(COLLECTIONS.COMMANDS, command.id);
          if (!existing) {
            await db.create(COLLECTIONS.COMMANDS, command.id, command);
            imported++;
          } else {
            skipped++;
          }
        }

        for (const subagent of importData.subagents ?? []) {
          const existing = await db.get(COLLECTIONS.SUBAGENTS, subagent.id);
          if (!existing) {
            await db.create(COLLECTIONS.SUBAGENTS, subagent.id, subagent);
            imported++;
          } else {
            skipped++;
          }
        }

        for (const mcp of importData.mcps ?? []) {
          const existing = await db.get(COLLECTIONS.MCPS, mcp.id);
          if (!existing) {
            await db.create(COLLECTIONS.MCPS, mcp.id, mcp);
            imported++;
          } else {
            skipped++;
          }
        }

        return {
          content: [{
            type: "text" as const,
            text: `## Import Complete\n\n- **Imported**: ${imported} entries\n- **Skipped** (already exist): ${skipped} entries`,
          }],
        };
      } catch (error) {
        return handleToolError(error, "mal_import_catalog");
      }
    }
  );

  server.registerTool(
    "mal_get_usage_stats",
    {
      title: "Usage Stats",
      description: "Get catalog totals and usage statistics for the MCP hub",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      try {
        const [skills, commands, subagents, mcps, teamMembers, sprints, workItems, projects] = await Promise.all([
          db.list<SkillEntry>(COLLECTIONS.SKILLS, { limit: 1 }),
          db.list<CommandEntry>(COLLECTIONS.COMMANDS, { limit: 1 }),
          db.list<SubagentConfig>(COLLECTIONS.SUBAGENTS, { limit: 1 }),
          db.list<MCPRegistryEntry>(COLLECTIONS.MCPS, { limit: 1 }),
          db.list<Record<string, unknown>>(COLLECTIONS.TEAM_MEMBERS, { limit: 1 }),
          db.list<Record<string, unknown>>(COLLECTIONS.SPRINTS, { limit: 1 }),
          db.list<Record<string, unknown>>(COLLECTIONS.WORK_ITEMS, { limit: 1 }),
          db.list<Record<string, unknown>>(COLLECTIONS.PROJECTS, { limit: 1 }),
        ]);

        let report = `## MAL MCP Hub — Usage Stats\n\n`;
        report += `### Catalog Totals\n\n`;
        report += `- **Skills**: ${skills.total}\n`;
        report += `- **Commands**: ${commands.total}\n`;
        report += `- **Subagents**: ${subagents.total}\n`;
        report += `- **MCPs**: ${mcps.total}\n`;
        report += `\n### Collaboration Totals\n\n`;
        report += `- **Projects**: ${projects.total}\n`;
        report += `- **Sprints**: ${sprints.total}\n`;
        report += `- **Work Items**: ${workItems.total}\n`;
        report += `- **Team Members**: ${teamMembers.total}\n`;

        return { content: [{ type: "text" as const, text: report }] };
      } catch (error) {
        return handleToolError(error, "mal_get_usage_stats");
      }
    }
  );
}
