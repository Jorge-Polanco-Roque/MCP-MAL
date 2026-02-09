import { z } from "zod";
import { execFileSync } from "child_process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { buildQueryOptions } from "../utils/pagination.js";
import { handleToolError } from "../utils/error-handler.js";
import { calculateLevel } from "../utils/levels.js";
import type { WorkItem, Sprint, Contribution, TeamMember } from "../types.js";

/** Points per commit: base 10 + 1 per 100 lines changed (capped at 50). */
function commitPoints(insertions: number, deletions: number): number {
  const linesChanged = insertions + deletions;
  return 10 + Math.min(40, Math.floor(linesChanged / 100));
}

/**
 * Match a git author (name + email) to an existing team member.
 * Priority: email match → name prefix match (case-insensitive).
 */
function matchTeamMember(
  gitAuthor: string,
  gitEmail: string,
  members: TeamMember[],
): TeamMember | undefined {
  // 1. Exact email match
  const byEmail = members.find(
    (m) => m.email && m.email.toLowerCase() === gitEmail.toLowerCase(),
  );
  if (byEmail) return byEmail;

  // 2. Name prefix match: git "Jorge Polanco" matches member "Jorge"
  const authorLower = gitAuthor.toLowerCase();
  const byName = members.find(
    (m) =>
      authorLower === m.name.toLowerCase() ||
      authorLower.startsWith(m.name.toLowerCase() + " "),
  );
  if (byName) return byName;

  return undefined;
}

