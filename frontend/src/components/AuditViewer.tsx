import React, { useEffect, useState } from "react";
import type { AuditLogEntry } from "../types";
import { api } from "../lib/api";

interface AuditViewerProps {
  accessToken: string;
}

export const AuditViewer: React.FC<AuditViewerProps> = ({ accessToken }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState<string>("");
  const [entityId, setEntityId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof api.getAuditLogs>[1] = {};
      if (entityType) filters.entityType = entityType;
      if (entityId) filters.entityId = entityId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result = await api.getAuditLogs(accessToken, filters);
      setLogs(result);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = () => {
    fetchLogs();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Audit Log Viewer</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Entity Type</label>
          <input
            type="text"
            placeholder="e.g., activity_log"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Entity ID</label>
          <input
            type="text"
            placeholder="e.g., 123"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <button
        onClick={handleFilter}
        disabled={loading}
        className="mb-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition"
      >
        {loading ? "Loading..." : "Apply Filters"}
      </button>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Timestamp</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Entity Type</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Entity ID</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Action</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">User Email</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 text-gray-700">{log.entityType}</td>
                  <td className="px-4 py-2 text-gray-700">{log.entityId}</td>
                  <td className="px-4 py-2 font-medium text-blue-600">{log.action}</td>
                  <td className="px-4 py-2 text-gray-700">{log.actorEmail ?? "system"}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:underline">View</summary>
                      <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                        {log.summary}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Total records: <span className="font-semibold">{logs.length}</span>
      </div>
    </div>
  );
};
