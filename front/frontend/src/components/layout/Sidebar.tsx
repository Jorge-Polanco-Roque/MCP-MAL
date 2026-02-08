import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectContext } from "@/hooks/useProjectContext";

const NAV_ITEMS = [
  { to: "/", icon: MessageSquare, label: "Chat" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/sprints", icon: LayoutGrid, label: "Sprints" },
  { to: "/backlog", icon: ListTodo, label: "Backlog" },
  { to: "/next-steps", icon: Lightbulb, label: "Next Steps" },
  { to: "/interactions", icon: History, label: "History" },
  { to: "/decisions", icon: BookOpen, label: "Decisions" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/catalog", icon: Package, label: "Catalog" },
];

const PROJECT_COLORS: Record<string, string> = {
  blue: "text-blue-500",
  green: "text-green-500",
  red: "text-red-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
  pink: "text-pink-500",
  indigo: "text-indigo-500",
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { activeProjectId, activeProject, setActiveProjectId, projects, isLoading } =
    useProjectContext();
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-gray-50 transition-all duration-200",
        collapsed ? "w-16" : "w-52"
      )}
    >
      {/* Project selector (only when expanded) */}
      {!collapsed && (
        <div className="border-b px-2 py-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100"
            >
              {activeProject ? (
                <>
                  <Circle
                    className={cn(
                      "h-3 w-3 fill-current",
                      PROJECT_COLORS[activeProject.color ?? "blue"] ?? "text-blue-500"
                    )}
                  />
                  <span className="flex-1 truncate text-left font-medium">
                    {activeProject.name}
                  </span>
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3 text-gray-300" />
                  <span className="flex-1 text-left text-gray-500">
                    {isLoading ? "Loading..." : "All Projects"}
                  </span>
                </>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 z-30 mt-1 w-full rounded-md border bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(null);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
                    !activeProjectId && "bg-mal-50 font-medium"
                  )}
                >
                  <Circle className="h-3 w-3 text-gray-300" />
                  All Projects
                </button>
                <div className="border-t" />
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProjectId(p.id);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50",
                      p.id === activeProjectId && "bg-mal-50 font-medium"
                    )}
                  >
                    <Circle
                      className={cn(
                        "h-3 w-3 fill-current",
                        PROJECT_COLORS[p.color ?? "blue"] ?? "text-blue-500"
                      )}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.status}</span>
                  </button>
                ))}
                {projects.length === 0 && !isLoading && (
                  <p className="px-3 py-2 text-center text-xs text-gray-400">No projects yet</p>
                )}
                <div className="border-t" />
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/projects");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-mal-600 hover:bg-gray-50"
                >
                  + New Project
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-mal-100 text-mal-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center justify-center border-t p-3 text-gray-400 hover:text-gray-600"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
