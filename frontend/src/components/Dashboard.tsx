import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { ToastContainer, type Toast } from "./Toast";
import { ProfilePanel } from "./ProfilePanel";
import { NotificationModal } from "./NotificationModal";
import { ProjectInsights } from "./ProjectInsights";
import { AuditViewer } from "./AuditViewer";
import { ImportModal } from "./ImportModal";
import { KpiGrid } from "./KpiGrid";
import { FootprintChart } from "./FootprintChart";
import { ExportPanel } from "./ExportPanel";
import type {
  ActivityLogResponse,
  DepartmentAnalytics,
  LeaderboardEntry,
  RecentActivityLog,
  ReferenceData,
} from "../types";

// Emission calculation criteria
const emissionCriteria = [
  {
    activity: "Electricity",
    formula: "Units (kWh) × 0.82 kg CO₂/kWh",
    description: "Grid electricity consumption factor based on national average",
  },
  {
    activity: "Water",
    formula: "Units (L) × 0.0003 kg CO₂/L",
    description: "Water treatment and distribution emissions",
  },
  {
    activity: "Fuel",
    formula: "Units (L) × 2.68 kg CO₂/L",
    description: "Combustion emissions from fuel consumption",
  },
  {
    activity: "Waste",
    formula: "Units (kg) × 1.12 kg CO₂/kg",
    description: "Waste processing and disposal emissions",
  },
];

const activityFallback = [
  { activityType: "Electricity", factor: 0.82, unit: "kWh" },
  { activityType: "Water", factor: 0.0003, unit: "L" },
  { activityType: "Fuel", factor: 2.68, unit: "L" },
  { activityType: "Waste", factor: 1.12, unit: "kg" },
];

type Page = "dashboard" | "operations" | "insights";
type OperationsTab = "kpi" | "audit" | "notifications" | "footprint" | "export" | "import";

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
};

type DashboardProps = {
  session: Session;
  onSignOut: () => Promise<void>;
};

