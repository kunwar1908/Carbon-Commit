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
    <div className="bg-carbon-800/40 rounded-2xl shadow-lg p-6 border border-carbon-700/30 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-carbon-50 mb-4">Export Data</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-500/40">{error}</div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-emerald-900/50 text-emerald-200 rounded-lg border border-emerald-500/40">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleExportActivityCsv}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center p-6 bg-carbon-700/30 border-2 border-carbon-600/40 rounded-lg hover:bg-carbon-700/50 disabled:bg-carbon-800/20 disabled:border-carbon-700/20 transition text-white"
        >
          <div className="text-2xl mb-2">📊</div>
          <span className="font-semibold text-carbon-100 text-center">
            {exporting === "csv" ? "Exporting..." : "Export Activity Logs (CSV)"}
          </span>
          <span className="text-xs text-carbon-300 mt-1">All activity logs</span>
        </button>

        <button
          onClick={handleExportAuditCsv}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center p-6 bg-carbon-700/30 border-2 border-carbon-600/40 rounded-lg hover:bg-carbon-700/50 disabled:bg-carbon-800/20 disabled:border-carbon-700/20 transition text-white"
        >
          <div className="text-2xl mb-2">🔍</div>
          <span className="font-semibold text-carbon-100 text-center">
            {exporting === "audit" ? "Exporting..." : "Export Audit Logs (CSV)"}
          </span>
          <span className="text-xs text-carbon-300 mt-1">Admin audit trail</span>
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center p-6 bg-carbon-700/30 border-2 border-carbon-600/40 rounded-lg hover:bg-carbon-700/50 disabled:bg-carbon-800/20 disabled:border-carbon-700/20 transition text-white"
        >
          <div className="text-2xl mb-2">📄</div>
          <span className="font-semibold text-carbon-100 text-center">
            {exporting === "pdf" ? "Exporting..." : "Export PDF Report"}
          </span>
          <span className="text-xs text-carbon-300 mt-1">Compliance report</span>
        </button>
      </div>

      <div className="mt-6 p-4 bg-carbon-700/30 rounded-lg text-sm text-carbon-200 border border-carbon-600/30">
        <p className="font-semibold mb-2 text-carbon-50">Export Information:</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-carbon-300">
          <li>Activity Logs CSV: Contains all submitted activities with emissions calculations</li>
          <li>Audit Logs CSV: Contains admin-only audit trail for compliance and tracking</li>
          <li>PDF Report: Comprehensive compliance report with department summaries and charts</li>
        </ul>
      </div>
    </div>
  );
};
