import { cn } from "@/lib/utils";
import {
  calculateLevel,
  levelProgress,
  levelName,
  xpForNextLevel,
} from "@/lib/gamification";

interface XpBarProps {
  xp: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function XpBar({ xp, className, showLabel = true, size = "md" }: XpBarProps) {
  const level = calculateLevel(xp);
  const progress = levelProgress(xp);
  const nextThreshold = xpForNextLevel(level);
  const name = levelName(level);

  const barHeight = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700">
            Lv.{level} {name}
          </span>
          <span className="text-gray-500">
            {xp.toLocaleString()} / {nextThreshold.toLocaleString()} XP
          </span>
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-gray-200", barHeight)}>
        <div
          className={cn("rounded-full bg-mal-600 transition-all duration-500", barHeight)}
          style={{ width: `${Math.max(2, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
