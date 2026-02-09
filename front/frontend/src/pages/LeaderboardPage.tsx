import { useState } from "react";
import { Trophy, RefreshCw, GitBranch, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/ui/data-card";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { StreakIndicator } from "@/components/gamification/StreakIndicator";
import { useLeaderboard } from "@/hooks/useData";
import { useProjectContext } from "@/hooks/useProjectContext";
import { fetchCommitActivity } from "@/lib/api";
import { rankMedal, ROLE_COLORS } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function LeaderboardPage() {
  const { activeProjectId, activeProject } = useProjectContext();
  const { data, isLoading, error, refetch, isFetching } = useLeaderboard(
    20,
    activeProjectId ?? undefined
  );
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  const content = typeof data?.data === "string" ? data.data : undefined;

  // Try to parse leaderboard entries from markdown table
  const entries = content ? parseLeaderboard(content) : [];

  const title = activeProject
    ? `Project Rankings — ${activeProject.name}`
    : "Team Rankings";

  // Determine repo URL from active project metadata (no hardcoded fallback)
  const repoUrl = activeProject?.metadata?.repo_url as string | undefined;

  const handleSync = async () => {
    if (!repoUrl) {
      toast.error("No repo URL configured for this project");
      return;
    }
    setSyncing(true);
    try {
      await fetchCommitActivity(90, repoUrl, activeProjectId ?? undefined);
      toast.success("Commits synced — leaderboard updated");
      refetch();
    } catch (err) {
      toast.error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold dark:text-gray-100">Leaderboard</h2>
          {activeProject && (
            <span className="rounded-full bg-mal-100 px-2 py-0.5 text-xs font-medium text-mal-700 dark:bg-mal-900/30 dark:text-mal-400">
              {activeProject.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing || isFetching || !repoUrl}>
            <GitBranch className={cn("mr-1 h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Commits"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-1 h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Repo info bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          <GitBranch className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          {repoUrl ? (
            <>
              <span className="font-medium">Source:</span>
              <a
                href={repoUrl.split("/tree/")[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-mal-600 hover:underline dark:text-mal-400"
              >
                {repoUrl.split("/tree/")[0].replace("https://github.com/", "")}
                <ExternalLink className="ml-1 inline h-3 w-3" />
              </a>
              {repoUrl.includes("/tree/") && (
                <>
                  <span className="text-gray-400 dark:text-gray-500">|</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Branch: <strong>{repoUrl.split("/tree/")[1]}</strong>
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              No repository configured. Set a <strong>repo_url</strong> in project metadata to enable commit sync.
            </span>
          )}
        </div>

        {entries.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                    <th className="px-3 py-3 w-12 sm:px-4">Rank</th>
                    <th className="px-3 py-3 sm:px-4">Member</th>
                    <th className="px-3 py-3 text-center sm:px-4">Level</th>
                    <th className="px-3 py-3 text-right sm:px-4">XP</th>
                    <th className="hidden px-4 py-3 text-center sm:table-cell">Streak</th>
                    <th className="hidden px-4 py-3 md:table-cell">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const rank = i + 1;
                    const roleColor = ROLE_COLORS[entry.role] || "bg-gray-100 text-gray-600";
                    return (
                      <tr
                        key={entry.name}
                        className="border-b transition-colors hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-700/40"
                        onClick={() => {
                          if (entry.id) navigate(`/profile/${entry.id}`);
                        }}
                      >
                        <td className="px-3 py-3 text-center text-lg sm:px-4">
                          {rankMedal(rank)}
                        </td>
                        <td className="px-3 py-3 sm:px-4">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{entry.name}</span>
                        </td>
                        <td className="px-3 py-3 text-center sm:px-4">
                          <LevelBadge level={entry.level} size="sm" />
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm dark:text-gray-200 sm:px-4">
                          {entry.xp.toLocaleString()}
                        </td>
                        <td className="hidden px-4 py-3 text-center sm:table-cell">
                          <StreakIndicator days={entry.streak} size="sm" />
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              roleColor
                            )}
                          >
                            {entry.role.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <DataCard
            title={title}
            data={content}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  role: string;
}

/**
 * Best-effort parse of the leaderboard markdown table into structured entries.
 */
function parseLeaderboard(md: string): LeaderboardEntry[] {
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());

  const nameIdx = headers.findIndex((h) => h.includes("member") || h.includes("name"));
  const levelIdx = headers.findIndex((h) => h.includes("level"));
  const xpIdx = headers.findIndex((h) => h.includes("xp"));
  const streakIdx = headers.findIndex((h) => h.includes("streak"));
  const roleIdx = headers.findIndex((h) => h.includes("role"));

  if (nameIdx === -1) return [];

  const entries: LeaderboardEntry[] = [];
  for (const line of lines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    const rawName = cells[nameIdx] || "";
    // Strip markdown bold **name**
    const name = rawName.replace(/\*\*/g, "").trim();
    const id = name.toLowerCase().replace(/\s+/g, "-");

    const rawLevel = cells[levelIdx] || "1";
    // Extract number from "Lv.8" format
    const level = parseInt(rawLevel.replace(/[^\d]/g, ""), 10) || 1;

    const xp = parseInt((cells[xpIdx] || "0").replace(/[^\d]/g, ""), 10) || 0;

    const rawStreak = cells[streakIdx] || "";
    const streakMatch = rawStreak.match(/(\d+)/);
    const streak = streakMatch ? parseInt(streakMatch[1], 10) : 0;

    const role = (cells[roleIdx] || "developer").trim();

    if (name) {
      entries.push({ id, name, level, xp, streak, role });
    }
  }
  return entries;
}
