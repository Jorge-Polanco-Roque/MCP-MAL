import { useParams, Link } from "react-router-dom";
import { User, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataCard } from "@/components/ui/data-card";
import { XpBar } from "@/components/gamification/XpBar";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { StreakIndicator } from "@/components/gamification/StreakIndicator";
import { useTeamMember, useAchievements } from "@/hooks/useData";
import { levelName, ROLE_COLORS } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const member = useTeamMember(userId || "");
  const achievements = useAchievements(userId);

  const memberData = typeof member.data?.data === "string" ? member.data.data : undefined;
  const achievementsData =
    typeof achievements.data?.data === "string" ? achievements.data.data : undefined;

  // Try to extract structured info from the markdown profile response
  const profile = memberData ? parseProfile(memberData) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Link to="/leaderboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <User className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">
            {profile?.name || userId || "Profile"}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            member.refetch();
            achievements.refetch();
          }}
          disabled={member.isFetching}
        >
          <RefreshCw
            className={cn("mr-1 h-4 w-4", member.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {profile ? (
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Profile header card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {/* Avatar placeholder */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mal-100 text-mal-600">
                    <LevelBadge level={profile.level} size="lg" />
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          ROLE_COLORS[profile.role] || "bg-gray-100 text-gray-600"
                        )}
                      >
                        {profile.role.replace("_", " ")}
                      </span>
                    </div>
                    {profile.email && (
                      <p className="mt-0.5 text-sm text-gray-500">{profile.email}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {levelName(profile.level)}
                      </span>
                      <StreakIndicator days={profile.streak} size="sm" />
                    </div>
                    <div className="mt-3">
                      <XpBar xp={profile.xp} size="md" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total XP" value={profile.xp.toLocaleString()} />
              <StatCard label="Level" value={`${profile.level}`} />
              <StatCard label="Streak" value={`${profile.streak}d`} />
              <StatCard
                label="Member since"
                value={
                  profile.joinedAt
                    ? new Date(profile.joinedAt).toLocaleDateString()
                    : "—"
                }
              />
            </div>

            {/* Full profile data (markdown) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Details</CardTitle>
              </CardHeader>
              <CardContent>
                <DataCard
                  title="Profile"
                  data={memberData}
                  isLoading={member.isLoading}
                  error={member.error}
                />
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <DataCard
                  title="Achievements"
                  data={achievementsData}
                  isLoading={achievements.isLoading}
                  error={achievements.error}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <DataCard
              title="Profile"
              data={memberData}
              isLoading={member.isLoading}
              error={member.error}
            />
            <DataCard
              title="Achievements"
              data={achievementsData}
              isLoading={achievements.isLoading}
              error={achievements.error}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

interface ProfileData {
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  streak: number;
  joinedAt: string;
}

/**
 * Best-effort parse of team member markdown response into structured data.
 * Looks for **key**: value patterns in the markdown.
 */
function parseProfile(md: string): ProfileData | null {
  const get = (key: string): string => {
    const regex = new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, "i");
    const match = md.match(regex);
    return match ? match[1].trim() : "";
  };

  const name = get("name");
  if (!name) return null;

  return {
    name,
    email: get("email"),
    role: get("role") || "developer",
    xp: parseInt(get("xp"), 10) || 0,
    level: parseInt(get("level"), 10) || 1,
    streak: parseInt(get("streak_days"), 10) || 0,
    joinedAt: get("created_at"),
  };
}
