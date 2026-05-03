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
import type {
  ActivityLogResponse,
  DepartmentAnalytics,
  LeaderboardEntry,
  ReferenceData,
} from "../types";

const activityFallback = [
  { activityType: "Electricity", factor: 0.82, unit: "kWh" },
  { activityType: "Water", factor: 0.0003, unit: "L" },
  { activityType: "Fuel", factor: 2.68, unit: "L" },
  { activityType: "Waste", factor: 1.12, unit: "kg" },
];

const chartPalette = ["#45725f", "#e99821", "#b8d3c3", "#244036"];

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
  const [referenceData, setReferenceData] = useState<ReferenceData>({ departments: [], activities: [] });
  const [analytics, setAnalytics] = useState<DepartmentAnalytics[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
        const [refs, analyticsData, leaderboardData] = await Promise.all([
          api.getReferenceData(session.access_token),
          api.getAnalytics(session.access_token),
          api.getLeaderboard(session.access_token),
        ]);

        if (!active) return;

        setReferenceData(refs);
        setAnalytics(analyticsData);
        setLeaderboard(leaderboardData);

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

  const refreshData = async () => {
    const [analyticsData, leaderboardData, refs] = await Promise.all([
      api.getAnalytics(session.access_token),
      api.getLeaderboard(session.access_token),
      api.getReferenceData(session.access_token),
    ]);

    setAnalytics(analyticsData);
    setLeaderboard(leaderboardData);
    setReferenceData(refs);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(69,114,95,0.38),_transparent_38%),linear-gradient(180deg,#0c1715_0%,#13211d_48%,#f3f7f4_48%,#f3f7f4_100%)] text-carbon-900">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-carbon-900/90 p-6 text-white shadow-glow backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-carbon-200/80">TIET Sustainability Ops</p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Carbon Commit Dashboard</h1>
              <p className="max-w-2xl text-sm leading-6 text-carbon-100/80 sm:text-base">
                Monitor department emissions, compare them against baseline quotas, and surface quota breaches in real time.
              </p>
              <p className="text-xs text-carbon-200/70">Signed in as {session.user.email ?? session.user.id}</p>
              {profileSummary ? <p className="text-xs text-carbon-200/60">{profileSummary}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Departments" value={referenceData.departments.length || analytics.length} />
              <StatCard label="Alerts" value={alerts.length} emphasis />
              <StatCard label="Leaderboard" value={leaderboard.length} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
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

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)]">
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
          </section>

          <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)]">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-carbon-900">Emission Trend</h2>
              <p className="text-sm text-carbon-500">Current emissions compared with each department&apos;s baseline quota.</p>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#dde6df" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Current Emissions" radius={[10, 10, 0, 0]}>
                    {chartData.map((_entry, index) => (
                      <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="Baseline Quota" fill="#c7d3cb" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)]">
            <h2 className="text-xl font-semibold text-carbon-900">Real-Time Alerts</h2>
            <p className="mb-4 text-sm text-carbon-500">Departments that have crossed their baseline quota are highlighted here.</p>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((entry) => (
                  <div key={entry.deptId} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">{entry.deptName}</p>
                    <p className="mt-1">
                      Current: {entry.totalEmissions.toFixed(2)} | Baseline: {entry.baseline.toFixed(2)} | Over by: {entry.variance.toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-carbon-100 bg-carbon-50 px-4 py-3 text-sm text-carbon-600">
                  No departments are above their quota yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)]">
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
      </section>

      <ProfilePanel session={session} open={profileOpen} onClose={() => setProfileOpen(false)} />
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
