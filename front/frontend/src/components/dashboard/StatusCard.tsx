import { Activity, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useHealth } from "@/hooks/useCatalog";

export function StatusCard() {
  const { data, isLoading, error } = useHealth();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-3 w-32 rounded bg-gray-200" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-sm">Server Offline</p>
            <p className="text-xs text-gray-500">Could not connect to backend</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusIcon =
    data.mcp_status === "online" ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : data.mcp_status === "degraded" ? (
      <AlertCircle className="h-5 w-5 text-yellow-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <p className="font-medium text-sm">
              MCP Server{" "}
              <span
                className={
                  data.mcp_status === "online"
                    ? "text-green-600"
                    : data.mcp_status === "degraded"
                      ? "text-yellow-600"
                      : "text-red-600"
                }
              >
                {data.mcp_status}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              Agent: {data.agent_status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Activity className="h-3 w-3" />
          <span>{data.tools_count} tools available</span>
        </div>
      </CardContent>
    </Card>
  );
}