export const Dashboard = ({ session, onSignOut }: DashboardProps) => {
  // Navigation
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  // Profile & Notifications panels
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  // Operations tab
  const [activeOperationsTab, setActiveOperationsTab] = useState<OperationsTab>("kpi");

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const addToast = (message: string, type: "success" | "error" | "warning" | "info" = "info", duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load unread notification count
  useEffect(() => {
    let active = true;
    const loadCount = async () => {
      try {
        const result = await api.getNotifications(session.access_token, false);
        if (!active) return;
        setNotificationCount(Array.isArray(result) ? result.length : 0);
      } catch (e) {
        // ignore
      }
    };
    void loadCount();
    return () => {
      active = false;
    };
  }, [session.access_token]);

  // State
  const [referenceData, setReferenceData] = useState<ReferenceData>({ departments: [], activities: [] });
  const [analytics, setAnalytics] = useState<DepartmentAnalytics[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentActivityLog[]>([]);

  // Form state
  const [selectedDeptId, setSelectedDeptId] = useState<number | "">("");
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  const [units, setUnits] = useState<string>("");
  const [submission, setSubmission] = useState<ActivityLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [recentLogsPage, setRecentLogsPage] = useState(0);
  const logsPerPage = 10;

  const activityOptions = referenceData.activities.length > 0 ? referenceData.activities : activityFallback;
  const profileMetadata = session.user.user_metadata as Record<string, unknown> | undefined;
  const profileName = getMetadataValue(profileMetadata, "full_name");
  const profileDepartment = getMetadataValue(profileMetadata, "department");

  // Load initial data
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [refs, analyticsData, leaderboardData, recentLogsData] = await Promise.all([
          api.getReferenceData(session.access_token),
          api.getAnalytics(session.access_token),
          api.getLeaderboard(session.access_token),
          api.getRecentLogs(session.access_token),
        ]);

        if (!active) return;

        setReferenceData(refs);
        setAnalytics(analyticsData);
        setLeaderboard(leaderboardData);
        setRecentLogs(recentLogsData);

        if (refs.departments.length > 0) {
          setSelectedDeptId((current) => (current === "" ? refs.departments[0]!.id : current));
        }

        if (refs.activities.length > 0) {
          setSelectedActivityType((current) => (current === "" ? refs.activities[0]!.activityType : current));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [session.access_token]);

  const alerts = useMemo(() => analytics.filter((entry) => entry.exceedsBaseline), [analytics]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedDeptId === "" || selectedActivityType === "") {
      setError("Select a department and activity type");
      return;
    }

    const parsedUnits = Number(units);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setError("Units must be a positive number");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      const response = await api.submitLog(
        {
          deptId: selectedDeptId,
          activityType: selectedActivityType,
          units: parsedUnits,
        },
        session.access_token,
      );

      setSubmission(response);
      await refreshData();
      setUnits("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshData = async () => {
    try {
      const [analyticsData, leaderboardData, refs, logs] = await Promise.all([
        api.getAnalytics(session.access_token),
        api.getLeaderboard(session.access_token),
        api.getReferenceData(session.access_token),
        api.getRecentLogs(session.access_token),
      ]);

      setAnalytics(analyticsData);
      setLeaderboard(leaderboardData);
      setReferenceData(refs);
      setRecentLogs(logs);
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const paginatedLogs = recentLogs.slice(recentLogsPage * logsPerPage, (recentLogsPage + 1) * logsPerPage);
  const totalPages = Math.ceil(recentLogs.length / logsPerPage);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-carbon-900 via-carbon-800 to-carbon-700">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Loading Carbon Commit Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-900 via-carbon-800 to-carbon-700">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Header */}
      <header className="border-b border-carbon-700 bg-carbon-800/80 backdrop-blur-sm shadow-lg sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center text-carbon-900 font-bold">
                CC
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Carbon Commit</h1>
                <p className="text-xs text-carbon-300">TIET Sustainability Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-carbon-200">
                <span>{session.user.email}</span>
                {profileName && <span className="text-carbon-500">•</span>}
                {profileName && <span className="font-medium text-carbon-100">{profileName}</span>}
              </div>

              <div className="flex gap-2 relative">
                <button
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                  className="relative px-3 py-2 rounded-2xl bg-carbon-700/40 text-carbon-100 hover:bg-carbon-600/60 font-medium text-sm transition-all duration-200 border border-carbon-600/30"
                >
                  🔔 Notifications
                  {notificationCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="px-3 py-2 rounded-2xl bg-carbon-700/40 text-carbon-100 hover:bg-carbon-600/60 font-medium text-sm transition-all duration-200 border border-carbon-600/30"
                >
                  👤 Profile
                </button>
                <button
                  onClick={() => void onSignOut()}
                  className="px-3 py-2 rounded-2xl bg-carbon-700/40 text-carbon-100 hover:bg-carbon-600/60 font-medium text-sm transition-all duration-200 border border-carbon-600/30"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Panel - Modal */}
      <ProfilePanel session={session} open={profileOpen} onClose={() => setProfileOpen(false)} onSaveSuccess={(msg) => addToast(msg, "success")} />

      {/* Notification Modal */}
      <NotificationModal open={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} accessToken={session.access_token} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Navigation */}
        <div className="mb-6 flex gap-2 border-b border-carbon-700 overflow-x-auto pb-4">
          {(["dashboard", "operations", "insights"] as const).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-3 font-medium border-b-2 transition-all duration-300 whitespace-nowrap ${
                currentPage === page
                  ? "border-accent-400 text-accent-300 bg-carbon-700/40"
                  : "border-transparent text-carbon-300 hover:text-carbon-200"
              }`}
            >
              {page === "dashboard" && "📊 Dashboard"}
              {page === "operations" && "⚙️ Operations Console"}
              {page === "insights" && "🔍 Insights"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-red-300 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Dashboard Page - Animated */}
        {currentPage === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Departments" value={referenceData.departments.length} color="blue" />
              <StatCard label="Active Alerts" value={alerts.length} color="red" />
              <StatCard label="Leaderboard" value={leaderboard.length} color="green" />
              <StatCard label="Recent Logs" value={recentLogs.length} color="purple" />
            </div>

            {/* Emission Criteria */}
            <div className="rounded-xl border border-carbon-700 bg-gradient-to-br from-carbon-800/50 to-carbon-700/50 p-6 shadow-lg backdrop-blur-sm hover:border-carbon-600 transition-colors duration-300">
              <h2 className="text-xl font-bold text-accent-400 mb-4">📐 Carbon Emission Calculation Criteria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emissionCriteria.map((item) => (
                  <div key={item.activity} className="border border-carbon-700 rounded-lg p-4 bg-gradient-to-br from-carbon-800/30 to-carbon-700/30 hover:border-accent-500/50 transition-all duration-300 transform hover:scale-105">
                    <p className="font-semibold text-accent-300 mb-1">{item.activity}</p>
                    <p className="text-sm font-mono text-accent-400 bg-carbon-900/50 p-2 rounded mb-2">{item.formula}</p>
                    <p className="text-xs text-carbon-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Entry Form */}
            <div className="rounded-xl border border-carbon-700 bg-gradient-to-br from-carbon-800/50 to-carbon-700/50 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="text-xl font-bold text-accent-400 mb-4">📝 Record Activity</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-carbon-200 mb-2">Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-carbon-600 bg-carbon-700/50 text-white rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="">Select department</option>
                    {referenceData.departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-carbon-200 mb-2">Activity Type</label>
                  <select
                    value={selectedActivityType}
                    onChange={(e) => setSelectedActivityType(e.target.value)}
                    className="w-full px-4 py-2 border border-carbon-600 bg-carbon-700/50 text-white rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="">Select activity</option>
                    {activityOptions.map((act) => (
                      <option key={act.activityType} value={act.activityType}>
                        {act.activityType}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-carbon-200 mb-2">
                    Units ({selectedActivityType ? activityOptions.find((a) => a.activityType === selectedActivityType)?.unit : "units"})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-carbon-600 bg-carbon-700/50 text-white rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 placeholder-carbon-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-carbon-900 font-bold rounded-lg hover:from-accent-600 hover:to-accent-700 disabled:opacity-60 transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    {submitting ? "Recording..." : "Record Activity"}
                  </button>
                </div>
              </form>

              {submission && (
                <div className={`mt-4 p-4 rounded-lg border transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${submission.exceedsBaseline ? "bg-red-950/50 border-red-500/40" : "bg-carbon-700/50 border-accent-500/40"}`}>
                  <p className={`font-semibold ${submission.exceedsBaseline ? "text-red-400" : "text-accent-400"}`}>
                    {submission.exceedsBaseline ? "⚠️ Alert" : "✓ Recorded"}
                  </p>
                  <p className={`text-sm mt-1 ${submission.exceedsBaseline ? "text-red-300" : "text-accent-300"}`}>
                    CO₂e: {submission.co2Result.toFixed(2)} kg | Total: {submission.totalEmissions.toFixed(2)} kg
                  </p>
                </div>
              )}
            </div>

            {/* Recent Logs - Paginated */}
            <div className="rounded-xl border border-carbon-700 bg-gradient-to-br from-carbon-800/50 to-carbon-700/50 p-6 shadow-lg backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-accent-400">📋 Recent Insertions</h2>
                <button
                  onClick={() => void refreshData()}
                  className="px-3 py-1 bg-carbon-700/50 text-carbon-200 rounded-lg hover:bg-carbon-600/50 text-sm font-medium transition-all duration-300 border border-carbon-600/50"
                >
                  🔄 Refresh
                </button>
              </div>

              {recentLogs.length === 0 ? (
                <p className="text-carbon-300 text-center py-8">No recent logs</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-carbon-800/50 border-b border-carbon-700">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-carbon-200">Department</th>
                          <th className="px-4 py-2 text-left font-semibold text-carbon-200">Activity</th>
                          <th className="px-4 py-2 text-right font-semibold text-carbon-200">Units</th>
                          <th className="px-4 py-2 text-right font-semibold text-carbon-200">CO₂ (kg)</th>
                          <th className="px-4 py-2 text-left font-semibold text-carbon-200">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLogs.map((log) => (
                          <tr key={log.id} className="border-b border-carbon-700 hover:bg-carbon-800/30 transition-colors duration-200">
                            <td className="px-4 py-2 text-carbon-200">{log.deptName}</td>
                            <td className="px-4 py-2 text-carbon-300">{log.activityType}</td>
                            <td className="px-4 py-2 text-right text-carbon-300">{log.units.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-accent-400">{log.co2Result.toFixed(2)}</td>
                            <td className="px-4 py-2 text-carbon-400 text-xs">{new Date(log.timestamp).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => setRecentLogsPage(Math.max(0, recentLogsPage - 1))}
                      disabled={recentLogsPage === 0}
                      className="px-3 py-1 bg-carbon-700/50 text-carbon-200 rounded-lg hover:bg-carbon-600/50 disabled:opacity-50 text-sm font-medium transition-all duration-300 border border-carbon-600/50"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm text-carbon-300">
                      Page {recentLogsPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setRecentLogsPage(Math.min(totalPages - 1, recentLogsPage + 1))}
                      disabled={recentLogsPage >= totalPages - 1}
                      className="px-3 py-1 bg-carbon-700/50 text-carbon-200 rounded-lg hover:bg-carbon-600/50 disabled:opacity-50 text-sm font-medium transition-all duration-300 border border-carbon-600/50"
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Leaderboard - Paginated */}
            <div className="rounded-xl border border-carbon-700 bg-gradient-to-br from-carbon-800/50 to-carbon-700/50 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="text-xl font-bold text-accent-400 mb-4">🏆 Leaderboard</h2>
              {leaderboard.length === 0 ? (
                <p className="text-carbon-300 text-center py-8">No leaderboard data</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((entry) => (
                    <div key={entry.deptId} className="flex items-center justify-between p-3 bg-carbon-800/30 rounded-lg border border-carbon-700 hover:border-carbon-600 transition-all duration-300 hover:bg-carbon-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-carbon-400 w-6">#{entry.rank}</span>
                        <div>
                          <p className="font-semibold text-carbon-100">{entry.deptName}</p>
                          <p className="text-xs text-carbon-400">{entry.totalEmissions.toFixed(2)} kg CO₂</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-300 ${entry.exceedsBaseline ? "bg-red-950/60 text-red-300 border border-red-700/40" : "bg-carbon-700/60 text-accent-300 border border-accent-500/40"}`}>
                        {entry.exceedsBaseline ? "Over" : "Under"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Operations Console Page - Animated */}
        {currentPage === "operations" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Operations Tabs */}
            <div className="flex gap-2 border-b border-carbon-700 overflow-x-auto pb-4">
              {(["kpi", "audit", "footprint", "export", "import"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveOperationsTab(tab)}
                  className={`px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-all duration-300 ${
                    activeOperationsTab === tab
                      ? "border-accent-400 text-accent-400 bg-carbon-700/40"
                      : "border-transparent text-carbon-300 hover:text-carbon-200"
                  }`}
                >
                  {tab === "kpi" && "📊 KPIs"}
                  {tab === "audit" && "📋 Audit Logs"}
                  {tab === "footprint" && "🌍 Footprints"}
                  {tab === "export" && "📥 Export"}
                  {tab === "import" && "📤 Import"}
                </button>
              ))}
            </div>

            <div className="bg-carbon-800/50 rounded-xl border border-carbon-700 shadow-lg p-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeOperationsTab === "kpi" && <KpiGrid accessToken={session.access_token} />}
              {activeOperationsTab === "audit" && <AuditViewer accessToken={session.access_token} />}
              
              {activeOperationsTab === "footprint" && <FootprintChart accessToken={session.access_token} />}
              {activeOperationsTab === "export" && <ExportPanel accessToken={session.access_token} />}
              {activeOperationsTab === "import" && (
                <div>
                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-carbon-900 rounded-lg hover:from-accent-600 hover:to-accent-700 font-medium transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    + Import CSV
                  </button>
                  <ImportModal
                    accessToken={session.access_token}
                    isOpen={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    onSuccess={() => void refreshData()}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insights Page - Animated */}
        {currentPage === "insights" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <ProjectInsights />
          </div>
        )}
      </main>
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, color }: { label: string; value: number; color: "blue" | "red" | "green" | "purple" }) => {
  const colors = {
    blue: "from-carbon-800/60 to-carbon-700/40 border-carbon-600/50 text-accent-300",
    red: "from-carbon-800/60 to-carbon-700/40 border-carbon-600/50 text-accent-300",
    green: "from-carbon-800/60 to-carbon-700/40 border-carbon-600/50 text-accent-300",
    purple: "from-carbon-800/60 to-carbon-700/40 border-carbon-600/50 text-accent-300",
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${colors[color]} p-6 shadow-lg backdrop-blur-sm hover:scale-105 transition-all duration-300 transform`}>
      <p className="text-sm font-medium opacity-75 text-carbon-200">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
};
