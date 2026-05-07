import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import type { FootprintData } from "../types";
import { api } from "../lib/api";

interface FootprintChartProps {
  accessToken: string;
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

export const FootprintChart: React.FC<FootprintChartProps> = ({ accessToken }) => {
  const [footprints, setFootprints] = useState<FootprintData[]>([]);
  const [section, setSection] = useState<"transport" | "hostel">("transport");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<number | null>(null);

  useEffect(() => {
    const fetchFootprints = async () => {
      try {
        const summary = await api.getOperationsSummary(accessToken);
        const result = summary.footprints.transport.departments;
        setFootprints(result);
        if (result.length > 0) {
          setSelectedDept(result[0]?.id ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load footprints");
      } finally {
        setLoading(false);
      }
    };

    fetchFootprints();
  }, [accessToken]);

  useEffect(() => {
    const fetchBySection = async () => {
      try {
        const summary = await api.getOperationsSummary(accessToken);
        const result = section === "transport" ? summary.footprints.transport.departments : summary.footprints.hostel.departments;
        setFootprints(result);
        if (result.length > 0) {
          setSelectedDept(result[0]?.id ?? null);
        } else {
          setSelectedDept(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load footprints");
      }
    };

    void fetchBySection();
  }, [accessToken, section]);

  if (loading) {
    return <div className="text-center py-8 text-carbon-300">Loading footprints...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-500/40">{error}</div>;
  }

  const selected = footprints.find((f) => f.id === selectedDept);
  const breakdown = selected
    ? [
        { name: "Current Emissions", category: "Current Emissions", value: selected.totalEmissions },
        { name: "Baseline", category: "Baseline", value: selected.baseline },
        { name: "Variance", category: "Variance", value: Math.abs(selected.variance) },
      ]
    : [];

  return (
    <div className="bg-gradient-to-br from-white/8 via-green-500/5 to-emerald-500/4 rounded-2xl shadow-lg p-6 border border-carbon-200 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-carbon-900 mb-6">Department Footprints</h2>

      {footprints.length === 0 ? (
        <div className="text-center py-8 text-carbon-300">No footprint data available</div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSection("transport")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${section === "transport" ? "bg-accent-500 text-carbon-900 font-semibold" : "bg-white/6 text-carbon-700 hover:bg-white/5"}`}
            >
              Campus Transport
            </button>
            <button
              onClick={() => setSection("hostel")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${section === "hostel" ? "bg-accent-500 text-carbon-900 font-semibold" : "bg-white/6 text-carbon-700 hover:bg-white/5"}`}
            >
              Hostels
            </button>
          </div>

          {/* Department Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {footprints.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-300 ${
                  selectedDept === dept.id
                    ? "bg-accent-500 text-carbon-900 font-semibold"
                    : "bg-white/6 text-carbon-700 hover:bg-white/5"
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>

          {/* Chart and Stats */}
          {selected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="flex justify-center">
                {breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={breakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        nameKey="name"
                        label={(props: any) => {
                          const entry = props.payload as (typeof breakdown)[0];
                          return `${entry?.category}: ${entry?.value?.toFixed(2) ?? 0} kg`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {breakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] ?? "#000"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => {
                        if (typeof value === 'number') {
                          return `${value.toFixed(2)} kg CO₂`;
                        }
                        return '0 kg CO₂';
                      }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-carbon-300">No breakdown data</div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3">
                  <div className="bg-white/6 rounded-lg p-4 border border-carbon-200">
                    <p className="text-sm font-medium text-carbon-700 mb-1">Total Emissions</p>
                    <p className="text-2xl font-bold text-carbon-900">
                      {selected.totalEmissions.toFixed(2)} kg CO₂
                    </p>
                    <p className="text-xs text-carbon-600 mt-1">Baseline: {selected.baseline.toFixed(2)} kg CO₂</p>
                    <p className="text-xs text-carbon-600">Variance: {selected.variance.toFixed(2)} kg CO₂</p>
                  </div>

                  <div className="bg-white/6 border border-carbon-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-carbon-800 mb-3">Breakdown by Activity</p>
                    <div className="space-y-2">
                      {breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-carbon-700">{item.category}</span>
                          </div>
                          <span className="font-semibold text-carbon-900">
                            {item.value.toFixed(2)} kg ({selected.totalEmissions > 0 ? ((item.value / selected.totalEmissions) * 100).toFixed(1) : "0.0"}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
