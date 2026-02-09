import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
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
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useHealth } from "@/hooks/useCatalog";
import { useProjectContext } from "@/hooks/useProjectContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { to: "/", icon: MessageSquare, label: "Chat" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/sprints", icon: LayoutGrid, label: "Sprints" },
  { to: "/backlog", icon: ListTodo, label: "Backlog" },
  { to: "/next-steps", icon: Lightbulb, label: "Next Steps" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/decisions", icon: BookOpen, label: "Decisions" },
  { to: "/interactions", icon: History, label: "History" },
  { to: "/catalog", icon: Package, label: "Catalog" },
];

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: health } = useHealth();
  const { activeProject } = useProjectContext();
  const { resolvedTheme, setTheme } = useTheme();

  const statusColor =
    health?.mcp_status === "online"
      ? "bg-green-500"
      : health?.mcp_status === "degraded"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex h-screen flex-col">
      <CommandPalette />
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            className="rounded-md p-1 text-gray-500 dark:text-gray-400 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <img src="/mal-logo.svg" alt="MAL" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              MAL MCP Hub
              {activeProject && (
                <span className="ml-2 text-sm font-medium text-mal-600 dark:text-mal-400">
                  / {activeProject.name}
                </span>
              )}
            </h1>
            <p className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">Monterrey Agentic Labs</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <NotificationBell />
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", statusColor)} />
            {health?.mcp_status === "online" ? "Connected" : health?.mcp_status || "..."}
          </span>
          {health?.tools_count != null && (
            <span className="hidden sm:inline">{health.tools_count} tools</span>
          )}
          {health?.agents_available && health.agents_available.length > 0 && (
            <span className="hidden md:inline">
              {health.agents_available.length} agents
            </span>
          )}
        </div>
      </header>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <nav className="border-b bg-white p-2 dark:border-gray-700 dark:bg-gray-900 md:hidden">
          <div className="grid grid-cols-3 gap-1">
            {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium",
                    isActive
                      ? "bg-mal-100 text-mal-700 dark:bg-mal-900/30 dark:text-mal-400"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
