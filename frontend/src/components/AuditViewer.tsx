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
    <div className="liquid-surface rounded-[1.5rem] p-6">
      <h2 className="text-2xl font-bold text-carbon-900 mb-4">Audit Log Viewer</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">Entity Type</label>
          <input
            type="text"
            placeholder="e.g., activity_log"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">Entity ID</label>
          <input
            type="text"
            placeholder="e.g., 123"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-carbon-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
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
          className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 font-medium text-slate-800 transition hover:bg-slate-200"
        >
          Reset Filters
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-carbon-200">
        <div className="h-1 w-full bg-accent-500/20" />
        <table className="w-full text-sm">
          <thead className="border-b border-slate-300 bg-slate-100">
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
                <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-2 text-carbon-700">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 text-carbon-700">{log.entityType}</td>
                  <td className="px-4 py-2 text-carbon-700">{log.entityId}</td>
                  <td className="px-4 py-2 font-medium text-accent-500">{log.action}</td>
                  <td className="px-4 py-2 text-carbon-700">{log.actorEmail ?? "system"}</td>
                  <td className="px-4 py-2 text-carbon-600 max-w-xs truncate">
                    <details className="cursor-pointer">
                      <summary className="text-accent-500 hover:underline">View</summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded border border-slate-300 bg-slate-100 p-2 text-xs text-slate-800">
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
