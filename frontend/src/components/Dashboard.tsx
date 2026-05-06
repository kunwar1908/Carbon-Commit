import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { ProfilePanel } from "./ProfilePanel";
import { ProjectInsights } from "./ProjectInsights";
import { AuditViewer } from "./AuditViewer";
import { NotificationInbox } from "./NotificationInbox";
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

const activityFallback = [
  { activityType: "Electricity", factor: 0.82, unit: "kWh" },
  { activityType: "Water", factor: 0.0003, unit: "L" },
  { activityType: "Fuel", factor: 2.68, unit: "L" },
  { activityType: "Waste", factor: 1.12, unit: "kg" },
];

const chartPalette = ["#45725f", "#e99821", "#b8d3c3", "#244036"];

const dataFlowSteps = [
  {
    title: "Dashboard form",
    detail: "The user selects a department, an activity type, and the number of units to record.",
  },
  {
    title: "Client validation",
    detail: "The frontend blocks missing fields and rejects zero or negative unit values before submit.",
  },
  {
    title: "Authenticated request",
    detail: "The browser posts the payload to the backend with the Supabase access token attached.",
  },
  {
    title: "Bearer token check",
    detail: "`requireAuth` verifies the Supabase JWT and resolves the signed-in user.",
  },
  {
    title: "Profile sync",
    detail: "The activity service upserts a matching `user_profiles` row for that auth UUID.",
  },
  {
    title: "Prisma insert",
    detail: "The backend writes the row into `activity_logs` together with the computed CO2e value.",
  },
  {
    title: "Database automation",
    detail: "Triggers and functions refresh the analytics cache and keep audit data aligned.",
  },
  {
    title: "Dashboard refresh",
    detail: "The UI reloads analytics, leaderboard data, and shows the saved log immediately.",
  },
] as const;

type NotificationTone = "critical" | "warning" | "success" | "info";

type NotificationItem = {
  id: string;
  tone: NotificationTone;
  title: string;
  detail: string;
  meta: string;
};

const notificationStyles: Record<NotificationTone, { wrapper: string; badge: string }> = {
  critical: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-950",
    badge: "bg-amber-400/15 text-amber-900",
  },
  warning: {
    wrapper: "border-carbon-100 bg-carbon-50 text-carbon-800",
    badge: "bg-carbon-100 text-carbon-700",
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-carbon-800",
    badge: "bg-emerald-500/10 text-carbon-700",
  },
  info: {
    wrapper: "border-carbon-100 bg-white text-carbon-800",
    badge: "bg-carbon-900 text-white",
  },
};

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
};

type DashboardProps = {
  session: Session;
  onSignOut: () => Promise<void>;
};

