import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { CommandEntrySchema } from "../schemas/command.schema.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { formatAsMarkdown, formatDetailAsMarkdown } from "../utils/formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import type { CommandEntry } from "../types.js";

function renderTemplate(template: string, params: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(params)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return rendered;
}

export function registerCommandTools(
  server: McpServer,
  db: IDatabase
): void {
  server.registerTool(
    "mal_list_commands",
    {
      title: "List Commands",
      description: "List available commands with optional category and tag filters",
      annotations: { readOnlyHint: true },
      inputSchema: {
        category: z.string().optional().describe("Filter by command category"),
        tags: z.string().optional().describe("Filter by tags (comma-separated)"),
        limit: z.number().optional().describe("Max results (default 20)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions(args);
        const result = await db.list<CommandEntry>(COLLECTIONS.COMMANDS, options);
        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(result as never, "Commands") }],
        };
      } catch (error) {
        return handleToolError(error, "mal_list_commands");
      }
    }
  );

  server.registerTool(
    "mal_get_command",
    {
      title: "Get Command Detail",
      description: "Get full detail of a command, optionally rendering its script template with parameters",
      annotations: { readOnlyHint: true },
      inputSchema: {
        id: z.string().describe("Command ID to retrieve"),
        params: z.record(z.string()).optional().describe("Parameters to render the script template"),
      },
    },
    async (args) => {
      try {
        const command = await db.get<CommandEntry>(COLLECTIONS.COMMANDS, args.id);
        if (!command) {
          return {
            content: [{ type: "text" as const, text: `Error: Command '${args.id}' not found. Try: Use mal_list_commands to see available commands.` }],
            isError: true,
          };
        }

        let detail = formatDetailAsMarkdown(command as unknown as Record<string, unknown>, `Command: ${command.name}`);

        if (args.params) {
          const rendered = renderTemplate(command.script_template, args.params);
          detail += `\n\n---\n\n## Rendered Script\n\n\`\`\`${command.shell}\n${rendered}\n\`\`\``;
        }

        return { content: [{ type: "text" as const, text: detail }] };
      } catch (error) {
        return handleToolError(error, "mal_get_command");
      }
    }
  );

  server.registerTool(
    "mal_register_command",
    {
      title: "Register Command",
      description: "Register a new command with a script template and parameters in the catalog",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().describe("Unique command ID (lowercase, hyphens)"),
        name: z.string().describe("Display name"),
        description: z.string().describe("What this command does"),
        category: z.string().describe("Command category (e.g. devops, git, database)"),
        shell: z.string().describe("Shell type: bash, python, or node"),
        script_template: z.string().describe("Script template with {{variable}} placeholders"),
        parameters: z.array(z.object({
          name: z.string().describe("Parameter name"),
          type: z.enum(["string", "number", "boolean", "enum"]).describe("Parameter type"),
          description: z.string().describe("Parameter description"),
          required: z.boolean().describe("Whether parameter is required"),
          default: z.string().optional().describe("Default value"),
          enum_values: z.array(z.string()).optional().describe("Allowed values for enum type"),
        })).optional().describe("Command parameters definition"),
        requires_confirmation: z.boolean().optional().describe("Require user confirmation before execution"),
        author: z.string().describe("Author name"),
        tags: z.array(z.string()).optional().describe("Tags for categorization"),
      },
    },
    async (args) => {
      try {
        const validated = CommandEntrySchema.parse(args);
        const existing = await db.get(COLLECTIONS.COMMANDS, validated.id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: `Error: Command '${validated.id}' already exists.` }],
            isError: true,
          };
        }

        const created = await db.create(COLLECTIONS.COMMANDS, validated.id, validated);
        return {
          content: [{ type: "text" as const, text: `Command '${validated.id}' registered successfully.\n\n${formatDetailAsMarkdown(created as unknown as Record<string, unknown>, "Registered Command")}` }],
        };
      } catch (error) {
        return handleToolError(error, "mal_register_command");
      }
    }
  );

  server.registerTool(
    "mal_execute_command",
    {
      title: "Execute Command",
      description: "Render a command template with parameters and return the script ready for execution",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        id: z.string().describe("Command ID to execute"),
        params: z.record(z.string()).optional().describe("Parameters for the script template"),
      },
    },
    async (args) => {
      try {
        const command = await db.get<CommandEntry>(COLLECTIONS.COMMANDS, args.id);
        if (!command) {
          return {
            content: [{ type: "text" as const, text: `Error: Command '${args.id}' not found.` }],
            isError: true,
          };
        }

        // Validate required parameters
        for (const param of command.parameters) {
          if (param.required && (!args.params || !(param.name in args.params))) {
            return {
              content: [{ type: "text" as const, text: `Error: Required parameter '${param.name}' is missing.\n\nRequired parameters: ${command.parameters.filter(p => p.required).map(p => p.name).join(", ")}` }],
              isError: true,
            };
          }
        }

        // Fill defaults
        const resolvedParams: Record<string, string> = {};
        for (const param of command.parameters) {
          if (args.params && param.name in args.params) {
            resolvedParams[param.name] = args.params[param.name];
          } else if (param.default !== undefined) {
            resolvedParams[param.name] = param.default;
          }
        }

        const rendered = renderTemplate(command.script_template, resolvedParams);

        let response = `## Execute: ${command.name}\n\n`;
        response += `**Shell**: ${command.shell}\n`;
        response += `**Requires Confirmation**: ${command.requires_confirmation}\n\n`;
        response += `\`\`\`${command.shell}\n${rendered}\n\`\`\``;

        if (command.requires_confirmation) {
          response += `\n\nThis command requires confirmation before execution.`;
        }

        return { content: [{ type: "text" as const, text: response }] };
      } catch (error) {
        return handleToolError(error, "mal_execute_command");
      }
    }
  );
}
