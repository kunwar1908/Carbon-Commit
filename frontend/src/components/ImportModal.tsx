import React, { useState } from "react";
import type { CsvImportResult } from "../types";
import { api } from "../lib/api";

interface ImportModalProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ accessToken, isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        setFile(null);
        return;
      }
      setError("");
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    try {
      const importResult = await api.importActivityLogsFromCsv(file, accessToken);
      setResult(importResult);
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white/8 via-blue-500/5 to-cyan-500/4 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-carbon-200 text-carbon-900 animate-in fade-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-bold text-carbon-900 mb-4">Import Activity Logs</h2>

        {result ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="font-semibold text-emerald-700">✓ Import Completed</p>
              <div className="text-sm mt-2 text-emerald-700">
                <p>Imported: <span className="font-semibold">{result.imported}</span></p>
                <p>Skipped: <span className="font-semibold">{result.skipped}</span></p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-white/6 text-carbon-900 rounded-lg hover:bg-white/5 font-medium transition border border-carbon-200/30"
              >
                Import Another
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-accent-500 text-carbon-900 rounded-lg hover:bg-accent-600 font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="border-2 border-dashed border-carbon-300/40 rounded-lg p-6 text-center bg-white/6">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-input"
              />
              <label htmlFor="csv-input" className="cursor-pointer">
                <div className="text-carbon-200">
                  <p className="font-medium">Click to select or drag CSV file</p>
                  <p className="text-xs mt-1">Supported: .csv files only</p>
                </div>
              </label>

              {file && (
                <div className="mt-3 text-sm font-semibold text-emerald-200">
                  ✓ {file.name}
                </div>
              )}
            </div>

            <div className="text-xs text-carbon-700 bg-white/6 p-3 rounded-lg border border-carbon-200">
              <p className="font-semibold mb-1">CSV Format Required:</p>
              <ul className="list-disc pl-4">
                <li><strong>Columns (in order):</strong> deptId, activityType, units, notes (optional), timestamp (optional)</li>
                <li><strong>deptId:</strong> department identifier (string or numeric)</li>
                <li><strong>activityType:</strong> one of the predefined activity types (e.g., "energy", "waste", "travel")</li>
                <li><strong>units:</strong> numeric value representing units or amount</li>
                <li><strong>notes:</strong> free text (optional)</li>
                <li><strong>timestamp:</strong> optional ISO date string in <code>YYYY-MM-DD</code> format; if omitted current server time will be used</li>
              </ul>
              <div className="mt-2 text-xs text-carbon-600">
                <p className="font-semibold mb-1">Example CSV row:</p>
                <pre className="bg-white/5 p-2 rounded text-xs overflow-auto border border-carbon-200/30">dept123,energy,42,"LED replacement",2024-09-01</pre>
                <p className="mt-2">Tip: Ensure there is no header row. The importer expects raw rows matching the column order above.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-white/6 text-carbon-900 rounded-lg hover:bg-white/5 font-medium transition border border-carbon-200/30"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 px-4 py-2 bg-accent-500 text-carbon-900 rounded-lg hover:bg-accent-600 disabled:bg-white/3 disabled:text-carbon-500 font-medium transition"
              >
                {loading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
