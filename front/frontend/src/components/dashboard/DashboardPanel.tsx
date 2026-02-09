import { LayoutDashboard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusCard } from "./StatusCard";
import { StatsSection } from "./StatsSection";
import { CatalogList } from "./CatalogList";
import { ActivityFeed } from "./ActivityFeed";

export function DashboardPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3 dark:border-gray-700">
        <LayoutDashboard className="h-5 w-5 text-mal-600 dark:text-mal-400" />
        <h2 className="font-semibold">Dashboard</h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        <div className="space-y-4">
          <StatusCard />
          <ActivityFeed />
          <StatsSection />

          <Tabs defaultValue="skills">
            <TabsList className="w-full">
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="subagents">Subagents</TabsTrigger>
              <TabsTrigger value="mcps">MCPs</TabsTrigger>
            </TabsList>
            <TabsContent value="skills" className="mt-3">
              <CatalogList collection="skills" />
            </TabsContent>
            <TabsContent value="commands" className="mt-3">
              <CatalogList collection="commands" />
            </TabsContent>
            <TabsContent value="subagents" className="mt-3">
              <CatalogList collection="subagents" />
            </TabsContent>
            <TabsContent value="mcps" className="mt-3">
              <CatalogList collection="mcps" />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
