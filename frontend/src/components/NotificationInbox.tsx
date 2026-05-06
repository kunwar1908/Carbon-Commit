import React, { useEffect, useState } from "react";
import type { NotificationItem } from "../types";
import { api } from "../lib/api";

interface NotificationInboxProps {
  accessToken: string;
}

const typeColors: Record<string, string> = {
  ERROR: "bg-red-100 text-red-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  INFO: "bg-blue-100 text-blue-800",
  SUCCESS: "bg-emerald-100 text-emerald-800",
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Notification Inbox</h2>

      <div className="flex gap-2 mb-6">
        {["all", "unread", "read"].map((filter) => (
          <button
            key={filter}
            onClick={() => setFilterRead(filter as "all" | "unread" | "read")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterRead === filter
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No notifications</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 ${
                notification.isRead
                  ? "bg-gray-50 border-gray-300"
                  : "bg-blue-50 border-blue-500"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${typeColors[notification.type] || "bg-gray-100 text-gray-800"}`}>
                      {notification.type}
                    </span>
                    {notification.isRead && (
                      <span className="text-xs text-gray-500 font-medium">Read</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mt-2">{notification.title}</h3>
                  <p className="text-gray-700 mt-1">{notification.message}</p>
                  {notification.relatedData && Object.keys(notification.relatedData).length > 0 && (
                    <details className="mt-2 cursor-pointer">
                      <summary className="text-blue-600 hover:underline text-sm">Show details</summary>
                      <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                        {JSON.stringify(notification.relatedData, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        Total: <span className="font-semibold">{notifications.length}</span>
      </div>
    </div>
  );
};
