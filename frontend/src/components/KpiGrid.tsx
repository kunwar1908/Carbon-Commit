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
    neutral: "from-carbon-700/50 to-carbon-600/30 border-carbon-600/30 text-white",
    warning: "from-amber-900/40 to-amber-800/20 border-amber-600/30 text-amber-200",
    success: "from-emerald-900/40 to-emerald-800/20 border-emerald-600/30 text-emerald-200",
    critical: "from-red-900/40 to-red-800/20 border-red-600/30 text-red-200",
  };

  return (
    <div className="bg-gradient-to-br from-white/8 via-indigo-500/5 to-purple-500/4 rounded-2xl shadow-lg p-6 border border-carbon-200 backdrop-blur-sm">
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
          <div key={item.label} className={`rounded-2xl p-6 border ${toneClasses[item.tone]} bg-white/6`}> 
            <p className="text-sm font-medium mb-1 text-carbon-800">{item.label}</p>
            <p className="text-3xl font-bold text-carbon-900">{item.value}</p>
            <p className="text-xs mt-2 text-carbon-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
