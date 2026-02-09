import { useState } from "react";
import { Search, FileCode, Terminal, Bot, Server, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCatalog } from "@/hooks/useCatalog";
import type { Collection } from "@/lib/types";
import { cn } from "@/lib/utils";

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

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  [key: string]: string;
}

function parseCatalogTable(md: string): CatalogItem[] {
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());

  const items: CatalogItem[] = [];
  for (const line of lines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    if (cells.length !== headers.length) continue;

    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] || "").replace(/\*\*/g, "").trim();
    });

    // Try common column names for id, name, description
    const id = obj["id"] || obj["name"] || "";
    const name = obj["name"] || obj["id"] || "";
    const description = obj["description"] || obj["what this tool does"] || obj["desc"] || "";

    if (!name) continue;

    items.push({
      id,
      name,
      description,
      ...obj,
    });
  }
  return items;
}

export function CatalogList({ collection, onSelect }: CatalogListProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useCatalog(collection);
  const Icon = icons[collection];

  const rawContent =
    typeof data?.data === "string" ? data.data : data?.data ? JSON.stringify(data.data, null, 2) : "";

  const items = rawContent ? parseCatalogTable(rawContent) : [];
  const canParse = items.length > 0;

  // Client-side filtering
  const filtered = search.trim()
    ? items.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.tags || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${collection}...`}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-mal-500 focus:outline-none focus:ring-1 focus:ring-mal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Count indicator */}
      {canParse && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {search
            ? `${filtered.length} of ${items.length} ${collection}`
            : `${items.length} ${collection}`}
        </p>
      )}

      {/* List */}
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-md border p-3 dark:border-gray-600/40">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-2 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">Failed to load {collection}</p>
        ) : canParse ? (
          <div className="space-y-2">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id;
              const extraKeys = Object.keys(item).filter(
                (k) =>
                  !["id", "name", "description"].includes(k) &&
                  item[k] &&
                  item[k] !== item.name &&
                  item[k] !== item.description
              );

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border p-3 transition-colors cursor-pointer",
                    isExpanded
                      ? "border-mal-300 bg-mal-50/30 dark:border-mal-700 dark:bg-mal-900/20"
                      : "hover:bg-gray-50 dark:border-gray-600/40 dark:hover:bg-gray-700/30"
                  )}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : item.id);
                    onSelect?.(item.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.name}
                        </span>
                        {item.version && (
                          <Badge variant="secondary">{item.version}</Badge>
                        )}
                        {item.category && (
                          <Badge variant="default">{item.category}</Badge>
                        )}
                      </div>
                      <p className={cn(
                        "mt-0.5 text-xs text-gray-500 dark:text-gray-400",
                        !isExpanded && "line-clamp-2"
                      )}>
                        {item.description}
                      </p>

                      {/* Tags */}
                      {item.tags && !isExpanded && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.tags
                            .replace(/[[\]]/g, "")
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Expanded detail */}
                      {isExpanded && extraKeys.length > 0 && (
                        <div className="mt-2 space-y-1 border-t pt-2 dark:border-gray-600/40">
                          {extraKeys.map((key) => (
                            <div key={key} className="flex gap-2 text-xs">
                              <span className="font-medium text-gray-500 dark:text-gray-400 capitalize shrink-0">
                                {key.replace(/_/g, " ")}:
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 break-all">
                                {item[key]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="shrink-0 text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && search && (
              <p className="py-4 text-center text-sm text-gray-400">
                No {collection} matching "{search}"
              </p>
            )}
          </div>
        ) : rawContent ? (
          /* Fallback: raw markdown if we can't parse */
          <div className="space-y-2">
            <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto rounded-md border bg-gray-50 dark:bg-gray-800 dark:border-gray-600/40 p-3">
              {rawContent}
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
