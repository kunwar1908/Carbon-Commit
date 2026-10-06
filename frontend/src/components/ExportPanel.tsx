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
    <div className="liquid-surface rounded-[1.5rem] p-6">
      <h2 className="text-2xl font-bold text-carbon-900 mb-4">Export Data</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleExportActivityCsv}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-blue-300 bg-blue-50 p-6 text-blue-950 transition hover:bg-blue-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <div className="text-2xl mb-2">📊</div>
          <span className="text-center font-semibold text-blue-950">
            {exporting === "csv" ? "Exporting..." : "Export Activity Logs (CSV)"}
          </span>
          <span className="mt-1 text-xs text-blue-700">All activity logs</span>
        </button>

        <button
          onClick={handleExportAuditCsv}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-violet-300 bg-violet-50 p-6 text-violet-950 transition hover:bg-violet-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <div className="text-2xl mb-2">🔍</div>
          <span className="text-center font-semibold text-violet-950">
            {exporting === "audit" ? "Exporting..." : "Export Audit Logs (CSV)"}
          </span>
          <span className="mt-1 text-xs text-violet-700">Admin audit trail</span>
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-emerald-300 bg-emerald-50 p-6 text-emerald-950 transition hover:bg-emerald-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <div className="text-2xl mb-2">📄</div>
          <span className="text-center font-semibold text-emerald-950">
            {exporting === "pdf" ? "Exporting..." : "Export PDF Report"}
          </span>
          <span className="mt-1 text-xs text-emerald-700">Compliance report</span>
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
        <p className="mb-2 font-semibold text-slate-900">Export Information:</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
          <li>Activity Logs CSV: Contains all submitted activities with emissions calculations</li>
          <li>Audit Logs CSV: Contains admin-only audit trail for compliance and tracking</li>
          <li>PDF Report: Comprehensive compliance report with department summaries and charts</li>
        </ul>
      </div>
    </div>
  );
};
