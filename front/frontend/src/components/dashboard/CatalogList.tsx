import { useState } from "react";
import { Search, FileCode, Terminal, Bot, Server } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCatalog } from "@/hooks/useCatalog";
import type { Collection } from "@/lib/types";

interface CatalogListProps {
  collection: Collection;
  onSelect?: (id: string) => void;
}

const icons: Record<Collection, typeof FileCode> = {
  skills: FileCode,
  commands: Terminal,
  subagents: Bot,
  mcps: Server,
};

export function CatalogList({ collection, onSelect: _onSelect }: CatalogListProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useCatalog(collection);
  const Icon = icons[collection];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${collection}...`}
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-mal-500 focus:outline-none focus:ring-1 focus:ring-mal-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-md border p-3">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-full rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">Failed to load {collection}</p>
        ) : data?.data ? (
          <div className="space-y-2">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto rounded-md border bg-gray-50 p-3">
              {typeof data.data === "string" ? data.data : JSON.stringify(data.data, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <Icon className="mb-2 h-8 w-8" />
            <p className="text-sm">No {collection} found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
