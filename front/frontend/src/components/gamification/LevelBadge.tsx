import { cn } from "@/lib/utils";
import { levelName } from "@/lib/gamification";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  const bgColor =
    level >= 20
      ? "bg-purple-600 text-white"
      : level >= 15
        ? "bg-yellow-500 text-white"
        : level >= 10
          ? "bg-mal-600 text-white"
          : level >= 5
            ? "bg-green-600 text-white"
            : "bg-gray-500 text-white";

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        bgColor,
        className
      )}
      title={`Level ${level} — ${levelName(level)}`}
    >
      {level}
    </div>
  );
}