export function registerAnalyticsTools(server: McpServer, db: IDatabase): void {

  // --- mal_get_commit_activity ---
  server.registerTool(
    "mal_get_commit_activity",
    {
      title: "Get Commit Activity",
      description: "Get git commit activity data for visualization. Parses the local git log to extract daily commit counts, per-author stats, and file change metrics. Auto-syncs: matches git authors to team members by email/name, logs contributions per commit (dedup by hash), and updates XP/level/streak on the leaderboard.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        repo_path: z.string().optional().describe("Path to git repository (default: current working directory)"),
        days: z.number().optional().describe("Number of days to look back (default: 30)"),
        author: z.string().optional().describe("Filter by author name or email"),
        project_id: z.string().optional().describe("Project ID to associate contributions with (for per-project leaderboards)"),
      },
    },
    async (args) => {
      try {
        const repoPath = args.repo_path ?? process.env.GIT_REPO_PATH ?? ".";
        const days = args.days ?? 30;
        const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

        // Use execFileSync with argument array to prevent command injection
        const gitArgs = ["-C", repoPath, "log", `--since=${since}`, "--format=%H|%an|%ae|%aI|%s", "--shortstat"];
        if (args.author) {
          gitArgs.push(`--author=${args.author}`);
        }

        let gitOutput: string;
        try {
          gitOutput = execFileSync("git", gitArgs, { encoding: "utf-8", timeout: 15000 });
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

        // ── Auto-sync: match git authors to team members ──
        const allMembers = await db.list<TeamMember>(COLLECTIONS.TEAM_MEMBERS, { limit: 200 });
        const members = allMembers.items;

        // Build a map: git author name → resolved display name
        const authorDisplayName: Record<string, string> = {};
        // Build a map: git author name → team member (if matched)
        const authorMember: Record<string, TeamMember | undefined> = {};

        const seenAuthors = new Set<string>();
        for (const c of commits) {
          if (!seenAuthors.has(c.author)) {
            seenAuthors.add(c.author);
            const matched = matchTeamMember(c.author, c.email, members);
            authorMember[c.author] = matched;
            authorDisplayName[c.author] = matched ? matched.name : c.author;
          }
        }

        // Auto-log contributions for new commits (dedup by commit hash)
        const existingContribs = await db.list<Contribution>(COLLECTIONS.CONTRIBUTIONS, {
          filters: { type: "commit" },
          order_by: "created_at",
          limit: 1000,
        });
        const loggedHashes = new Set(
          existingContribs.items
            .filter((c) => c.reference_id)
            .map((c) => c.reference_id),
        );

        // Track XP awarded per member in this sync
        const xpAwarded: Record<string, number> = {};

        for (const c of commits) {
          if (loggedHashes.has(c.hash)) continue; // already logged
          const member = authorMember[c.author];
          if (!member) continue; // no matching team member

          const pts = commitPoints(c.insertions, c.deletions);
          const contribData: Record<string, unknown> = {
            user_id: member.id,
            type: "commit",
            reference_id: c.hash,
            points: pts,
            description: c.message,
            metadata: {
              insertions: c.insertions,
              deletions: c.deletions,
              files: c.files,
              date: c.date,
            },
          };
          if (args.project_id) contribData.project_id = args.project_id;
          await db.create(COLLECTIONS.CONTRIBUTIONS, "", contribData);
          xpAwarded[member.id] = (xpAwarded[member.id] ?? 0) + pts;
        }

        // Batch-update XP, level, and streak for affected members
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const syncNotes: string[] = [];

        for (const [memberId, awarded] of Object.entries(xpAwarded)) {
          const member = members.find((m) => m.id === memberId);
          if (!member) continue;

          const newXp = member.xp + awarded;
          const newLevel = calculateLevel(newXp);
          let newStreak = member.streak_days;
          if (member.streak_last_date === today) {
            // already counted today
          } else if (member.streak_last_date === yesterday) {
            newStreak = member.streak_days + 1;
          } else {
            newStreak = 1;
          }

          await db.update<TeamMember>(COLLECTIONS.TEAM_MEMBERS, memberId, {
            xp: newXp,
            level: newLevel,
            streak_days: newStreak,
            streak_last_date: today,
          } as Partial<TeamMember>);

          // Update in-memory so subsequent reads are fresh
          member.xp = newXp;
          member.level = newLevel;
          member.streak_days = newStreak;

          syncNotes.push(
            `Synced ${member.name}: +${awarded} XP (${newXp} total, Lv.${newLevel})`,
          );
        }

        // ── Build markdown output using resolved display names ──
        const dailyCounts: Record<string, number> = {};
        const authorStats: Record<string, { commits: number; insertions: number; deletions: number }> = {};

        for (const c of commits) {
          const displayName = authorDisplayName[c.author];
          dailyCounts[c.date] = (dailyCounts[c.date] ?? 0) + 1;
          if (!authorStats[displayName]) authorStats[displayName] = { commits: 0, insertions: 0, deletions: 0 };
          authorStats[displayName].commits++;
          authorStats[displayName].insertions += c.insertions;
          authorStats[displayName].deletions += c.deletions;
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
          const displayName = authorDisplayName[c.author];
          mdLines.push(`- \`${c.hash.substring(0, 7)}\` ${c.message} — *${displayName}* (${c.date})`);
        }

        if (syncNotes.length > 0) {
          mdLines.push("");
          mdLines.push("### 🔄 Auto-Sync");
          mdLines.push("");
          for (const note of syncNotes) {
            mdLines.push(`- ${note}`);
          }
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
          order_by: "created_at",
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

  // --- mal_run_retrospective ---
  server.registerTool(
    "mal_run_retrospective",
    {
      title: "Run Sprint Retrospective",
      description: "Generate sprint retrospective data: what went well, what didn't, action items. Gathers completed vs missed items, velocity, team contributions, and blockers. The LLM narrates the retrospective from this structured data.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        sprint_id: z.string().describe("Sprint ID to generate retrospective for"),
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
        const doneItems = items.filter(i => i.status === "done");
        const cancelledItems = items.filter(i => i.status === "cancelled");
        const incompleteItems = items.filter(i => i.status !== "done" && i.status !== "cancelled");

        const totalPoints = items.reduce((s, i) => s + (i.story_points ?? 0), 0);
        const donePoints = doneItems.reduce((s, i) => s + (i.story_points ?? 0), 0);
        // Completion rate
        const completionPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

        // Team contribution breakdown
        const memberStats: Record<string, { done: number; incomplete: number; points: number }> = {};
        for (const item of items) {
          const a = item.assignee ?? "(unassigned)";
          if (!memberStats[a]) memberStats[a] = { done: 0, incomplete: 0, points: 0 };
          if (item.status === "done") {
            memberStats[a].done++;
            memberStats[a].points += item.story_points ?? 0;
          } else if (item.status !== "cancelled") {
            memberStats[a].incomplete++;
          }
        }

        // Type distribution of completed vs not
        const typeCompleted: Record<string, number> = {};
        const typeIncomplete: Record<string, number> = {};
        for (const item of doneItems) {
          typeCompleted[item.type] = (typeCompleted[item.type] ?? 0) + 1;
        }
        for (const item of incompleteItems) {
          typeIncomplete[item.type] = (typeIncomplete[item.type] ?? 0) + 1;
        }

        // Bugs completed vs carried over
        const bugsCompleted = doneItems.filter(i => i.type === "bug").length;
        const bugsOpen = incompleteItems.filter(i => i.type === "bug").length;

        // Sprint duration
        const startDate = new Date(sprint.start_date);
        const endDate = new Date(sprint.end_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);

        const mdLines: string[] = [
          `## Sprint Retrospective: ${sprint.name}`,
          "",
          `**Goal**: ${sprint.goal ?? "(none set)"}`,
          `**Dates**: ${sprint.start_date} → ${sprint.end_date} (${totalDays} days)`,
          `**Status**: ${sprint.status}`,
          "",
          "### Summary Metrics",
          "",
          "| Metric | Value |",
          "|--------|-------|",
          `| Velocity (points completed) | **${donePoints}** / ${totalPoints} planned |`,
          `| Completion rate | **${completionPct}%** |`,
          `| Items completed | ${doneItems.length} / ${items.length} |`,
          `| Items carried over | ${incompleteItems.length} |`,
          `| Items cancelled | ${cancelledItems.length} |`,
          `| Bugs fixed | ${bugsCompleted} |`,
          `| Bugs carried over | ${bugsOpen} |`,
          `| Capacity | ${sprint.team_capacity ?? "not set"} |`,
        ];

        // What went well: items completed
        mdLines.push("");
        mdLines.push("### Completed Items");
        mdLines.push("");
        if (doneItems.length === 0) {
          mdLines.push("*No items completed.*");
        } else {
          for (const item of doneItems) {
            const pts = item.story_points ? ` [${item.story_points}pts]` : "";
            const who = item.assignee ? ` — ${item.assignee}` : "";
            mdLines.push(`- **${item.id}** [${item.type}] ${item.title}${pts}${who}`);
          }
        }

        // What didn't go well: incomplete items
        mdLines.push("");
        mdLines.push("### Incomplete / Carried Over");
        mdLines.push("");
        if (incompleteItems.length === 0) {
          mdLines.push("*All items completed!*");
        } else {
          for (const item of incompleteItems) {
            const pts = item.story_points ? ` [${item.story_points}pts]` : "";
            const who = item.assignee ? ` — ${item.assignee}` : "";
            mdLines.push(`- **${item.id}** [${item.type}/${item.status}] ${item.title}${pts}${who}`);
          }
        }

        // Team contribution
        if (Object.keys(memberStats).length > 0) {
          mdLines.push("");
          mdLines.push("### Team Contributions");
          mdLines.push("");
          mdLines.push("| Member | Done | Incomplete | Points |");
          mdLines.push("|--------|------|-----------|--------|");
          for (const [member, stats] of Object.entries(memberStats)) {
            mdLines.push(`| ${member} | ${stats.done} | ${stats.incomplete} | ${stats.points} |`);
          }
        }

        // Type breakdown
        mdLines.push("");
        mdLines.push("### Type Distribution");
        mdLines.push("");
        mdLines.push("| Type | Done | Incomplete |");
        mdLines.push("|------|------|-----------|");
        const allTypes = new Set([...Object.keys(typeCompleted), ...Object.keys(typeIncomplete)]);
        for (const t of allTypes) {
          mdLines.push(`| ${t} | ${typeCompleted[t] ?? 0} | ${typeIncomplete[t] ?? 0} |`);
        }

        return { content: [{ type: "text" as const, text: mdLines.join("\n") }] };
      } catch (error) {
        return handleToolError(error, "mal_run_retrospective");
      }
    }
  );
}
