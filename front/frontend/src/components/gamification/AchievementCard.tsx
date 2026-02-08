import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { tierStyle, CATEGORY_COLORS } from "@/lib/gamification";

interface AchievementCardProps {
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  className?: string;
}

export function AchievementCard({
  name,
  description,
  icon,
  tier,
  category,
  xpReward,
  unlocked,
  unlockedAt,
  className,
}: AchievementCardProps) {
  const ts = tierStyle(tier);
  const catColor = CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600";

  return (
    <div
      className={cn(
        "relative rounded-lg border p-3 transition-all",
        unlocked ? "bg-white shadow-sm" : "bg-gray-50 opacity-70",
        className
      )}
    >
      {/* Lock overlay for locked achievements */}
      {!unlocked && (
        <div className="absolute right-2 top-2">
          <Lock className="h-3.5 w-3.5 text-gray-400" />
        </div>
      )}

      {/* Icon + tier */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className={cn("text-sm font-semibold", unlocked ? "text-gray-900" : "text-gray-500")}>
            {name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                ts.bg,
                ts.text
              )}
            >
              {ts.icon} {ts.label}
            </span>
            <span
              className={cn(
                "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                catColor
              )}
            >
              {category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mb-2 text-xs text-gray-500">{description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium text-mal-600">+{xpReward} XP</span>
        {unlocked && unlockedAt && (
          <span className="text-gray-400">
            {new Date(unlockedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
