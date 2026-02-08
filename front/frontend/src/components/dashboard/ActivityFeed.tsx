import { Activity, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActivityFeed } from "@/hooks/useData";
import { cn } from "@/lib/utils";

export function ActivityFeed() {
  const { data, isLoading, isFetching, refetch } = useActivityFeed(15);

  const interactions = typeof data?.interactions === "string" ? data.interactions : undefined;
  const topContributors =
    typeof data?.top_contributors === "string" ? data.top_contributors : undefined;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-mal-600" />
            Activity Feed
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 w-7"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {topContributors && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                    Top Contributors
                  </h4>
                  <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-table:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {topContributors}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {interactions && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                    Recent Interactions
                  </h4>
                  <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-table:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {interactions}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {!topContributors && !interactions && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No recent activity
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
