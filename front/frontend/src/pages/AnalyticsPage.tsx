import { useState } from "react";
import { BarChart3, RefreshCw, Trophy, GitCommit, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/ui/data-card";
import { useCommitActivity, useLeaderboard, useSprints } from "@/hooks/useData";
import { useProjectContext } from "@/hooks/useProjectContext";
import { TeamPulse } from "@/components/intelligence/TeamPulse";
import { cn } from "@/lib/utils";

export function AnalyticsPage() {
  const [commitDays, setCommitDays] = useState(30);
  const { activeProject } = useProjectContext();
  const commits = useCommitActivity(commitDays);
  const leaderboard = useLeaderboard();
  const sprints = useSprints(undefined, activeProject?.id);

  const commitData = typeof commits.data?.data === "string" ? commits.data.data : undefined;
  const leaderboardData =
    typeof leaderboard.data?.data === "string" ? leaderboard.data.data : undefined;
  const sprintData = typeof sprints.data?.data === "string" ? sprints.data.data : undefined;

  // Try to parse commit data for chart visualization
  const chartData = parseCommitChart(commitData);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">
            Analytics
            {activeProject && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {activeProject.name}
              </span>
            )}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            commits.refetch();
            leaderboard.refetch();
            sprints.refetch();
          }}
          disabled={commits.isFetching || leaderboard.isFetching}
        >
          <RefreshCw
            className={cn(
              "mr-1 h-4 w-4",
              (commits.isFetching || leaderboard.isFetching) && "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Team Pulse */}
        <div className="mb-6">
          <TeamPulse />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Commit Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCommit className="h-4 w-4 text-mal-600" />
                  Commit Activity
                </CardTitle>
                <select
                  value={commitDays}
                  onChange={(e) => setCommitDays(Number(e.target.value))}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="commits" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DataCard
                  title="Commit Activity"
                  data={commitData}
                  isLoading={commits.isLoading}
                  error={commits.error}
                />
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataCard
                title="Leaderboard"
                data={leaderboardData}
                isLoading={leaderboard.isLoading}
                error={leaderboard.error}
              />
            </CardContent>
          </Card>

          {/* Sprint Overview */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Sprint Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataCard
                title="Sprints"
                data={sprintData}
                isLoading={sprints.isLoading}
                error={sprints.error}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Best-effort parse of MCP commit activity response into chart data.
 * Expects markdown table with date/commits columns.
 */
function parseCommitChart(md?: string): { date: string; commits: number }[] {
  if (!md) return [];
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  // Find date and commits column indices
  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes("date"));
  const commitsIdx = headers.findIndex((h) => h.includes("commit"));

  if (dateIdx === -1 || commitsIdx === -1) return [];

  const data: { date: string; commits: number }[] = [];
  for (const line of lines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length > Math.max(dateIdx, commitsIdx)) {
      const num = parseInt(cells[commitsIdx], 10);
      if (!isNaN(num)) {
        data.push({ date: cells[dateIdx], commits: num });
      }
    }
  }
  return data;
}
