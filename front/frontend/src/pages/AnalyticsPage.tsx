import { useState } from "react";
import { BarChart3, RefreshCw, Trophy, GitCommit, TrendingUp, Users } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/ui/data-card";
import { useCommitActivity, useLeaderboard, useSprints } from "@/hooks/useData";
import { useProjectContext } from "@/hooks/useProjectContext";
import { TeamPulse } from "@/components/intelligence/TeamPulse";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#6b7280"];

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

  // Parse commit data for charts
  const chartData = parseCommitChart(commitData);
  const authorData = parseAuthorChart(commitData);
  const sprintStatusData = parseSprintStatus(sprintData);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-mal-600 dark:text-mal-400" />
          <h2 className="text-lg font-semibold">
            Analytics
            {activeProject && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
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
          {/* Commit Activity — Area Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCommit className="h-4 w-4 text-mal-600 dark:text-mal-400" />
                  Commit Activity
                </CardTitle>
                <select
                  value={commitDays}
                  onChange={(e) => setCommitDays(Number(e.target.value))}
                  className="rounded-md border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--tooltip-bg, #fff)",
                        border: "1px solid var(--tooltip-border, #e5e7eb)",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="commits"
                      stroke="#3b82f6"
                      fill="url(#commitGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
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

          {/* Team Contributions — Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Team Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={authorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--tooltip-bg, #fff)",
                        border: "1px solid var(--tooltip-border, #e5e7eb)",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="commits" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DataCard
                  title="Leaderboard"
                  data={leaderboardData}
                  isLoading={leaderboard.isLoading}
                  error={leaderboard.error}
                />
              )}
            </CardContent>
          </Card>

          {/* Sprint Status — Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                Sprint Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sprintStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={sprintStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                      label={({ name, value }: PieLabelRenderProps) => `${name ?? ""} (${value ?? 0})`}
                    >
                      {sprintStatusData.map((_entry, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <DataCard
                  title="Sprints"
                  data={sprintData}
                  isLoading={sprints.isLoading}
                  error={sprints.error}
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
        </div>
      </div>
    </div>
  );
}

/**
 * Parse MCP commit activity markdown table into chart data.
 * Expects rows with date and commits columns.
 */
function parseCommitChart(md?: string): { date: string; commits: number }[] {
  if (!md) return [];
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

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

/**
 * Parse author/contributor data from markdown into horizontal bar chart data.
 * Looks for tables with author/name and commits columns.
 */
function parseAuthorChart(md?: string): { name: string; commits: number }[] {
  if (!md) return [];
  // Find author summary section — look for a table with "author" or "name" column
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("author") || h.includes("name") || h.includes("member"));
  const commitsIdx = headers.findIndex((h) => h.includes("commit") || h.includes("count"));

  if (nameIdx === -1 || commitsIdx === -1) return [];

  const data: { name: string; commits: number }[] = [];
  for (const line of lines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length > Math.max(nameIdx, commitsIdx)) {
      const num = parseInt(cells[commitsIdx], 10);
      if (!isNaN(num) && cells[nameIdx]) {
        data.push({ name: cells[nameIdx], commits: num });
      }
    }
  }
  return data.slice(0, 10); // Top 10
}

/**
 * Parse sprint status distribution from markdown.
 * Counts sprints per status from a table with status column.
 */
function parseSprintStatus(md?: string): { status: string; count: number }[] {
  if (!md) return [];
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());
  const statusIdx = headers.findIndex((h) => h.includes("status"));

  if (statusIdx === -1) return [];

  const counts: Record<string, number> = {};
  for (const line of lines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length > statusIdx && cells[statusIdx]) {
      const status = cells[statusIdx].toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}
