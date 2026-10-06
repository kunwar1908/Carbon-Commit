import React, { useEffect, useState } from "react";
import type { RoleKpi } from "../types";
import { api } from "../lib/api";

interface KpiGridProps {
  accessToken: string;
  refreshKey?: number;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ accessToken, refreshKey }) => {
  const [kpis, setKpis] = useState<RoleKpi[]>([]);
  const [role, setRole] = useState<string>("");
  const [trackedDept, setTrackedDept] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;
    const fetchKpis = async () => {
      try {
        setLoading(true);
        const summary = await api.getOperationsSummary(accessToken);
        if (!active) return;
        setKpis(summary.roleKpis);
        setRole(summary.profile.role);
        setTrackedDept(summary.profile.departmentName ?? null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load KPIs");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchKpis();

    return () => {
      active = false;
    };
  }, [accessToken, refreshKey]);

  if (loading) {
    return <div className="text-center py-8 text-carbon-200">Loading KPIs...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-900/50 text-red-200 rounded-2xl border border-red-500/40">{error}</div>;
  }

  if (kpis.length === 0) {
    return <div className="text-center py-8 text-carbon-200">No KPI data available</div>;
  }

  const toneClasses: Record<RoleKpi["tone"], string> = {
    neutral: "bg-slate-100 border-slate-300",
    warning: "bg-amber-100 border-amber-300",
    success: "bg-emerald-100 border-emerald-300",
    critical: "bg-red-100 border-red-300",
  };

  const toneTextClasses: Record<RoleKpi["tone"], { label: string; value: string; detail: string }> = {
    neutral: { label: "text-slate-700", value: "text-slate-950", detail: "text-slate-600" },
    warning: { label: "text-amber-800", value: "text-amber-950", detail: "text-amber-700" },
    success: { label: "text-emerald-800", value: "text-emerald-950", detail: "text-emerald-700" },
    critical: { label: "text-red-800", value: "text-red-950", detail: "text-red-700" },
  };

  return (
    <div className="liquid-surface rounded-[1.5rem] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-carbon-900">Performance KPIs {role ? `(${role})` : ""}</h2>
        <div className="text-sm">
          <div className="inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-white/8 via-indigo-500/4 to-blue-500/3 border border-carbon-200 px-3 py-2 text-carbon-900">
            <span className="text-xs text-carbon-700">Tracked Dept</span>
            <span className="font-medium">{trackedDept ?? "Not set"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-6 ${toneClasses[item.tone]}`}>
            <p className={`mb-1 text-sm font-medium ${toneTextClasses[item.tone].label}`}>{item.label}</p>
            <p className={`text-3xl font-bold ${toneTextClasses[item.tone].value}`}>{item.value}</p>
            <p className={`mt-2 text-xs ${toneTextClasses[item.tone].detail}`}>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
