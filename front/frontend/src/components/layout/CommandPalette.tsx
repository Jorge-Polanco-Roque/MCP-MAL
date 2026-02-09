import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  LayoutGrid,
  ListTodo,
  History,
  BarChart3,
  Package,
  Trophy,
  Lightbulb,
  BookOpen,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "chat", label: "Chat", path: "/", icon: MessageSquare, keywords: ["chat", "message", "ask", "ai"] },
  { id: "projects", label: "Projects", path: "/projects", icon: FolderKanban, keywords: ["project", "repo"] },
  { id: "sprints", label: "Sprint Board", path: "/sprints", icon: LayoutGrid, keywords: ["sprint", "kanban", "board"] },
  { id: "backlog", label: "Backlog", path: "/backlog", icon: ListTodo, keywords: ["backlog", "items", "tasks", "bugs"] },
  { id: "next-steps", label: "Next Steps", path: "/next-steps", icon: Lightbulb, keywords: ["next", "steps", "suggest"] },
  { id: "analytics", label: "Analytics", path: "/analytics", icon: BarChart3, keywords: ["analytics", "charts", "stats"] },
  { id: "leaderboard", label: "Leaderboard", path: "/leaderboard", icon: Trophy, keywords: ["leaderboard", "xp", "ranking"] },
  { id: "decisions", label: "Decisions", path: "/decisions", icon: BookOpen, keywords: ["decisions", "journal"] },
  { id: "interactions", label: "History", path: "/interactions", icon: History, keywords: ["history", "interactions", "conversations"] },
  { id: "catalog", label: "Catalog", path: "/catalog", icon: Package, keywords: ["catalog", "skills", "commands"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.includes(q))
        );
      })
    : COMMANDS;

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIdx(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const handleSelect = useCallback(
    (cmd: CommandItem) => {
      navigate(cmd.path);
      handleClose();
    },
    [navigate, handleClose]
  );

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleOpen, handleClose]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIdx]) {
      handleSelect(filtered[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-xl border bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a page name or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-gray-100"
          />
          <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No results found</p>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    idx === selectedIdx
                      ? "bg-mal-50 text-mal-700 dark:bg-mal-900/30 dark:text-mal-400"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{cmd.label}</span>
                  {idx === selectedIdx && (
                    <kbd className="rounded border bg-gray-100 px-1 py-0.5 text-[10px] text-gray-400 dark:border-gray-600 dark:bg-gray-800">
                      Enter
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[10px] text-gray-400 dark:border-gray-700">
          <span>Navigate with <kbd className="font-mono">↑↓</kbd></span>
          <span>Select with <kbd className="font-mono">Enter</kbd></span>
          <span>Close with <kbd className="font-mono">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
