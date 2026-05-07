import React, { useEffect, useState } from "react";
import type { NotificationItem } from "../types";
import { api } from "../lib/api";

interface NotificationInboxProps {
  accessToken: string;
}

const typeColors: Record<string, string> = {
  ERROR: "bg-red-50 text-red-700 border border-red-200",
  WARNING: "bg-amber-50 text-amber-700 border border-amber-200",
  INFO: "bg-blue-50 text-blue-700 border border-blue-200",
  SUCCESS: "bg-emerald-50 text-emerald-700 border border-emerald-200",
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
      <h2 className="text-lg font-bold text-carbon-900">Notification Inbox</h2>

      <div className="flex gap-2 flex-wrap">
        {["all", "unread", "read"].map((filter) => (
          <button
            key={filter}
            onClick={() => setFilterRead(filter as "all" | "unread" | "read")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterRead === filter
                ? "bg-accent-500 text-carbon-900"
                : "bg-white/6 text-carbon-700 hover:bg-white/5"
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
            <div key={notification.id} className={`p-4 rounded-2xl border-l-4 ${notification.isRead ? "bg-white/6 border-carbon-200" : "bg-white/8 border-accent-200"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${typeColors[notification.type] || "bg-white/6 text-carbon-700"}`}>
                      {notification.type}
                    </span>
                    {notification.isRead && (
                      <span className="text-xs text-carbon-400 font-medium">Read</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-carbon-900 mt-2">{notification.title}</h3>
                  <p className="text-carbon-700 mt-1">{notification.message}</p>
                  {notification.relatedData && Object.keys(notification.relatedData).length > 0 && (
                    <details className="mt-2 cursor-pointer">
                      <summary className="text-accent-500 hover:text-accent-400 text-sm font-medium">Show details</summary>
                      <pre className="bg-white/6 p-2 rounded-lg mt-2 text-xs overflow-auto max-h-40 text-carbon-900 border border-carbon-200/30">
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
