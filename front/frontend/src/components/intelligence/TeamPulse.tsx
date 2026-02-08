import { Activity, GitCommit, MessageSquare, CheckSquare, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useCommitActivity, useInteractions, useWorkItems, useLeaderboard } from "@/hooks/useData";

/**
 * Team Pulse: quick digest of recent team activity.
 * Shows commit count, interaction count, completed items, and active streaks.
 */
export function TeamPulse() {
  const commits = useCommitActivity(7);
  const interactions = useInteractions();
  const completedItems = useWorkItems({ status: "done" });
  const leaderboard = useLeaderboard(10);

  // Extract stats from markdown responses (best-effort)
  const commitCount = extractNumber(commits.data?.data, /total[^]*?(\d+)/i) ?? "—";
  const interactionCount = extractCount(interactions.data?.data);
  const completedCount = extractCount(completedItems.data?.data);
  const streakCount = countStreaks(leaderboard.data?.data);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-mal-600" />
          Team Pulse
          <span className="text-xs font-normal text-gray-400">Last 7 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PulseMetric
            icon={<GitCommit className="h-4 w-4 text-blue-500" />}
            value={commitCount}
            label="Commits"
            loading={commits.isLoading}
          />
          <PulseMetric
            icon={<MessageSquare className="h-4 w-4 text-green-500" />}
            value={interactionCount}
            label="Interactions"
            loading={interactions.isLoading}
          />
          <PulseMetric
            icon={<CheckSquare className="h-4 w-4 text-purple-500" />}
            value={completedCount}
            label="Items Done"
            loading={completedItems.isLoading}
          />
          <PulseMetric
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            value={streakCount}
            label="Active Streaks"
            loading={leaderboard.isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PulseMetric({
  icon,
  value,
  label,
  loading,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2.5">
      {icon}
      <div>
        {loading ? (
          <div className="h-5 w-8 animate-pulse rounded bg-gray-200" />
        ) : (
          <p className="text-sm font-bold text-gray-900">{value}</p>
        )}
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Parsing helpers ───

function extractNumber(data: string | undefined, regex: RegExp): number | null {
  if (!data) return null;
  const match = data.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

function extractCount(data: string | undefined): string {
  if (!data) return "—";
  // Look for "N total" or "Showing N" patterns
  const match = data.match(/(\d+)\s*total/i) || data.match(/showing\s*(\d+)/i);
  return match ? match[1] : "—";
}

function countStreaks(data: string | undefined): string {
  if (!data) return "—";
  // Count fire emojis as a proxy for active streaks
  const fires = (data.match(/\ud83d\udd25/g) || []).length;
  return fires > 0 ? String(fires) : "0";
}
