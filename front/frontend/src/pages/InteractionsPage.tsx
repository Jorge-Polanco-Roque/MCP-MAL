import { useState } from "react";
import { History, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { useInteractions, useSearchInteractions } from "@/hooks/useData";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = ["", "chat", "review", "planning", "retrospective", "standup"];

export function InteractionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const filters: Record<string, string> = {};
  if (typeFilter) filters.type = typeFilter;

  const interactions = useInteractions(Object.keys(filters).length > 0 ? filters : undefined);
  const searchResults = useSearchInteractions(activeSearch);

  const isSearching = activeSearch.length >= 2;
  const activeQuery = isSearching ? searchResults : interactions;
  const content = typeof activeQuery.data?.data === "string" ? activeQuery.data.data : undefined;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">Interactions</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActiveSearch("");
            setSearchQuery("");
            interactions.refetch();
          }}
          disabled={interactions.isFetching}
        >
          <RefreshCw
            className={cn("mr-1 h-4 w-4", interactions.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Search + Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search interactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <Button type="submit" size="sm" disabled={searchQuery.trim().length < 2}>
              Search
            </Button>
          </form>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setActiveSearch("");
              setSearchQuery("");
            }}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {isSearching && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Search results for "{activeSearch}"
            </span>
            <button
              onClick={() => {
                setActiveSearch("");
                setSearchQuery("");
              }}
              className="text-xs text-mal-600 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Results */}
        <DataCard
          title="Interactions"
          data={content}
          isLoading={activeQuery.isLoading}
          error={activeQuery.error}
        />
      </div>
    </div>
  );
}
