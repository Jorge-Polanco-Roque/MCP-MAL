import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { SubagentConfigSchema } from "../schemas/subagent.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { SubagentConfig } from "../types.js";

export function registerSubagentTools(
  server: McpServer,
  db: IDatabase
): void {
  server.registerTool(
    "mal_list_subagents",
    {
      title: "List Subagents",
      description: "List registered subagent configurations",
      annotations: { readOnlyHint: true },
      inputSchema: {
        limit: z.number().optional().describe("Max results (default 20)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const result = await db.list<SubagentConfig>(COLLECTIONS.SUBAGENTS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Subagents") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_subagents");
      }
    }
  );

  server.registerTool(
    "mal_get_subagent",
    {
      title: "Get Subagent Config",
      description: "Get the full configuration of a registered subagent",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Subagent ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const subagent = await db.get<SubagentConfig>(COLLECTIONS.SUBAGENTS, args.id);
        if (!subagent) {
          return {
            content: [{ type: "text" as const, text: `Error: Subagent '${args.id}' not found.` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text" as const, text: formatDetailAsMarkdown(subagent as unknown as Record<string, unknown>, `Subagent: ${subagent.name}`) }],
        };
      } catch (error) {
        return handleToolError(error, "mal_get_subagent");
      }
    }
  );

  server.registerTool(
    "mal_register_subagent",
    {
      title: "Register Subagent",
      description: "Register a new subagent configuration in the catalog",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique subagent ID (lowercase, hyphens)"),
        name: z.string().describe("Display name"),
        description: z.string().describe("What this subagent does"),
        system_prompt: z.string().describe("System prompt for the subagent"),
        model: z.string().optional().describe("Model to use (default: claude-sonnet-4-5-20250929)"),
        tools_allowed: z.array(z.string()).optional().describe("List of tools the subagent can use"),
        max_turns: z.number().optional().describe("Max conversation turns (default 5, max 50)"),
        input_schema: z.record(z.unknown()).optional().describe("Expected input schema as JSON"),
        output_format: z.string().optional().describe("Output format: text, json, or markdown"),
        author: z.string().describe("Author name"),
        tags: z.array(z.string()).optional().describe("Tags for categorization"),
      },
    },
    async (args) => {
      try {
        const validated = SubagentConfigSchema.parse(args);
        const existing = await db.get(COLLECTIONS.SUBAGENTS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Subagent '${validated.id}' already exists.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.SUBAGENTS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Subagent '${validated.id}' registered successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Registered Subagent")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_register_subagent");
      }
    }
  );
}
