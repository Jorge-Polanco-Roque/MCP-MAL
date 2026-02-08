import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { WorkItemSchema, WorkItemUpdateSchema } from "../schemas/work-item.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { WorkItem, Interaction } from "../types.js";

export function registerWorkItemTools(server: McpServer, db: IDatabase): void {

  // --- mal_create_work_item ---
  server.registerTool(
    "mal_create_work_item",
    {
      title: "Create Work Item",
      description: "Create a work item (task, story, bug, epic, or spike). Similar to creating a Jira ticket. Optionally assign to a sprint and team member.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique work item ID (e.g. MAL-001)"),
        title: z.string().describe("Work item title"),
        description: z.string().optional().describe("Detailed description of the work to be done"),
        type: z.string().optional().describe("Type: epic, story, task (default), bug, spike"),
        status: z.string().optional().describe("Status: backlog (default), todo, in_progress, review, done, cancelled"),
        priority: z.string().optional().describe("Priority: critical, high, medium (default), low"),
        story_points: z.number().optional().describe("Story point estimate (Fibonacci: 1, 2, 3, 5, 8, 13, 21)"),
        sprint_id: z.string().optional().describe("Sprint ID to assign this item to"),
        assignee: z.string().optional().describe("Team member ID to assign this to"),
        reporter: z.string().optional().describe("Team member ID who reported this"),
        labels: z.array(z.string()).optional().describe("Labels for categorization"),
        parent_id: z.string().optional().describe("Parent work item ID (for sub-tasks)"),
        due_date: z.string().optional().describe("Due date (ISO 8601)"),
      },
    },
    async (args) => {
      try {
        const validated = WorkItemSchema.parse(args);

        const existing = await db.get(COLLECTIONS.WORK_ITEMS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Work item '${validated.id}' already exists. Try: Use mal_update_work_item to modify it.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.WORK_ITEMS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Work item '${validated.id}' created successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Created Work Item")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_create_work_item");
      }
    }
  );

  // --- mal_list_work_items ---
  server.registerTool(
    "mal_list_work_items",
    {
      title: "List Work Items",
      description: "List work items with filters. Filter by sprint, assignee, status, type, or priority to see relevant tasks.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        sprint_id: z.string().optional().describe("Filter by sprint ID"),
        assignee: z.string().optional().describe("Filter by assignee team member ID"),
        status: z.string().optional().describe("Filter by status: backlog, todo, in_progress, review, done, cancelled"),
        type: z.string().optional().describe("Filter by type: epic, story, task, bug, spike"),
        priority: z.string().optional().describe("Filter by priority: critical, high, medium, low"),
        limit: z.number().optional().describe("Max results (default 20, max 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({ limit: args.limit, offset: args.offset, status: args.status });
        if (args.sprint_id) options.filters = { ...options.filters, sprint_id: args.sprint_id };
        if (args.assignee) options.filters = { ...options.filters, assignee: args.assignee };
        if (args.type) options.filters = { ...options.filters, type: args.type };
        if (args.priority) options.filters = { ...options.filters, priority: args.priority };
        const result = await db.list<WorkItem>(COLLECTIONS.WORK_ITEMS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Work Items") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_work_items");
      }
    }
  );

  // --- mal_get_work_item ---
  server.registerTool(
    "mal_get_work_item",
    {
      title: "Get Work Item Detail",
      description: "Get full work item detail including linked interactions and sub-tasks.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Work item ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const item = await db.get<WorkItem>(COLLECTIONS.WORK_ITEMS, args.id);
        if (!item) {
          return {
            content: [{ type: "text" as const, text: `Error: Work item '${args.id}' not found. Try: Use mal_list_work_items to see available items.` }],
            isError: true,
          };
        }

        const detail = formatDetailAsMarkdown(item as unknown as Record<string, unknown>, `Work Item: ${item.title}`);

        // Find related interactions
        const interactions = await db.list<Interaction>(COLLECTIONS.INTERACTIONS, {
          filters: { work_item_id: args.id },
          limit: 10,
        });

        let relatedText = "";
        if (interactions.items.length > 0) {
          relatedText = "\n\n---\n\n## Related Interactions\n\n";
          for (const inter of interactions.items) {
            relatedText += `- **${inter.id}**: ${inter.title ?? inter.summary ?? "(no title)"} — ${inter.user_id}, ${inter.created_at}\n`;
          }
        }

        // Find sub-tasks
        const subTasks = await db.list<WorkItem>(COLLECTIONS.WORK_ITEMS, {
          filters: { parent_id: args.id },
          limit: 50,
        });

        let subText = "";
        if (subTasks.items.length > 0) {
          subText = "\n\n---\n\n## Sub-Tasks\n\n";
          for (const sub of subTasks.items) {
            const pts = sub.story_points ? ` [${sub.story_points} pts]` : "";
            subText += `- **${sub.id}** [${sub.status}] ${sub.title}${pts}\n`;
          }
        }

        return { content: [{ type: "text" as const, text: detail + relatedText + subText }] };
      } catch (error) {
        return handleToolError(error, "mal_get_work_item");
      }
    }
  );

  // --- mal_update_work_item ---
  server.registerTool(
    "mal_update_work_item",
    {
      title: "Update Work Item",
      description: "Update a work item's status, assignee, sprint, story points, or other fields. Use to move items across the Kanban board.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Work item ID to update"),
        title: z.string().optional().describe("Updated title"),
        description: z.string().optional().describe("Updated description"),
        status: z.string().optional().describe("New status: backlog, todo, in_progress, review, done, cancelled"),
        priority: z.string().optional().describe("New priority: critical, high, medium, low"),
        story_points: z.number().optional().describe("Updated story points"),
        sprint_id: z.string().optional().describe("Move to a different sprint"),
        assignee: z.string().optional().describe("Reassign to a different team member"),
        labels: z.array(z.string()).optional().describe("Updated labels"),
        due_date: z.string().optional().describe("Updated due date"),
        completed_at: z.string().optional().describe("Completion timestamp (auto-set when status=done)"),
      },
    },
    async (args) => {
      try {
        const existing = await db.get<WorkItem>(COLLECTIONS.WORK_ITEMS, args.id);
        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Work item '${args.id}' not found. Try: Use mal_list_work_items to see available items.` }],
            isError: true,
          };
        }

        const { id, ...updateData } = args;

        // Auto-set completed_at when transitioning to done
        if (updateData.status === "done" && !updateData.completed_at && existing.status !== "done") {
          updateData.completed_at = new Date().toISOString();
        }

        const validated = WorkItemUpdateSchema.parse(updateData);
        const updated = await db.update<WorkItem>(COLLECTIONS.WORK_ITEMS, id, validated);
        return {
          content: [{ type: "text" as const, text: `Work item '${id}' updated successfully.\n\n${formatDetailAsMarkdown(updated as unknown as Record<string, unknown>, "Updated Work Item")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_update_work_item");
      }
    }
  );
}
