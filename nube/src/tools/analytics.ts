import { z } from "zod";
import { execSync } from "child_process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { handleToolError } from "../utils/error-handler.js";
import type { WorkItem, Sprint, Contribution } from "../types.js";

export function registerAnalyticsTools(server: McpServer, db: IDatabase): void {

  // --- mal_get_commit_activity ---
  server.registerTool(
    "mal_get_commit_activity",
    {
      title: "Get Commit Activity",
      description: "Get git commit activity data for visualization. Parses the local git log to extract daily commit counts, per-author stats, and file change metrics.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        repo_path: z.string().optional().describe("Path to git repository (default: current working directory)"),
        days: z.number().optional().describe("Number of days to look back (default: 30)"),
        author: z.string().optional().describe("Filter by author name or email"),
      },
    },
    async (args) => {
      try {
        const repoPath = args.repo_path ?? process.env.GIT_REPO_PATH ?? ".";
        const days = args.days ?? 30;
        const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

        let gitCmd = `git -C "${repoPath}" log --since="${since}" --format="%H|%an|%ae|%aI|%s" --shortstat`;
        if (args.author) {
          gitCmd += ` --author="${args.author}"`;
        }

        let gitOutput: string;
        try {
          gitOutput = execSync(gitCmd, { encoding: "utf-8", timeout: 10000 });
        } catch {
          return {
            content: [{ type: "text" as const, text: `Error: Could not read git log from '${repoPath}'. Try: Ensure the path is a valid git repository.` }],
            isError: true,
          };
        }

        // Parse git log output
        const commits: Array<{ hash: string; author: string; email: string; date: string; message: string; insertions: number; deletions: number; files: number }> = [];
        const lines = gitOutput.trim().split("\n");
        let current: { hash: string; author: string; email: string; date: string; message: string; insertions: number; deletions: number; files: number } | null = null;

        for (const line of lines) {
          if (line.includes("|") && line.split("|").length >= 5) {
            const [hash, author, email, date, ...messageParts] = line.split("|");
            current = { hash, author, email, date: date.split("T")[0], message: messageParts.join("|"), insertions: 0, deletions: 0, files: 0 };
            commits.push(current);
          } else if (current && line.trim()) {
            const filesMatch = line.match(/(\d+) files? changed/);
            const insMatch = line.match(/(\d+) insertions?\(\+\)/);
            const delMatch = line.match(/(\d+) deletions?\(-\)/);
            if (filesMatch) current.files = parseInt(filesMatch[1]);
            if (insMatch) current.insertions = parseInt(insMatch[1]);
            if (delMatch) current.deletions = parseInt(delMatch[1]);
          }
        }

        if (commits.length === 0) {
          return {
            content: [{ type: "text" as const, text: `## Commit Activity\n\nNo commits found in the last ${days} days.` }],
          };
        }

        // Daily counts
        const dailyCounts: Record<string, number> = {};
        const authorStats: Record<string, { commits: number; insertions: number; deletions: number }> = {};

        for (const c of commits) {
          dailyCounts[c.date] = (dailyCounts[c.date] ?? 0) + 1;
          if (!authorStats[c.author]) authorStats[c.author] = { commits: 0, insertions: 0, deletions: 0 };
          authorStats[c.author].commits++;
          authorStats[c.author].insertions += c.insertions;
          authorStats[c.author].deletions += c.deletions;
        }

        const totalInsertions = commits.reduce((s, c) => s + c.insertions, 0);
        const totalDeletions = commits.reduce((s, c) => s + c.deletions, 0);

        const mdLines: string[] = [
          `## 📊 Commit Activity (last ${days} days)`,
          "",
          `**Total commits**: ${commits.length}`,
          `**Lines added**: +${totalInsertions}`,
          `**Lines removed**: -${totalDeletions}`,
          `**Net change**: ${totalInsertions - totalDeletions > 0 ? "+" : ""}${totalInsertions - totalDeletions}`,
          "",
          "### Per Author",
          "",
          "| Author | Commits | +Lines | -Lines |",
          "|--------|---------|--------|--------|",
        ];

        const sortedAuthors = Object.entries(authorStats).sort(([, a], [, b]) => b.commits - a.commits);
        for (const [author, stats] of sortedAuthors) {
          mdLines.push(`| ${author} | ${stats.commits} | +${stats.insertions} | -${stats.deletions} |`);
        }

        mdLines.push("");
        mdLines.push("### Daily Activity");
        mdLines.push("");
        mdLines.push("| Date | Commits |");
        mdLines.push("|------|---------|");

        const sortedDays = Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b));
        for (const [date, count] of sortedDays) {
          const bar = "█".repeat(Math.min(count, 30));
          mdLines.push(`| ${date} | ${count} ${bar} |`);
        }

        mdLines.push("");
        mdLines.push("### Recent Commits");
        mdLines.push("");
        for (const c of commits.slice(0, 10)) {
          mdLines.push(`- \`${c.hash.substring(0, 7)}\` ${c.message} — *${c.author}* (${c.date})`);
        }

        return { content: [{ type: "text" as const, text: mdLines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_get_commit_activity");
      }
    }
  );

  // --- mal_get_sprint_report ---
  server.registerTool(
    "mal_get_sprint_report",
    {
      title: "Get Sprint Report",
      description: "Get sprint analytics with velocity, burndown data, completion percentage, and work item breakdown. Provides data suitable for chart rendering.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        sprint_id: z.string().describe("Sprint ID to generate report for"),
      },
    },
    async (args) => {
      try {
        const sprint = await db.get<Sprint>(COLLECTIONS.SPRINTS, args.sprint_id);
        if (!sprint) {
          return {
            content: [{ type: "text" as const, text: `Error: Sprint '${args.sprint_id}' not found. Try: Use mal_list_sprints to see available sprints.` }],
            isError: true,
          };
        }

        const workItems = await db.list<WorkItem>(COLLECTIONS.WORK_ITEMS, {
          filters: { sprint_id: args.sprint_id },
          limit: 200,
        });

        const items = workItems.items;
        const totalItems = items.length;
        const totalPoints = items.reduce((s, i) => s + (i.story_points ?? 0), 0);
        const doneItems = items.filter(i => i.status === "done");
        const donePoints = doneItems.reduce((s, i) => s + (i.story_points ?? 0), 0);
        const inProgressItems = items.filter(i => i.status === "in_progress");
        const blockedOrReview = items.filter(i => i.status === "review");

        // Status breakdown
        const statusBreakdown: Record<string, { count: number; points: number }> = {};
        for (const item of items) {
          if (!statusBreakdown[item.status]) statusBreakdown[item.status] = { count: 0, points: 0 };
          statusBreakdown[item.status].count++;
          statusBreakdown[item.status].points += item.story_points ?? 0;
        }

        // Type breakdown
        const typeBreakdown: Record<string, number> = {};
        for (const item of items) {
          typeBreakdown[item.type] = (typeBreakdown[item.type] ?? 0) + 1;
        }

        // Completion percentage
        const completionPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

        // Sprint duration
        const startDate = new Date(sprint.start_date);
        const endDate = new Date(sprint.end_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
        const today = new Date();
        const elapsedDays = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / 86400000));
        const remainingDays = Math.max(0, totalDays - elapsedDays);
        const timeElapsedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

        // Sprint health
        let health = "🟢 On Track";
        if (completionPct < timeElapsedPct - 20) health = "🟡 At Risk";
        if (completionPct < timeElapsedPct - 40) health = "🔴 Behind";

        // Get contributions during sprint
        const contributions = await db.list<Contribution>(COLLECTIONS.CONTRIBUTIONS, {
          limit: 100,
        });

        const mdLines: string[] = [
          `## 📈 Sprint Report: ${sprint.name}`,
          "",
          `**Status**: ${sprint.status} | **Health**: ${health}`,
          `**Goal**: ${sprint.goal ?? "(none set)"}`,
          `**Dates**: ${sprint.start_date} → ${sprint.end_date} (${totalDays} days)`,
          `**Progress**: Day ${elapsedDays} of ${totalDays} (${timeElapsedPct}% time elapsed, ${remainingDays} days remaining)`,
          "",
          "### Velocity",
          "",
          `| Metric | Value |`,
          `|--------|-------|`,
          `| Story points completed | **${donePoints}** / ${totalPoints} |`,
          `| Completion | **${completionPct}%** |`,
          `| Items done | ${doneItems.length} / ${totalItems} |`,
          `| In progress | ${inProgressItems.length} |`,
          `| In review | ${blockedOrReview.length} |`,
          `| Capacity | ${sprint.team_capacity ?? "not set"} |`,
          "",
          "### Status Breakdown",
          "",
          "| Status | Items | Points |",
          "|--------|-------|--------|",
        ];

        for (const [status, data] of Object.entries(statusBreakdown)) {
          mdLines.push(`| ${status} | ${data.count} | ${data.points} pts |`);
        }

        mdLines.push("");
        mdLines.push("### Type Breakdown");
        mdLines.push("");
        mdLines.push("| Type | Count |");
        mdLines.push("|------|-------|");
        for (const [type, count] of Object.entries(typeBreakdown)) {
          mdLines.push(`| ${type} | ${count} |`);
        }

        // Assignee breakdown
        const assigneeStats: Record<string, { done: number; total: number; points: number }> = {};
        for (const item of items) {
          const a = item.assignee ?? "(unassigned)";
          if (!assigneeStats[a]) assigneeStats[a] = { done: 0, total: 0, points: 0 };
          assigneeStats[a].total++;
          assigneeStats[a].points += item.story_points ?? 0;
          if (item.status === "done") assigneeStats[a].done++;
        }

        if (Object.keys(assigneeStats).length > 0) {
          mdLines.push("");
          mdLines.push("### By Assignee");
          mdLines.push("");
          mdLines.push("| Assignee | Done/Total | Points |");
          mdLines.push("|----------|-----------|--------|");
          for (const [assignee, stats] of Object.entries(assigneeStats)) {
            mdLines.push(`| ${assignee} | ${stats.done}/${stats.total} | ${stats.points} pts |`);
          }
        }

        return { content: [{ type: "text" as const, text: mdLines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_get_sprint_report");
      }
    }
  );
}
