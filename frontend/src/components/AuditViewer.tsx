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

  const handleResetFilters = () => {
    setEntityType("");
    setEntityId("");
    setStartDate("");
    setEndDate("");
    fetchLogs();
  };

  return (
    <div className="bg-gradient-to-br from-white/8 via-red-500/5 to-rose-500/4 rounded-2xl shadow-lg p-6 border border-carbon-200 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-carbon-900 mb-4">Audit Log Viewer</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">Entity Type</label>
          <input
            type="text"
            placeholder="e.g., activity_log"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-carbon-300 bg-white/6 text-carbon-900 placeholder:text-carbon-500 focus:outline-none focus:border-carbon-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">Entity ID</label>
          <input
            type="text"
            placeholder="e.g., 123"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-carbon-300 bg-white/6 text-carbon-900 placeholder:text-carbon-500 focus:outline-none focus:border-carbon-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-carbon-300 bg-white/6 text-carbon-900 focus:outline-none focus:border-carbon-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-carbon-300 bg-white/6 text-carbon-900 focus:outline-none focus:border-carbon-400"
          />
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <button
          onClick={handleFilter}
          disabled={loading}
          className="px-4 py-2 bg-accent-500 text-carbon-900 rounded-lg hover:bg-accent-600 disabled:bg-white/6 disabled:text-carbon-500 font-medium transition"
        >
          {loading ? "Loading..." : "Apply Filters"}
        </button>
        <button
          onClick={handleResetFilters}
          disabled={loading}
          className="px-4 py-2 bg-white/6 text-carbon-900 rounded-lg hover:bg-white/5 border border-carbon-200/30 font-medium transition"
        >
          Reset Filters
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-carbon-200">
        <div className="h-1 w-full bg-accent-500/20" />
        <table className="w-full text-sm">
          <thead className="bg-white/6 border-b border-carbon-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-carbon-800">Timestamp</th>
              <th className="px-4 py-2 text-left font-semibold text-carbon-800">Entity Type</th>
              <th className="px-4 py-2 text-left font-semibold text-carbon-800">Entity ID</th>
              <th className="px-4 py-2 text-left font-semibold text-carbon-800">Action</th>
              <th className="px-4 py-2 text-left font-semibold text-carbon-800">User Email</th>
              <th className="px-4 py-2 text-left font-semibold text-carbon-800">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-carbon-300">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-carbon-200/40 hover:bg-white/5">
                  <td className="px-4 py-2 text-carbon-700">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 text-carbon-700">{log.entityType}</td>
                  <td className="px-4 py-2 text-carbon-700">{log.entityId}</td>
                  <td className="px-4 py-2 font-medium text-accent-500">{log.action}</td>
                  <td className="px-4 py-2 text-carbon-700">{log.actorEmail ?? "system"}</td>
                  <td className="px-4 py-2 text-carbon-600 max-w-xs truncate">
                    <details className="cursor-pointer">
                      <summary className="text-accent-500 hover:underline">View</summary>
                      <pre className="bg-white/6 p-2 rounded mt-2 text-xs overflow-auto max-h-40 text-carbon-800 border border-carbon-200/30">
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

      <div className="mt-4 text-sm text-carbon-300">
        Total records: <span className="font-semibold">{logs.length}</span>
      </div>
    </div>
  );
};
