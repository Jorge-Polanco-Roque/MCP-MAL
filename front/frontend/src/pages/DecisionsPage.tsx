import { useState } from "react";
import { BookOpen, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { useInteractions, useSearchInteractions } from "@/hooks/useData";
import { cn } from "@/lib/utils";

/**
 * Decision Journal: shows interactions that contain decisions and action items.
 * Uses the interactions search with decision-focused queries.
 */
export function DecisionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("decision");

  // Default: search for interactions mentioning "decision"
  const searchResults = useSearchInteractions(activeSearch);
  const allInteractions = useInteractions({ type: "planning" });

  const activeQuery = activeSearch ? searchResults : allInteractions;
  const content = typeof activeQuery.data?.data === "string" ? activeQuery.data.data : undefined;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold">Decision Journal</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActiveSearch("decision");
            setSearchQuery("");
            searchResults.refetch();
          }}
          disabled={searchResults.isFetching}
        >
          <RefreshCw
            className={cn("mr-1 h-4 w-4", searchResults.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Quick filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {["decision", "action item", "retrospective", "agreement", "blocker"].map(
            (tag) => (
              <button
                key={tag}
                onClick={() => setActiveSearch(tag)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeSearch === tag
                    ? "border-mal-600 bg-mal-100 text-mal-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {tag}
              </button>
            )
          )}
        </div>

        {/* Custom search */}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search decisions, action items, agreements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <Button type="submit" size="sm" disabled={!searchQuery.trim()}>
            Search
          </Button>
        </form>

        <p className="mb-3 text-xs text-gray-500">
          Showing interactions matching: "{activeSearch}"
        </p>

        {/* Results */}
        <DataCard
          title="Decisions"
          data={content}
          isLoading={activeQuery.isLoading}
          error={activeQuery.error}
        />
      </div>
    </div>
  );
}
