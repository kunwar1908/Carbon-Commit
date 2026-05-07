import React, { useEffect, useState } from "react";
import type { RoleKpi } from "../types";
import { api } from "../lib/api";

interface KpiGridProps {
  accessToken: string;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ accessToken }) => {
  const [kpis, setKpis] = useState<RoleKpi[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const summary = await api.getOperationsSummary(accessToken);
        setKpis(summary.roleKpis);
        setRole(summary.profile.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load KPIs");
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, []);

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
    <div className="bg-carbon-800/40 rounded-2xl shadow-lg p-6 border border-carbon-700/30 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-carbon-50 mb-6">
        Performance KPIs {role ? `(${role})` : ""}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className={`bg-gradient-to-br rounded-2xl p-6 border ${toneClasses[item.tone]}`}
          >
            <p className="text-sm font-medium mb-1">{item.label}</p>
            <p className="text-3xl font-bold">{item.value}</p>
            <p className="text-xs mt-2 opacity-80">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
