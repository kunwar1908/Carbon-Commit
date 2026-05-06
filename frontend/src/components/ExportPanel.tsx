import React, { useState } from "react";
import { api } from "../lib/api";

interface ExportPanelProps {
  accessToken: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ accessToken }) => {
  const [exporting, setExporting] = useState<"csv" | "audit" | "pdf" | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportActivityCsv = async () => {
    setExporting("csv");
    setError("");
    setSuccess("");
    try {
      const blob = await api.exportActivityCsv(accessToken, "activity");
      downloadFile(blob, `activity-logs-${new Date().toISOString().split("T")[0]}.csv`);
      setSuccess("Activity logs exported successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleExportAuditCsv = async () => {
    setExporting("audit");
    setError("");
    setSuccess("");
    try {
      const blob = await api.exportActivityCsv(accessToken, "audit");
      downloadFile(blob, `audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
      setSuccess("Audit logs exported successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    setError("");
    setSuccess("");
    try {
      const blob = await api.exportActivityPdf(accessToken);
      downloadFile(blob, `compliance-report-${new Date().toISOString().split("T")[0]}.pdf`);
      setSuccess("PDF report exported successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Export Data</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleExportActivityCsv}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 disabled:bg-gray-100 disabled:border-gray-200 transition"
        >
          <div className="text-2xl mb-2">📊</div>
          <span className="font-semibold text-gray-800 text-center">
            {exporting === "csv" ? "Exporting..." : "Export Activity Logs (CSV)"}
          </span>
          <span className="text-xs text-gray-600 mt-1">All activity logs</span>
        </button>

        <button
          onClick={handleExportAuditCsv}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 disabled:bg-gray-100 disabled:border-gray-200 transition"
        >
          <div className="text-2xl mb-2">🔍</div>
          <span className="font-semibold text-gray-800 text-center">
            {exporting === "audit" ? "Exporting..." : "Export Audit Logs (CSV)"}
          </span>
          <span className="text-xs text-gray-600 mt-1">Admin audit trail</span>
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center p-6 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 disabled:bg-gray-100 disabled:border-gray-200 transition"
        >
          <div className="text-2xl mb-2">📄</div>
          <span className="font-semibold text-gray-800 text-center">
            {exporting === "pdf" ? "Exporting..." : "Export PDF Report"}
          </span>
          <span className="text-xs text-gray-600 mt-1">Compliance report</span>
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
        <p className="font-semibold mb-2">Export Information:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Activity Logs CSV: Contains all submitted activities with emissions calculations</li>
          <li>Audit Logs CSV: Contains admin-only audit trail for compliance and tracking</li>
          <li>PDF Report: Comprehensive compliance report with department summaries and charts</li>
        </ul>
      </div>
    </div>
  );
};
