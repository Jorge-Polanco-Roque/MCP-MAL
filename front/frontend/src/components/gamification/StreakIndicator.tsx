import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakIndicatorProps {
  days: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StreakIndicator({ days, className, size = "md" }: StreakIndicatorProps) {
  if (days <= 0) {
    return (
      <span className={cn("text-xs text-gray-400", className)}>No streak</span>
    );
  }

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };
  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const intensity =
    days >= 14
      ? "text-red-600"
      : days >= 7
        ? "text-orange-500"
        : "text-yellow-500";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        sizeClasses[size],
        intensity,
        className
      )}
      title={`${days}-day contribution streak`}
    >
      <Flame className={iconSize[size]} />
      {days}d
    </span>
  );
}
