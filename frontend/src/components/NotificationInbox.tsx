import React, { useEffect, useState } from "react";
import type { NotificationItem } from "../types";
import { api } from "../lib/api";

interface NotificationInboxProps {
  accessToken: string;
}

const typeColors: Record<string, string> = {
  ERROR: "bg-red-900/40 text-red-200 border border-red-500/30",
  WARNING: "bg-amber-900/40 text-amber-200 border border-amber-500/30",
  INFO: "bg-blue-900/40 text-blue-200 border border-blue-500/30",
  SUCCESS: "bg-emerald-900/40 text-emerald-200 border border-emerald-500/30",
};

export const NotificationInbox: React.FC<NotificationInboxProps> = ({ accessToken }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await api.getNotifications(accessToken, filterRead === "unread" ? false : filterRead === "read" ? true : undefined);
      setNotifications(result);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterRead]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-carbon-50">Notification Inbox</h2>

      <div className="flex gap-2 flex-wrap">
        {["all", "unread", "read"].map((filter) => (
          <button
            key={filter}
            onClick={() => setFilterRead(filter as "all" | "unread" | "read")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterRead === filter
                ? "bg-accent-500 text-carbon-900"
                : "bg-carbon-700/40 text-carbon-300 hover:bg-carbon-700/60"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-carbon-300">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-carbon-300">No notifications</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-2xl border-l-4 ${
                notification.isRead
                  ? "bg-carbon-700/30 border-carbon-600"
                  : "bg-carbon-700/50 border-accent-500"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${typeColors[notification.type] || "bg-carbon-700/40 text-carbon-200"}`}>
                      {notification.type}
                    </span>
                    {notification.isRead && (
                      <span className="text-xs text-carbon-400 font-medium">Read</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-carbon-50 mt-2">{notification.title}</h3>
                  <p className="text-carbon-200 mt-1">{notification.message}</p>
                  {notification.relatedData && Object.keys(notification.relatedData).length > 0 && (
                    <details className="mt-2 cursor-pointer">
                      <summary className="text-accent-400 hover:text-accent-300 text-sm font-medium">Show details</summary>
                      <pre className="bg-carbon-800/50 p-2 rounded-lg mt-2 text-xs overflow-auto max-h-40 text-carbon-100 border border-carbon-700/30">
                        {JSON.stringify(notification.relatedData, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="text-xs text-carbon-400 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-carbon-200">
        Total: <span className="font-semibold">{notifications.length}</span>
      </div>
    </div>
  );
};
