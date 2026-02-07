import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { handleToolError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";
import type { MCPRegistryEntry } from "../types.js";

export function registerMCPProxyTools(
  server: McpServer,
  db: IDatabase
): void {
  server.registerTool(
    "mal_proxy_mcp_call",
    {
      title: "Proxy MCP Call",
      description: "Proxy a tool call to a registered downstream MCP server. Returns call details ready for execution.",
      annotations: { readOnlyHint: false, openWorldHint: true },
      inputSchema: {
        mcp_id: z.string().describe("ID of the registered MCP to call"),
        tool_name: z.string().describe("Name of the tool on the downstream MCP"),
        arguments: z.record(z.unknown()).optional().describe("Arguments to pass to the downstream tool"),
      },
    },
    async (args) => {
      try {
        const mcp = await db.get<MCPRegistryEntry>(COLLECTIONS.MCPS, args.mcp_id);
        if (!mcp) {
          return {
            content: [{ type: "text" as const, text: `Error: MCP '${args.mcp_id}' not found. Try: Use mal_list_mcps to see available MCPs.` }],
            isError: true,
          };
        }

        if (mcp.status !== "active") {
          return {
            content: [{ type: "text" as const, text: `Error: MCP '${args.mcp_id}' is not active (status: ${mcp.status}).` }],
            isError: true,
          };
        }

        if (mcp.tools_exposed.length > 0 && !mcp.tools_exposed.includes(args.tool_name)) {
          return {
            content: [{ type: "text" as const, text: `Error: Tool '${args.tool_name}' is not exposed by MCP '${args.mcp_id}'. Available tools: ${mcp.tools_exposed.join(", ")}` }],
            isError: true,
          };
        }

        logger.info({ mcp_id: args.mcp_id, tool: args.tool_name }, "MCP proxy call");

        const proxyInfo = {
          mcp_id: args.mcp_id,
          mcp_name: mcp.name,
          transport: mcp.transport,
          endpoint: mcp.endpoint_url ?? mcp.command,
          tool_name: args.tool_name,
          arguments: args.arguments ?? {},
        };

        return {
          content: [{
            type: "text" as const,
            text: `## MCP Proxy Call\n\n**Target MCP**: ${mcp.name} (\`${mcp.id}\`)\n**Transport**: ${mcp.transport}\n**Tool**: ${args.tool_name}\n**Arguments**: \`${JSON.stringify(args.arguments ?? {})}\`\n\n\`\`\`json\n${JSON.stringify(proxyInfo, null, 2)}\n\`\`\``,
          }],
        };
      } catch (error) {
        return handleToolError(error, "mal_proxy_mcp_call");
      }
    }
  );

  server.registerTool(
    "mal_health_check",
    {
      title: "Health Check",
      description: "Check health status of the database and all registered MCP servers",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      try {
        const dbOk = await db.ping();

        const mcpsResult = await db.list<MCPRegistryEntry>(COLLECTIONS.MCPS, { limit: 100 });
        const mcpStatuses = mcpsResult.items.map((mcp) => ({
          id: mcp.id,
          name: mcp.name,
          status: mcp.status,
          transport: mcp.transport,
          endpoint: mcp.endpoint_url ?? mcp.command ?? "N/A",
        }));

        let report = `## Health Check Report\n\n`;
        report += `**Database**: ${dbOk ? "OK — Connected" : "ERROR — Disconnected"}\n\n`;

        if (mcpStatuses.length > 0) {
          report += `### Registered MCPs (${mcpStatuses.length})\n\n`;
          for (const mcp of mcpStatuses) {
            const statusLabel = mcp.status === "active" ? "ACTIVE" : mcp.status === "inactive" ? "INACTIVE" : "ERROR";
            report += `- [${statusLabel}] **${mcp.name}** (\`${mcp.id}\`) — ${mcp.transport} — ${mcp.endpoint}\n`;
          }
        } else {
          report += `*No MCP servers registered.*\n`;
        }

        return { content: [{ type: "text" as const, text: report }] };
      } catch (error) {
        return handleToolError(error, "mal_health_check");
      }
    }
  );
}
