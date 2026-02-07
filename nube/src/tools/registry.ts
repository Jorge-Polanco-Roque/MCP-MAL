import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import type { IStorage } from "../services/storage.js";
import { COLLECTIONS } from "../constants.js";
import { SkillEntrySchema, SkillUpdateSchema } from "../schemas/skill.schema.js";
import { MCPRegistryEntrySchema } from "../schemas/mcp-entry.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { SkillEntry, MCPRegistryEntry } from "../types.js";

export function registerRegistryTools(
  server: McpServer,
  db: IDatabase,
  storage: IStorage
): void {
  // ── Skills CRUD ──

  server.registerTool(
    "mal_list_skills",
    {
      title: "List Skills",
      description: "List skills with optional filters (category, tags, search query)",
      annotations: { readOnlyHint: true },
      inputSchema: {
        category: z.string().optional().describe("Filter by category: data, document, devops, frontend, design, custom"),
        tags: z.string().optional().describe("Filter by tags (comma-separated)"),
        limit: z.number().optional().describe("Max results (default 20, max 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const result = await db.list<SkillEntry>(COLLECTIONS.SKILLS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Skills") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_skills");
      }
    }
  );

  server.registerTool(
    "mal_get_skill",
    {
      title: "Get Skill Detail",
      description: "Get full detail of a skill including its SKILL.md asset content",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Skill ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const skill = await db.get<SkillEntry>(COLLECTIONS.SKILLS, args.id);
        if (!skill) {
          return {
            content: [{ type: "text" as const, text: `Error: Skill '${args.id}' not found. Try: Use mal_list_skills to see available skills.` }],
            isError: true,
          };
        }

        let assetContent = "";
        const assetExists = await storage.exists(skill.asset_path);
        if (assetExists) {
          assetContent = await storage.read(skill.asset_path);
        }

        const detail = formatDetailAsMarkdown(skill as unknown as Record<string, unknown>, `Skill: ${skill.name}`);
        const fullText = assetContent ? `${detail}\n\n---\n\n## Asset Content\n\n${assetContent}` : detail;

        return { content: [{ type: "text" as const, text: fullText }] };
      } catch (error) {
        return handleToolError(error, "mal_get_skill");
      }
    }
  );

  server.registerTool(
    "mal_register_skill",
    {
      title: "Register Skill",
      description: "Register a new skill in the catalog with optional SKILL.md content",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique skill ID (lowercase, hyphens only)"),
        name: z.string().describe("Display name for the skill"),
        description: z.string().describe("What this skill does"),
        version: z.string().describe("Semver version (e.g. 1.0.0)"),
        category: z.string().describe("Category: data, document, devops, frontend, design, custom"),
        trigger_patterns: z.array(z.string()).optional().describe("Patterns that trigger this skill"),
        asset_path: z.string().describe("Path to the SKILL.md asset file"),
        asset_content: z.string().optional().describe("Content for the SKILL.md file (will be written to asset_path)"),
        dependencies: z.array(z.string()).optional().describe("Dependency skill IDs"),
        author: z.string().describe("Author name"),
        tags: z.array(z.string()).optional().describe("Tags for categorization"),
      },
    },
    async (args) => {
      try {
        const { asset_content, ...skillData } = args;
        const validated = SkillEntrySchema.parse(skillData);

        const existing = await db.get(COLLECTIONS.SKILLS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Skill '${validated.id}' already exists. Try: Use mal_update_skill to modify it.` }],
            isError: true,
          };
        }

        if (asset_content) {
          await storage.write(validated.asset_path, asset_content);
        }

        const created = await db.create(COLLECTIONS.SKILLS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Skill '${validated.id}' registered successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Registered Skill")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_register_skill");
      }
    }
  );

  server.registerTool(
    "mal_update_skill",
    {
      title: "Update Skill",
      description: "Update an existing skill's metadata or SKILL.md content",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Skill ID to update"),
        name: z.string().optional().describe("New display name"),
        description: z.string().optional().describe("New description"),
        version: z.string().optional().describe("New semver version"),
        category: z.string().optional().describe("New category"),
        trigger_patterns: z.array(z.string()).optional().describe("New trigger patterns"),
        asset_path: z.string().optional().describe("New asset path"),
        asset_content: z.string().optional().describe("New content for the SKILL.md"),
        dependencies: z.array(z.string()).optional().describe("New dependency list"),
        tags: z.array(z.string()).optional().describe("New tags"),
      },
    },
    async (args) => {
      try {
        const existing = await db.get<SkillEntry>(COLLECTIONS.SKILLS, args.id);
        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Skill '${args.id}' not found.` }],
            isError: true,
          };
        }

        const { id, asset_content, ...updateData } = args;
        const validated = SkillUpdateSchema.parse(updateData);

        if (asset_content) {
          const assetPath = validated.asset_path ?? existing.asset_path;
          await storage.write(assetPath, asset_content);
        }

        const updated = await db.update<SkillEntry>(COLLECTIONS.SKILLS, id, validated);
        return {
          content: [{ type: "text" as const, text: `Skill '${id}' updated successfully.\n\n${formatDetailAsMarkdown(updated as unknown as Record<string, unknown>, "Updated Skill")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_update_skill");
      }
    }
  );

  server.registerTool(
    "mal_delete_skill",
    {
      title: "Delete Skill",
      description: "Delete a skill and its asset from the catalog (irreversible)",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        id: z.string().describe("Skill ID to delete"),
      },
    },
    async (args) => {
      try {
        const existing = await db.get<SkillEntry>(COLLECTIONS.SKILLS, args.id);
        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Skill '${args.id}' not found.` }],
            isError: true,
          };
        }

        const assetExists = await storage.exists(existing.asset_path);
        if (assetExists) {
          await storage.delete(existing.asset_path);
        }

        await db.delete(COLLECTIONS.SKILLS, args.id);
        return {
          content: [{ type: "text" as const, text: `Skill '${args.id}' deleted successfully.` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_delete_skill");
      }
    }
  );

  // ── MCPs Registry ──

  server.registerTool(
    "mal_list_mcps",
    {
      title: "List MCP Servers",
      description: "List registered downstream MCP servers and their status",
      annotations: { readOnlyHint: true },
      inputSchema: {
        status: z.string().optional().describe("Filter by status: active, inactive, error"),
        limit: z.number().optional().describe("Max results"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const result = await db.list<MCPRegistryEntry>(COLLECTIONS.MCPS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "MCP Servers") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_mcps");
      }
    }
  );

  server.registerTool(
    "mal_register_mcp",
    {
      title: "Register MCP Server",
      description: "Register an external downstream MCP server in the catalog",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique MCP ID (lowercase, hyphens)"),
        name: z.string().describe("Display name"),
        description: z.string().describe("What this MCP provides"),
        transport: z.string().describe("Transport type: streamable-http or stdio"),
        endpoint_url: z.string().optional().describe("URL for HTTP transport"),
        command: z.string().optional().describe("Command for stdio transport"),
        args: z.array(z.string()).optional().describe("Args for stdio transport"),
        env_vars: z.record(z.string()).optional().describe("Environment variables"),
        health_check_url: z.string().optional().describe("Health check URL"),
        tools_exposed: z.array(z.string()).optional().describe("List of tools this MCP exposes"),
        author: z.string().describe("Author name"),
      },
    },
    async (args) => {
      try {
        const validated = MCPRegistryEntrySchema.parse(args);
        const existing = await db.get(COLLECTIONS.MCPS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: MCP '${validated.id}' already exists.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.MCPS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `MCP '${validated.id}' registered successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Registered MCP")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_register_mcp");
      }
    }
  );
}
