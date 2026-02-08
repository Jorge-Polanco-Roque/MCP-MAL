import { NavLink } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: MessageSquare, label: "Chat" },
  { to: "/sprints", icon: LayoutGrid, label: "Sprints" },
  { to: "/backlog", icon: ListTodo, label: "Backlog" },
  { to: "/next-steps", icon: Lightbulb, label: "Next Steps" },
  { to: "/interactions", icon: History, label: "History" },
  { to: "/decisions", icon: BookOpen, label: "Decisions" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/catalog", icon: Package, label: "Catalog" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-gray-50 transition-all duration-200",
        collapsed ? "w-16" : "w-52"
      )}
    >
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
