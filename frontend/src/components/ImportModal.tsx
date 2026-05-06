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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Import Activity Logs</h2>

        {result ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg ${
                "bg-green-50 border border-green-200"
              }`}
            >
              <p
                className="font-semibold text-green-800"
              >
                ✓ Import Completed
              </p>
              <div className="text-sm mt-2 text-green-700">
                <p>Imported: <span className="font-semibold">{result.imported}</span></p>
                <p>Skipped: <span className="font-semibold">{result.skipped}</span></p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
              >
                Import Another
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-input"
              />
              <label htmlFor="csv-input" className="cursor-pointer">
                <div className="text-gray-500">
                  <p className="font-medium">Click to select or drag CSV file</p>
                  <p className="text-xs mt-1">Supported: .csv files only</p>
                </div>
              </label>

              {file && (
                <div className="mt-3 text-sm font-semibold text-green-700">
                  ✓ {file.name}
                </div>
              )}
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
              <p className="font-semibold mb-1">CSV Format Required:</p>
              <p>deptId, activityType, units, notes (optional), timestamp (optional, YYYY-MM-DD)</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition"
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