export const Dashboard = ({ session, onSignOut }: DashboardProps) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [activeOperationsTab, setActiveOperationsTab] = useState<"kpi" | "audit" | "notifications" | "footprint" | "export" | "import">("kpi");
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [referenceData, setReferenceData] = useState<ReferenceData>({ departments: [], activities: [] });
  const [analytics, setAnalytics] = useState<DepartmentAnalytics[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentActivityLog[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | "">("");
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  const [units, setUnits] = useState<string>("");
  const [submission, setSubmission] = useState<ActivityLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const activityOptions = referenceData.activities.length > 0 ? referenceData.activities : activityFallback;
  const profileMetadata = session.user.user_metadata as Record<string, unknown> | undefined;
  const profileName = getMetadataValue(profileMetadata, "full_name");
  const profileDepartment = getMetadataValue(profileMetadata, "department");
  const profileSummary = [profileName, profileDepartment].filter(Boolean).join(" · ");

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
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
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

  const chartData = analytics.map((entry) => ({
    name: entry.deptName,
    "Current Emissions": entry.totalEmissions,
    "Baseline Quota": entry.baseline,
  }));

  const trendChartHeight = Math.max(560, chartData.length * 58);

  const notificationFeed = useMemo<NotificationItem[]>(() => {
    const feed: NotificationItem[] = [
      {
        id: "pipeline-ready",
        tone: "info",
        title: "Realtime analytics pipeline ready",
        detail: "A successful submit flows from the browser to Prisma, then refreshes analytics and leaderboard data.",
        meta: `${referenceData.departments.length || analytics.length} departments tracked`,
      },
    ];

    if (submission) {
      feed.unshift({
        id: `submission-${submission.deptId}-${submission.activityType}`,
        tone: submission.exceedsBaseline ? "critical" : "success",
        title: submission.exceedsBaseline
          ? `${submission.deptName} crossed the quota line`
          : `${submission.deptName} recorded successfully`,
        detail: `CO2e ${submission.co2Result.toFixed(2)} from ${submission.activityType} (${submission.units.toFixed(2)} units).`,
        meta: submission.exceedsBaseline
          ? `Over by ${Math.abs(submission.totalEmissions - submission.baseline).toFixed(2)}`
          : `Under by ${(submission.baseline - submission.totalEmissions).toFixed(2)}`,
      });
    }

    for (const alert of alerts) {
      feed.push({
        id: `alert-${alert.deptId}`,
        tone: "critical",
        title: `${alert.deptName} needs review`,
        detail: `Current ${alert.totalEmissions.toFixed(2)} vs baseline ${alert.baseline.toFixed(2)}.`,
        meta: `Over by ${alert.variance.toFixed(2)}`,
      });
    }

    return feed.slice(0, 5);
  }, [alerts, analytics.length, referenceData.departments.length, submission]);

  const visibleNotifications = useMemo(
    () => notificationFeed.filter((item) => !dismissedNotificationIds.includes(item.id)),
    [dismissedNotificationIds, notificationFeed],
  );

  const refreshData = async () => {
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedDeptId === "" || selectedActivityType === "") {
      setError("Select a department and activity type before submitting.");
      return;
    }

    const parsedUnits = Number(units);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setError("Units must be a positive number.");
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
      setError(submitError instanceof Error ? submitError.message : "Failed to submit activity log.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-carbon-900 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm tracking-wide text-white/70 shadow-glow backdrop-blur">
          Loading campus sustainability dashboard...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(69,114,95,0.34),_transparent_34%),linear-gradient(180deg,#07100f_0%,#11201c_38%,#f3f7f4_38%,#f7faf8_100%)] text-carbon-900">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-carbon-900/88 p-6 text-white shadow-glow backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.32em] text-carbon-100/75">
                TIET Sustainability Ops
              </div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Carbon Commit Dashboard</h1>
              <p className="max-w-2xl text-sm leading-6 text-carbon-100/82 sm:text-base">
                Monitor department emissions, compare them against baseline quotas, and surface quota breaches in real time.
              </p>
              <p className="text-xs text-carbon-200/70">Signed in as {session.user.email ?? session.user.id}</p>
              {profileSummary ? <p className="text-xs text-carbon-200/60">{profileSummary}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <StatCard label="Departments" value={referenceData.departments.length || analytics.length} />
              <StatCard label="Alerts" value={alerts.length} emphasis />
              <StatCard label="Leaderboard" value={leaderboard.length} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setNotificationPanelOpen((current) => !current)}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Notifications ({visibleNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sign Out
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">{error}</div>
        ) : null}

        {notificationPanelOpen ? (
          <section className="rounded-[2rem] border border-carbon-100 bg-white p-5 shadow-[0_24px_80px_rgba(12,23,21,0.08)] ring-1 ring-black/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-carbon-900">Notification Center</h2>
                <p className="text-sm text-carbon-500">Quick alerts from your latest submissions and department quotas.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-carbon-100 px-3 py-1 text-xs font-medium text-carbon-700">{visibleNotifications.length} visible</span>
                {visibleNotifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setDismissedNotificationIds(notificationFeed.map((item) => item.id))}
                    className="rounded-2xl border border-carbon-200 bg-white px-4 py-2 text-sm font-medium text-carbon-800 transition hover:bg-carbon-50"
                  >
                    Dismiss all
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((item) => {
                  const style = notificationStyles[item.tone];

                  return (
                    <article key={item.id} className={`rounded-2xl border px-4 py-4 text-sm ${style.wrapper}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${style.badge}`}>
                            {item.tone}
                          </div>
                          <p className="text-base font-semibold">{item.title}</p>
                          <p className="leading-6 text-carbon-700">{item.detail}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xs uppercase tracking-[0.28em] text-carbon-500">{item.meta}</p>
                          <button
                            type="button"
                            onClick={() => setDismissedNotificationIds((current) => [...current, item.id])}
                            className="rounded-full border border-carbon-200 bg-white px-3 py-1 text-xs font-medium text-carbon-700 transition hover:bg-carbon-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-carbon-100 bg-carbon-50 px-4 py-3 text-sm text-carbon-600">
                  No visible notifications right now.
                </div>
              )}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)] ring-1 ring-black/5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-carbon-900">Data Entry</h2>
                <p className="text-sm text-carbon-500">Submit a department activity and compute CO2e automatically.</p>
              </div>
              <span className="rounded-full bg-carbon-100 px-3 py-1 text-xs font-medium text-carbon-700">Prisma guarded</span>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <FieldLabel label="Department">
                <select
                  value={selectedDeptId}
                  onChange={(event) => setSelectedDeptId(Number(event.target.value))}
                  className="w-full rounded-2xl border border-carbon-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-carbon-400"
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {referenceData.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              <FieldLabel label="Activity Type">
                <select
                  value={selectedActivityType}
                  onChange={(event) => setSelectedActivityType(event.target.value)}
                  className="w-full rounded-2xl border border-carbon-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-carbon-400"
                >
                  <option value="" disabled>
                    Select activity type
                  </option>
                  {activityOptions.map((activity) => (
                    <option key={activity.activityType} value={activity.activityType}>
                      {activity.activityType}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              <FieldLabel
                label={`Units (${selectedActivityType ? activityOptions.find((activity) => activity.activityType === selectedActivityType)?.unit ?? "units" : "units"})`}
                className="md:col-span-2"
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={units}
                  onChange={(event) => setUnits(event.target.value)}
                  placeholder="Enter units consumed"
                  className="w-full rounded-2xl border border-carbon-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-carbon-400"
                />
              </FieldLabel>

              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-carbon-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-carbon-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Record Activity"}
                </button>
                <p className="text-xs text-carbon-500">
                  Invalid or negative units are rejected before the insert, matching the database constraints.
                </p>
              </div>
            </form>

            {submission ? (
              <div
                className={`mt-6 rounded-2xl border px-4 py-4 text-sm ${submission.exceedsBaseline ? "border-amber-200 bg-amber-50 text-amber-900" : "border-carbon-100 bg-carbon-50 text-carbon-800"}`}
              >
                <p className="font-semibold">Latest log for {submission.deptName}</p>
                <p className="mt-1">
                  CO2e: {submission.co2Result.toFixed(2)} | Total: {submission.totalEmissions.toFixed(2)} | Baseline: {submission.baseline.toFixed(2)}
                </p>
                {submission.exceedsBaseline ? <p className="mt-1 font-medium">Baseline exceeded. Management alert should be raised.</p> : null}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-carbon-100 bg-carbon-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-carbon-900">Recent Insertions & Emissions</h3>
                <button
                  type="button"
                  onClick={() => void refreshData()}
                  className="rounded-full border border-carbon-200 bg-white px-3 py-1 text-xs font-medium text-carbon-700 transition hover:bg-carbon-50"
                >
                  Refresh
                </button>
              </div>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-carbon-600">No recent activity logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-carbon-100 bg-white px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-carbon-900">
                          {log.deptName} · {log.activityType}
                        </p>
                        <p className="text-xs text-carbon-500">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-carbon-700">
                        Units: {log.units.toFixed(2)} · Emissions: {log.co2Result.toFixed(2)} kg CO₂
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)] ring-1 ring-black/5">
            <h2 className="text-xl font-semibold text-carbon-900">Leaderboard</h2>
            <p className="mb-4 text-sm text-carbon-500">Lowest carbon footprint first.</p>
            <div className="overflow-hidden rounded-2xl border border-carbon-100">
              <table className="min-w-full divide-y divide-carbon-100 text-sm">
                <thead className="bg-carbon-50 text-carbon-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Rank</th>
                    <th className="px-4 py-3 text-left font-medium">Department</th>
                    <th className="px-4 py-3 text-left font-medium">Emissions</th>
                    <th className="px-4 py-3 text-left font-medium">Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-carbon-100 bg-white text-carbon-700">
                  {leaderboard.map((entry) => (
                    <tr key={entry.deptId} className={entry.exceedsBaseline ? "bg-amber-50/60" : ""}>
                      <td className="px-4 py-3 font-semibold text-carbon-900">{entry.rank}</td>
                      <td className="px-4 py-3">{entry.deptName}</td>
                      <td className="px-4 py-3">{entry.totalEmissions.toFixed(2)}</td>
                      <td className="px-4 py-3">{entry.baseline.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="min-w-0 rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)] ring-1 ring-black/5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-carbon-900">Emission Trend</h2>
              <p className="text-sm text-carbon-500">Each department is rendered on its own row so the current load and baseline stay readable.</p>
            </div>
            <span className="rounded-full bg-carbon-100 px-3 py-1 text-xs font-medium text-carbon-700">Vertical department view</span>
          </div>

          <div className="overflow-x-auto rounded-[1.75rem] border border-carbon-100 bg-carbon-50/70 p-4">
            <div className="w-full" style={{ minWidth: "860px", height: `${trendChartHeight}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 24, left: 24, bottom: 10 }} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#dde6df" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={190} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Baseline Quota" fill="#c7d3cb" radius={[0, 10, 10, 0]} barSize={18} />
                  <Bar dataKey="Current Emissions" radius={[0, 10, 10, 0]} barSize={18}>
                    {chartData.map((_entry, index) => (
                      <Cell key={index} fill={chartPalette[index % chartPalette.length] ?? chartPalette[0]!} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)] ring-1 ring-black/5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-carbon-900">Data Flow Visualization</h2>
              <p className="text-sm text-carbon-500">This is the exact submit path from the browser form to the refreshed dashboard state.</p>
            </div>
            <span className="rounded-full bg-carbon-100 px-3 py-1 text-xs font-medium text-carbon-700">Submit pipeline</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dataFlowSteps.map((step, index) => (
              <article key={step.title} className="relative rounded-[1.75rem] border border-carbon-100 bg-carbon-50/70 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-carbon-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  {index < dataFlowSteps.length - 1 ? <span className="text-xs uppercase tracking-[0.28em] text-carbon-500">Flow</span> : null}
                </div>
                <h3 className="text-base font-semibold text-carbon-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-carbon-600">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <ProjectInsights />

        {/* Operations Console */}
        <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)] ring-1 ring-black/5">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-carbon-900">Operations Console</h2>
              <p className="text-sm text-carbon-500">Audit logs, notifications, KPIs, exports, and more.</p>
            </div>
            <button
              onClick={() => setImportModalOpen(true)}
              className="rounded-2xl bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              + Import CSV
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 flex flex-wrap gap-2 border-b border-carbon-100 pb-4">
            {["kpi", "audit", "notifications", "footprint", "export", "import"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveOperationsTab(tab as typeof activeOperationsTab)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeOperationsTab === tab
                    ? "bg-carbon-900 text-white"
                    : "bg-carbon-50 text-carbon-700 hover:bg-carbon-100"
                }`}
              >
                {tab === "kpi" && "KPIs"}
                {tab === "audit" && "Audit"}
                {tab === "notifications" && "Notifications"}
                {tab === "footprint" && "Footprints"}
                {tab === "export" && "Export"}
                {tab === "import" && "Import"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeOperationsTab === "kpi" && <KpiGrid accessToken={session.access_token} />}
            {activeOperationsTab === "audit" && <AuditViewer accessToken={session.access_token} />}
            {activeOperationsTab === "notifications" && <NotificationInbox accessToken={session.access_token} />}
            {activeOperationsTab === "footprint" && <FootprintChart accessToken={session.access_token} />}
            {activeOperationsTab === "export" && <ExportPanel accessToken={session.access_token} />}
            {activeOperationsTab === "import" && (
              <div className="text-center py-8 text-gray-600">
                Click "Import CSV" button above to upload activity logs
              </div>
            )}
          </div>
        </section>
      </section>

      <ImportModal
        accessToken={session.access_token}
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          refreshData();
        }}
      />
    </main>
  );
};

type FieldLabelProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const FieldLabel = ({ label, children, className }: FieldLabelProps) => (
  <label className={className}>
    <span className="mb-2 block text-sm font-medium text-carbon-700">{label}</span>
    {children}
  </label>
);

type StatCardProps = {
  label: string;
  value: number;
  emphasis?: boolean;
};

const StatCard = ({ label, value, emphasis = false }: StatCardProps) => (
  <div className={`rounded-3xl border px-4 py-3 ${emphasis ? "border-amber-400/40 bg-amber-400/15" : "border-white/10 bg-white/5"}`}>
    <p className="text-xs uppercase tracking-[0.28em] text-white/55">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
  </div>
);
