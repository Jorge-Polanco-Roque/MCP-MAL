import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  data: string | undefined;
  isLoading: boolean;
  error: unknown;
  className?: string;
}

/**
 * Renders MCP tool response data as formatted markdown.
 * Used across pages to display tool call results.
 */
export function DataCard({ title, data, isLoading, error, className }: DataCardProps) {
  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-white p-4 dark:border-gray-600/30 dark:bg-gray-800/80", className)}>
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-700/60" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-700/60" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100 dark:bg-gray-700/60" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20", className)}>
        <p className="text-sm text-red-600">Failed to load {title.toLowerCase()}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("rounded-lg border bg-white p-4 text-center text-gray-400 dark:border-gray-600/30 dark:bg-gray-800/80 dark:text-gray-500", className)}>
        <p className="text-sm">No {title.toLowerCase()} data available</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-white dark:border-gray-600/30 dark:bg-gray-800/80", className)}>
      <div className="overflow-x-auto">
        <div className="prose prose-sm max-w-none p-4 dark:prose-invert prose-table:w-full prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:text-gray-600 prose-td:px-3 prose-td:py-2 prose-td:text-sm prose-td:border-b dark:prose-th:bg-gray-700/40 dark:prose-th:text-gray-300 dark:prose-td:border-gray-700 dark:prose-td:text-gray-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
