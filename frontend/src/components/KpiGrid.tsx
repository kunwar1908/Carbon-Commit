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
    return <div className="text-center py-8 text-gray-500">Loading KPIs...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>;
  }

  if (kpis.length === 0) {
    return <div className="text-center py-8 text-gray-500">No KPI data available</div>;
  }

  const toneClasses: Record<RoleKpi["tone"], string> = {
    neutral: "from-slate-50 to-slate-100 border-slate-200 text-slate-800",
    warning: "from-amber-50 to-amber-100 border-amber-200 text-amber-800",
    success: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800",
    critical: "from-red-50 to-red-100 border-red-200 text-red-800",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Performance KPIs {role ? `(${role})` : ""}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className={`bg-gradient-to-br rounded-lg p-6 border ${toneClasses[item.tone]}`}
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
