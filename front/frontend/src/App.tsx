import { useState } from "react";
import { MessageSquare, LayoutDashboard } from "lucide-react";
import { ChatPanel } from "./components/chat/ChatPanel";
import { DashboardPanel } from "./components/dashboard/DashboardPanel";
import { cn } from "./lib/utils";

export default function App() {
  const [mobileTab, setMobileTab] = useState<"chat" | "dashboard">("chat");

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/mal-logo.svg" alt="MAL" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">MAL MCP Hub</h1>
            <p className="text-xs text-gray-500">Monterrey Agentic Labs</p>
          </div>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex gap-1 md:hidden">
          <button
            className={cn(
              "rounded-md p-2",
              mobileTab === "chat" ? "bg-mal-100 text-mal-700" : "text-gray-400"
            )}
            onClick={() => setMobileTab("chat")}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          <button
            className={cn(
              "rounded-md p-2",
              mobileTab === "dashboard" ? "bg-mal-100 text-mal-700" : "text-gray-400"
            )}
            onClick={() => setMobileTab("dashboard")}
          >
            <LayoutDashboard className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel — desktop: always visible, mobile: conditional */}
        <div
          className={cn(
            "flex-1 border-r md:block",
            mobileTab === "chat" ? "block" : "hidden"
          )}
        >
          <ChatPanel />
        </div>

        {/* Dashboard Panel — desktop: always visible, mobile: conditional */}
        <div
          className={cn(
            "w-full md:w-[380px] lg:w-[420px] md:block",
            mobileTab === "dashboard" ? "block" : "hidden"
          )}
        >
          <DashboardPanel />
        </div>
      </div>
    </div>
  );
}
