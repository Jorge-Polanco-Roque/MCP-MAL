import { ChatPanel } from "@/components/chat/ChatPanel";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";

export function ChatPage() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat — always visible */}
      <div className="flex-1 border-r">
        <ChatPanel />
      </div>
      {/* Dashboard sidebar — hidden on small screens */}
      <div className="hidden w-[380px] lg:block">
        <DashboardPanel />
      </div>
    </div>
  );
}
