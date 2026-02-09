import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { handleToolError } from "../utils/error-handler.js";
import type { AuditEntry } from "../utils/audit.js";

export function registerAuditTools(server: McpServer, db: IDatabase): void {

  // --- mal_get_audit_log ---
  server.registerTool(
    "mal_get_audit_log",
    {
      title: "Get Audit Log",
      description: "Query tool usage history. Shows which MCP tools were called, when, duration, and success/failure. Filter by tool name or date range.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        tool_name: z.string().optional().describe("Filter by tool name (e.g. 'mal_list_skills')"),
        limit: z.number().optional().describe("Max results (default 20, max 100)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
    },
    async (args) => {
      try {
        const options = buildQueryOptions({ limit: args.limit, offset: args.offset });
        options.order_by = "timestamp";

        if (args.tool_name) {
          options.filters = { ...options.filters, tool_name: args.tool_name };
        }

        const result = await db.list<AuditEntry>(COLLECTIONS.USAGE_LOG, options);

        if (result.items.length === 0) {
          return {
            content: [{ type: "text" as const, text: "## Audit Log\n\nNo entries found." }],
          };
        }

        const lines: string[] = [
          "## Audit Log",
          "",
          `Showing ${result.items.length} of ${result.total} entries`,
          "",
          "| Timestamp | Tool | Resource | Duration | Status |",
          "|-----------|------|----------|----------|--------|",
        ];

        for (const entry of result.items) {
          const status = entry.success ? "ok" : "FAIL";
          const dur = entry.duration_ms != null ? `${entry.duration_ms}ms` : "-";
          const resource = entry.resource_id ?? "-";
          lines.push(`| ${entry.timestamp} | \`${entry.tool_name}\` | ${resource} | ${dur} | ${status} |`);
        }

        if (result.has_more) {
          lines.push("");
          lines.push(`*${result.total - result.items.length} more entries. Use offset=${result.next_offset} to see more.*`);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_get_audit_log");
      }
    }
  );

  // --- mal_get_tool_usage_stats ---
  server.registerTool(
    "mal_get_tool_usage_stats",
    {
      title: "Get Tool Usage Stats",
      description: "Aggregated usage statistics for MCP tools. Shows call counts, average duration, and error rates per tool.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        days: z.number().optional().describe("Number of days to look back (default: 7)"),
      },
    },
    async (args) => {
      try {
        const days = args.days ?? 7;

        // Fetch all usage log entries (up to 10000 for aggregation)
        const result = await db.list<AuditEntry>(COLLECTIONS.USAGE_LOG, {
          order_by: "timestamp",
          limit: 10000,
        });

        const cutoff = new Date(Date.now() - days * 86400000).toISOString();

        // Aggregate by tool
        const stats: Record<string, { calls: number; errors: number; totalDuration: number; durations: number[] }> = {};

        for (const entry of result.items) {
          if (entry.timestamp < cutoff) continue;

          if (!stats[entry.tool_name]) {
            stats[entry.tool_name] = { calls: 0, errors: 0, totalDuration: 0, durations: [] };
          }
          const s = stats[entry.tool_name];
          s.calls++;
          if (!entry.success) s.errors++;
          if (entry.duration_ms != null) {
            s.totalDuration += entry.duration_ms;
            s.durations.push(entry.duration_ms);
          }
        }

        const toolNames = Object.keys(stats).sort((a, b) => stats[b].calls - stats[a].calls);

        if (toolNames.length === 0) {
          return {
            content: [{ type: "text" as const, text: `## Tool Usage Stats (last ${days} days)\n\nNo tool usage recorded.` }],
          };
        }

        const totalCalls = toolNames.reduce((s, t) => s + stats[t].calls, 0);
        const totalErrors = toolNames.reduce((s, t) => s + stats[t].errors, 0);

        const lines: string[] = [
          `## Tool Usage Stats (last ${days} days)`,
          "",
          `**Total calls**: ${totalCalls}`,
          `**Total errors**: ${totalErrors}`,
          `**Error rate**: ${totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(1) : "0.0"}%`,
          "",
          "| Tool | Calls | Errors | Error% | Avg Duration |",
          "|------|-------|--------|--------|-------------|",
        ];

        for (const tool of toolNames) {
          const s = stats[tool];
          const errPct = s.calls > 0 ? ((s.errors / s.calls) * 100).toFixed(1) : "0.0";
          const avgDur = s.durations.length > 0 ? `${Math.round(s.totalDuration / s.durations.length)}ms` : "-";
          lines.push(`| \`${tool}\` | ${s.calls} | ${s.errors} | ${errPct}% | ${avgDur} |`);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_get_tool_usage_stats");
      }
    }
  );
}
