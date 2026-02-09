import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStats } from "@/hooks/useCatalog";

export function StatsSection() {
  const { data, isLoading } = useStats();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-mal-500" />
          Usage Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ) : data?.data ? (
          <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
            {typeof data.data === "string" ? data.data : JSON.stringify(data.data, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-gray-400">No stats available</p>
        )}
      </CardContent>
    </Card>
  );
}
