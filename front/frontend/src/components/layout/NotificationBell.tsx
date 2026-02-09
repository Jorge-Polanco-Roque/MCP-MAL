import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Subscribe to notifications — poll activity feed
  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/activity?limit=5");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const interactions = data?.interactions ?? [];
        const mapped: Notification[] = interactions.slice(0, 5).map((i: Record<string, string>) => ({
          id: i.id || String(Math.random()),
          title: i.title || "New interaction",
          message: i.summary || i.source || "",
          time: i.created_at || "",
          read: false,
        }));
        setNotifications(mapped);
      } catch {
        // Silently ignore notification fetch errors
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b px-3 py-2 dark:border-gray-700">
            <span className="text-xs font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-mal-600 hover:underline dark:text-mal-400"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-auto">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "border-b px-3 py-2 text-xs last:border-b-0 dark:border-gray-700",
                    n.read
                      ? "text-gray-400 dark:text-gray-500"
                      : "bg-mal-50/50 dark:bg-mal-900/10"
                  )}
                >
                  <p className="font-medium text-gray-700 dark:text-gray-300">{n.title}</p>
                  {n.message && (
                    <p className="mt-0.5 truncate text-gray-500 dark:text-gray-400">{n.message}</p>
                  )}
                  {n.time && (
                    <p className="mt-0.5 text-[10px] text-gray-400">{n.time}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
