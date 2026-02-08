import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { SprintSchema, SprintUpdateSchema } from "../schemas/sprint.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { Sprint, WorkItem } from "../types.js";

export function registerSprintTools(server: McpServer, db: IDatabase): void {

  // --- mal_create_sprint ---
  server.registerTool(
    "mal_create_sprint",
    {
      title: "Create Sprint",
      description: "Create a new sprint with name, goal, dates, and capacity. Use status 'planned' initially, then update to 'active' when the sprint starts.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique sprint ID (e.g. sprint-2026-w07)"),
        name: z.string().describe("Sprint name (e.g. Sprint 7 — Gamification)"),
        goal: z.string().optional().describe("Sprint goal — what the team commits to deliver"),
        start_date: z.string().describe("Start date (ISO 8601, e.g. 2026-02-10)"),
        end_date: z.string().describe("End date (ISO 8601, e.g. 2026-02-21)"),
        status: z.string().optional().describe("Status: planned (default), active, completed, cancelled"),
        team_capacity: z.number().optional().describe("Total story points the team can handle"),
        created_by: z.string().optional().describe("Team member ID who created this sprint"),
        project_id: z.string().optional().describe("Project ID to assign this sprint to"),
        metadata: z.record(z.unknown()).optional().describe("Extra metadata"),
      },
    },
    async (args) => {
      try {
        const validated = SprintSchema.parse(args);

        const existing = await db.get(COLLECTIONS.SPRINTS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Sprint '${validated.id}' already exists. Try: Use mal_update_sprint to modify it.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.SPRINTS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Sprint '${validated.id}' created successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Created Sprint")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_create_sprint");
      }
    }
  );

  // --- mal_list_sprints ---
  server.registerTool(
    "mal_list_sprints",
    {
      title: "List Sprints",
      description: "List sprints with optional status filter. Shows sprint names, dates, status, and velocity.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        status: z.string().optional().describe("Filter by status: planned, active, completed, cancelled"),
        project_id: z.string().optional().describe("Filter by project ID"),
        format: z.enum(["markdown", "json"]).optional().describe("Response format: markdown (default) or json for structured data"),
        limit: z.number().optional().describe("Max results (default 20, max 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({ limit: args.limit, offset: args.offset, status: args.status });
        if (args.project_id) options.filters = { ...options.filters, project_id: args.project_id };
        const result = await db.list<Sprint>(COLLECTIONS.SPRINTS, options);
        if (args.format === "json") {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ items: result.items, total: result.total, has_more: result.has_more }) }],
          };
        }
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Sprints") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_sprints");
      }
    }
  );

  // --- mal_get_sprint ---
  server.registerTool(
    "mal_get_sprint",
    {
      title: "Get Sprint Detail",
      description: "Get full sprint detail including work items, velocity, and AI-generated summary. Shows sprint progress and linked items.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Sprint ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const sprint = await db.get<Sprint>(COLLECTIONS.SPRINTS, args.id);
        if (!sprint) {
          return {
            content: [{ type: "text" as const, text: `Error: Sprint '${args.id}' not found. Try: Use mal_list_sprints to see available sprints.` }],
            isError: true,
          };
        }

        const detail = formatDetailAsMarkdown(sprint as unknown as Record<string, unknown>, `Sprint: ${sprint.name}`);

        const workItems = await db.list<WorkItem>(COLLECTIONS.WORK_ITEMS, {
          filters: { sprint_id: args.id },
          order_by: "status",
          order_dir: "asc",
          limit: 100,
        });

        let itemsText = "";
        if (workItems.items.length > 0) {
          itemsText = "\n\n---\n\n## Work Items\n\n";
          const byStatus: Record<string, WorkItem[]> = {};
          for (const item of workItems.items) {
            const s = item.status;
            if (!byStatus[s]) byStatus[s] = [];
            byStatus[s].push(item);
          }
          for (const [status, items] of Object.entries(byStatus)) {
            itemsText += `### ${status} (${items.length})\n\n`;
            for (const item of items) {
              const pts = item.story_points ? ` [${item.story_points} pts]` : "";
              const assignee = item.assignee ? ` → ${item.assignee}` : "";
              itemsText += `- **${item.id}** ${item.title}${pts}${assignee}\n`;
            }
            itemsText += "\n";
          }

          const totalPoints = workItems.items.reduce((sum, i) => sum + (i.story_points ?? 0), 0);
          const donePoints = workItems.items
            .filter(i => i.status === "done")
            .reduce((sum, i) => sum + (i.story_points ?? 0), 0);
          itemsText += `**Velocity**: ${donePoints} / ${totalPoints} story points completed\n`;
        }

        return { content: [{ type: "text" as const, text: detail + itemsText }] };
      } catch (error) {
        return handleToolError(error, "mal_get_sprint");
      }
    }
  );

  // --- mal_update_sprint ---
  server.registerTool(
    "mal_update_sprint",
    {
      title: "Update Sprint",
      description: "Update sprint status, goal, summary, or retrospective. Use to transition sprints (planned → active → completed).",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Sprint ID to update"),
        name: z.string().optional().describe("New sprint name"),
        goal: z.string().optional().describe("Updated sprint goal"),
        status: z.string().optional().describe("New status: planned, active, completed, cancelled"),
        velocity: z.number().optional().describe("Calculated velocity (story points completed)"),
        summary: z.string().optional().describe("AI-generated sprint summary"),
        retrospective: z.string().optional().describe("AI-generated retrospective"),
        metadata: z.record(z.unknown()).optional().describe("Updated metadata"),
      },
    },
    async (args) => {
      try {
        const existing = await db.get<Sprint>(COLLECTIONS.SPRINTS, args.id);
        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Sprint '${args.id}' not found. Try: Use mal_list_sprints to see available sprints.` }],
            isError: true,
          };
        }

        const { id, ...updateData } = args;
        const validated = SprintUpdateSchema.parse(updateData);
        const updated = await db.update<Sprint>(COLLECTIONS.SPRINTS, id, validated);
        return {
          content: [{ type: "text" as const, text: `Sprint '${id}' updated successfully.\n\n${formatDetailAsMarkdown(updated as unknown as Record<string, unknown>, "Updated Sprint")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_update_sprint");
      }
    }
  );
}
