import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { InteractionSchema } from "../schemas/interaction.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { Interaction } from "../types.js";

export function registerInteractionTools(server: McpServer, db: IDatabase): void {

  // --- mal_log_interaction ---
  server.registerTool(
    "mal_log_interaction",
    {
      title: "Log Interaction",
      description: "Save a conversation session with messages. Records a Claude Code or web chat interaction for team context and history.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique interaction ID (UUID recommended)"),
        session_id: z.string().describe("Session ID grouping multi-turn conversations"),
        user_id: z.string().describe("Team member ID of the user"),
        source: z.string().optional().describe("Source: claude_code, web_chat, or api (default: claude_code)"),
        title: z.string().optional().describe("Title or summary of the interaction"),
        summary: z.string().optional().describe("AI-generated summary of the conversation"),
        decisions: z.array(z.string()).optional().describe("Key decisions made during the interaction"),
        action_items: z.array(z.string()).optional().describe("Action items extracted from the interaction"),
        tools_used: z.array(z.string()).optional().describe("MCP tools invoked during the interaction"),
        sprint_id: z.string().optional().describe("Link to a sprint if relevant"),
        work_item_id: z.string().optional().describe("Link to a work item if relevant"),
        tags: z.array(z.string()).optional().describe("Tags for categorization"),
        message_count: z.number().optional().describe("Number of messages in the interaction"),
        messages: z.array(z.object({
          role: z.string().describe("Message role: human, assistant, or tool"),
          content: z.string().describe("Message content"),
          tool_calls: z.string().optional().describe("JSON string of tool calls"),
          token_count: z.number().optional().describe("Token count for this message"),
        })).optional().describe("Array of messages in the interaction"),
        metadata: z.record(z.unknown()).optional().describe("Extra metadata (model used, tokens, etc.)"),
      },
    },
    async (args) => {
      try {
        const { messages, ...interactionData } = args;
        const validated = InteractionSchema.parse({
          ...interactionData,
          message_count: interactionData.message_count ?? (messages?.length ?? 0),
        });

        const existing = await db.get(COLLECTIONS.INTERACTIONS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Interaction '${validated.id}' already exists. Try: Use a different ID.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.INTERACTIONS, validated.id, validated);

        if (messages && messages.length > 0) {
          for (const msg of messages) {
            await db.create(COLLECTIONS.INTERACTION_MESSAGES, "", {
              interaction_id: validated.id,
              role: msg.role,
              content: msg.content,
              tool_calls: msg.tool_calls,
              token_count: msg.token_count,
            });
          }
        }

        return {
          content: [{ type: "text" as const, text: `Interaction '${validated.id}' logged successfully with ${messages?.length ?? 0} messages.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Logged Interaction")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_log_interaction");
      }
    }
  );

  // --- mal_list_interactions ---
  server.registerTool(
    "mal_list_interactions",
    {
      title: "List Interactions",
      description: "Browse interaction history with filters. Shows past Claude Code and web chat sessions with summaries and metadata.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        user_id: z.string().optional().describe("Filter by team member ID"),
        sprint_id: z.string().optional().describe("Filter by sprint ID"),
        source: z.string().optional().describe("Filter by source: claude_code, web_chat, api"),
        limit: z.number().optional().describe("Max results (default 20, max 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({
          limit: args.limit,
          offset: args.offset,
          ...(args.user_id && { user_id: args.user_id }),
          ...(args.sprint_id && { sprint_id: args.sprint_id }),
          ...(args.source && { source: args.source }),
        });
        if (args.user_id) options.filters = { ...options.filters, user_id: args.user_id };
        if (args.sprint_id) options.filters = { ...options.filters, sprint_id: args.sprint_id };
        if (args.source) options.filters = { ...options.filters, source: args.source };
        const result = await db.list<Interaction>(COLLECTIONS.INTERACTIONS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Interactions") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_interactions");
      }
    }
  );

  // --- mal_get_interaction ---
  server.registerTool(
    "mal_get_interaction",
    {
      title: "Get Interaction Detail",
      description: "Get full interaction detail including all messages exchanged during the session.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Interaction ID to retrieve"),
      },
    },
    async (args) => {
      try {
        const interaction = await db.get<Interaction>(COLLECTIONS.INTERACTIONS, args.id);
        if (!interaction) {
          return {
            content: [{ type: "text" as const, text: `Error: Interaction '${args.id}' not found. Try: Use mal_list_interactions to see available interactions.` }],
            isError: true,
          };
        }

        const detail = formatDetailAsMarkdown(interaction as unknown as Record<string, unknown>, `Interaction: ${interaction.title ?? interaction.id}`);

        const messagesResult = await db.list(COLLECTIONS.INTERACTION_MESSAGES, {
          filters: { interaction_id: args.id },
          order_by: "created_at",
          order_dir: "asc",
          limit: 100,
        });

        let messagesText = "";
        if (messagesResult.items.length > 0) {
          messagesText = "\n\n---\n\n## Messages\n\n";
          for (const msg of messagesResult.items) {
            const m = msg as unknown as Record<string, unknown>;
            messagesText += `**${String(m.role)}**: ${String(m.content).substring(0, 500)}\n\n`;
          }
        }

        return { content: [{ type: "text" as const, text: detail + messagesText }] };
      } catch (error) {
        return handleToolError(error, "mal_get_interaction");
      }
    }
  );

  // --- mal_search_interactions ---
  server.registerTool(
    "mal_search_interactions",
    {
      title: "Search Interactions",
      description: "Full-text search across past conversations. Searches titles, summaries, and tags of interaction sessions.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        query: z.string().describe("Search query text"),
        user_id: z.string().optional().describe("Filter by team member ID"),
        limit: z.number().optional().describe("Max results (default 20)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({ limit: args.limit, offset: args.offset });
        if (args.user_id) options.filters = { ...options.filters, user_id: args.user_id };
        const result = await db.search<Interaction>(COLLECTIONS.INTERACTIONS, args.query, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, `Interaction Search: "${args.query}"`) }],
        };
      } catch (error) {
        return handleToolError(error, "mal_search_interactions");
      }
    }
  );
}
