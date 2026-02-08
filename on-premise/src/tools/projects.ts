import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { ProjectSchema, ProjectUpdateSchema } from "../schemas/project.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { Project, Sprint, WorkItem } from "../types.js";

export function registerProjectTools(server: McpServer, db: IDatabase): void {

  // --- mal_create_project ---
  server.registerTool(
    "mal_create_project",
    {
      title: "Create Project",
      description: "Create a new project to group sprints and work items. Projects organize work into separate namespaces (e.g. 'bella-italia', 'mal-mcp-hub').",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique project ID (lowercase with hyphens, e.g. bella-italia)"),
        name: z.string().describe("Project display name (e.g. Bella Italia)"),
        description: z.string().optional().describe("Project description"),
        status: z.string().optional().describe("Status: planning, active (default), paused, completed, archived"),
        owner_id: z.string().optional().describe("Team member ID who owns this project"),
        color: z.string().optional().describe("Color for UI display (e.g. blue, green, red, purple)"),
        metadata: z.record(z.unknown()).optional().describe("Extra metadata"),
      },
    },
    async (args) => {
      try {
        const validated = ProjectSchema.parse(args);

        const existing = await db.get(COLLECTIONS.PROJECTS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Project '${validated.id}' already exists. Try: Use mal_update_project to modify it.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.PROJECTS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Project '${validated.id}' created successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Created Project")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_create_project");
      }
    }
  );

  // --- mal_list_projects ---
  server.registerTool(
    "mal_list_projects",
    {
      title: "List Projects",
      description: "List projects with optional status filter. Shows project names, descriptions, status, and owner.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        status: z.string().optional().describe("Filter by status: planning, active, paused, completed, archived"),
        format: z.enum(["markdown", "json"]).optional().describe("Response format: markdown (default) or json for structured data"),
        limit: z.number().optional().describe("Max results (default 20, max 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const result = await db.list<Project>(COLLECTIONS.PROJECTS, options);
        if (args.format === "json") {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ items: result.items, total: result.total, has_more: result.has_more }) }],
          };
        }
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Projects") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_projects");
      }
    }
  );

  // --- mal_get_project ---
  server.registerTool(
    "mal_get_project",
    {
      title: "Get Project Detail",
      description: "Get full project detail including related sprints and work item counts.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Project ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const project = await db.get<Project>(COLLECTIONS.PROJECTS, args.id);
        if (!project) {
          return {
            content: [{ type: "text" as const, text: `Error: Project '${args.id}' not found. Try: Use mal_list_projects to see available projects.` }],
            isError: true,
          };
        }

        const detail = formatDetailAsMarkdown(project as unknown as Record<string, unknown>, `Project: ${project.name}`);

        // Related sprints
        const sprints = await db.list<Sprint>(COLLECTIONS.SPRINTS, {
          filters: { project_id: args.id },
          limit: 50,
        });

        let sprintsText = "";
        if (sprints.items.length > 0) {
          sprintsText = "\n\n---\n\n## Sprints\n\n";
          for (const sprint of sprints.items) {
            sprintsText += `- **${sprint.id}** [${sprint.status}] ${sprint.name} (${sprint.start_date} → ${sprint.end_date})\n`;
          }
        }

        // Work item count
        const workItems = await db.list<WorkItem>(COLLECTIONS.WORK_ITEMS, {
          filters: { project_id: args.id },
          limit: 1,
        });

        let itemsText = "";
        if (workItems.total > 0) {
          itemsText = `\n\n**Work Items**: ${workItems.total} total\n`;
        }

        return { content: [{ type: "text" as const, text: detail + sprintsText + itemsText }] };
      } catch (error) {
        return handleToolError(error, "mal_get_project");
      }
    }
  );

  // --- mal_delete_project ---
  server.registerTool(
    "mal_delete_project",
    {
      title: "Delete Project",
      description: "Delete a project and optionally its associated sprints and work items. This action is irreversible.",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        id: z.string().describe("Project ID to delete"),
        cascade: z.boolean().optional().describe("If true, also delete all sprints and work items belonging to this project (default false)"),
      },
    },
    async (args) => {
      try {
        const project = await db.get<Project>(COLLECTIONS.PROJECTS, args.id);
        if (!project) {
          return {
            content: [{ type: "text" as const, text: `Error: Project '${args.id}' not found. Try: Use mal_list_projects to see available projects.` }],
            isError: true,
          };
        }

        if (args.cascade) {
          // Delete associated work items
          const workItems = await db.list<WorkItem>(COLLECTIONS.WORK_ITEMS, {
            filters: { project_id: args.id },
            limit: 1000,
          });
          for (const item of workItems.items) {
            await db.delete(COLLECTIONS.WORK_ITEMS, item.id);
          }

          // Delete associated sprints
          const sprints = await db.list<Sprint>(COLLECTIONS.SPRINTS, {
            filters: { project_id: args.id },
            limit: 1000,
          });
          for (const sprint of sprints.items) {
            await db.delete(COLLECTIONS.SPRINTS, sprint.id);
          }
        }

        await db.delete(COLLECTIONS.PROJECTS, args.id);

        const cascadeInfo = args.cascade ? " and all associated sprints/work items" : "";
        return {
          content: [{ type: "text" as const, text: `Project '${args.id}' (${project.name}) deleted${cascadeInfo}.` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_delete_project");
      }
    }
  );

  // --- mal_update_project ---
  server.registerTool(
    "mal_update_project",
    {
      title: "Update Project",
      description: "Update project name, description, status, owner, or color.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Project ID to update"),
        name: z.string().optional().describe("New project name"),
        description: z.string().optional().describe("Updated description"),
        status: z.string().optional().describe("New status: planning, active, paused, completed, archived"),
        owner_id: z.string().optional().describe("New owner team member ID"),
        color: z.string().optional().describe("Updated color"),
        metadata: z.record(z.unknown()).optional().describe("Updated metadata"),
      },
    },
    async (args) => {
      try {
        const existing = await db.get<Project>(COLLECTIONS.PROJECTS, args.id);
        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Project '${args.id}' not found. Try: Use mal_list_projects to see available projects.` }],
            isError: true,
          };
        }

        const { id, ...updateData } = args;
        const validated = ProjectUpdateSchema.parse(updateData);
        const updated = await db.update<Project>(COLLECTIONS.PROJECTS, id, validated);
        return {
          content: [{ type: "text" as const, text: `Project '${id}' updated successfully.\n\n${formatDetailAsMarkdown(updated as unknown as Record<string, unknown>, "Updated Project")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_update_project");
      }
    }
  );
}
