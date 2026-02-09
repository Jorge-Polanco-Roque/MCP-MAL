import { useState } from "react";
import { BookOpen, Search, RefreshCw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/ui/data-card";
import { useSearchInteractions, useCreateDecision } from "@/hooks/useData";
import { cn } from "@/lib/utils";

interface DecisionEntry {
  title: string;
  summary: string;
  user: string;
  date: string;
  tags: string[];
}

function parseDecisions(md: string): DecisionEntry[] {
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];

  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());

  const titleIdx = headers.findIndex((h) => h.includes("title"));
  const summaryIdx = headers.findIndex((h) => h.includes("summary"));
  const userIdx = headers.findIndex((h) => h.includes("user"));
  const dateIdx = headers.findIndex(
    (h) => h.includes("date") || h.includes("created")
  );
  const tagsIdx = headers.findIndex((h) => h.includes("tags"));

  const entries: DecisionEntry[] = [];
  for (const line of lines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    const title = (cells[titleIdx] || "").replace(/\*\*/g, "").trim();
    if (!title) continue;

    const summary = (cells[summaryIdx] || "").trim();
    const user = (cells[userIdx] || "").trim();
    const date = (cells[dateIdx] || "").trim();
    const rawTags = (cells[tagsIdx] || "").trim();
    const tags = rawTags
      ? rawTags
          .replace(/[[\]]/g, "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    entries.push({ title, summary, user, date, tags });
  }
  return entries;
}

export function DecisionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("decision");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTags, setFormTags] = useState("");

  const searchResults = useSearchInteractions(activeSearch);
  const createMutation = useCreateDecision();

  const content =
    typeof searchResults.data?.data === "string"
      ? searchResults.data.data
      : undefined;

  const entries = content ? parseDecisions(content) : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createMutation.mutate(
      {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        tags,
      },
      {
        onSuccess: () => {
          setFormTitle("");
          setFormDescription("");
          setFormTags("");
          setShowForm(false);
          // Refetch after a short delay to allow the MCP to index
          setTimeout(() => searchResults.refetch(), 500);
        },
      }
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-mal-600" />
          <h2 className="text-lg font-semibold dark:text-gray-100">Decision Journal</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
          >
            {showForm ? (
              <>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                New Decision
              </>
            )}
          </Button>
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
              className={cn(
                "mr-1 h-4 w-4",
                searchResults.isFetching && "animate-spin"
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Create form */}
        {showForm && (
          <Card className="mb-4 border-mal-200 bg-mal-50/30 dark:border-mal-800 dark:bg-mal-900/20">
            <CardContent className="p-4">
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Decision Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Use PostgreSQL for the menu database"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Rationale / Description
                  </label>
                  <textarea
                    placeholder="Why this decision was made, alternatives considered..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., architecture, database, backend"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!formTitle.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Saving..." : "Save Decision"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quick filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            "decision",
            "action item",
            "retrospective",
            "agreement",
            "blocker",
          ].map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveSearch(tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeSearch === tag
                  ? "border-mal-600 bg-mal-100 text-mal-700 dark:border-mal-500 dark:bg-mal-900/40 dark:text-mal-300"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              {tag}
            </button>
          ))}
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
              className="w-full rounded-md border py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <Button type="submit" size="sm" disabled={!searchQuery.trim()}>
            Search
          </Button>
        </form>

        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Showing interactions matching: "{activeSearch}"
        </p>

        {/* Results as cards or fallback */}
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <Card key={i} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      {entry.title}
                    </CardTitle>
                    {entry.date && (
                      <span className="shrink-0 text-xs text-gray-400">
                        {entry.date}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {entry.summary && (
                    <p className="mb-2 text-sm text-gray-600 line-clamp-2 dark:text-gray-300">
                      {entry.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.user && (
                      <Badge variant="secondary">{entry.user}</Badge>
                    )}
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="default">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <DataCard
            title="Decisions"
            data={content}
            isLoading={searchResults.isLoading}
            error={searchResults.error}
          />
        )}
      </div>
    </div>
  );
}
