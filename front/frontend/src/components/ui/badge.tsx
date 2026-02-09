import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-mal-100 text-mal-800 dark:bg-mal-900/30 dark:text-mal-300": variant === "default",
          "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300": variant === "secondary",
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400": variant === "success",
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400": variant === "warning",
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  );
}
