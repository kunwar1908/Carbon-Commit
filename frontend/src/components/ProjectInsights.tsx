import type { ReactNode } from "react";

const schemaTables = [
  { name: "user_profiles", purpose: "Stores user metadata, roles, department links, and profile settings." },
  { name: "dept_master", purpose: "Defines departments, baseline usage, and ownership metadata." },
  { name: "emission_ref", purpose: "Holds the emission factor lookup table used during CO2e calculation." },
  { name: "activity_logs", purpose: "Primary fact table for submitted campus sustainability activity." },
  { name: "audit_logs", purpose: "Immutable trail of who changed what, when, and from where." },
  { name: "analytics_cache", purpose: "Precomputed totals for fast dashboard and leaderboard rendering." },
  { name: "notifications", purpose: "Stores quota alerts, confirmations, and system notices." },
  { name: "admin_actions", purpose: "Tracks elevated admin operations and review events." },
];

const schemaFunctions = [
  {
    name: "update_analytics_cache()",
    summary: "Rebuilds department totals after activity changes so charts and rankings stay fresh.",
    usedBy: "Called after activity writes and cache refresh jobs.",
  },
  {
    name: "get_leaderboard_data()",
    summary: "Returns ranking rows with emissions, baseline variance, and display labels.",
    usedBy: "Consumed by the dashboard leaderboard and analytics views.",
  },
  {
    name: "get_department_analytics()",
    summary: "Aggregates department performance for KPI cards and trend summaries.",
    usedBy: "Used by the dashboard and insights panels.",
  },
  {
    name: "log_audit_action()",
    summary: "Writes a normalized audit entry for inserts, updates, deletes, and profile changes.",
    usedBy: "Invoked by triggers and security-sensitive mutations.",
  },
  {
    name: "notify_baseline_exceeded()",
    summary: "Creates alerts when a department crosses its baseline quota.",
    usedBy: "Called when emissions surpass the configured threshold.",
  },
];

const schemaTriggers = [
  {
    name: "activity_logs_update_analytics_trigger",
    firesOn: "After insert or update on activity_logs",
    effect: "Refreshes analytics cache rows immediately after a log changes.",
  },
  {
    name: "activity_logs_audit_trigger",
    firesOn: "After insert, update, or delete on activity_logs",
    effect: "Records a compliance-friendly audit entry for the mutation.",
  },
  {
    name: "user_profiles_audit_trigger",
    firesOn: "After profile updates",
    effect: "Keeps a history of identity and role changes for admin review.",
  },
  {
    name: "notifications_update_read_at_trigger",
    firesOn: "When notification status changes to read",
    effect: "Back-fills read timestamps so the inbox stays queryable and accurate.",
  },
];

const automationSteps = [
  "A user submits an activity from the dashboard form.",
  "The backend calculates CO2e using emission_ref and writes activity_logs.",
  "Database triggers refresh analytics_cache and create audit_logs entries.",
  "The leaderboard, KPI cards, and notifications read the updated cache.",
];

const demoScope = [
  "Computer Science and Engineering",
  "Electronics and Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Hostel and Residential Services",
  "Campus Transport and Logistics",
  "Library and Learning Resources",
  "Canteen and Dining Services",
  "Sports and Recreation",
];

const roadmapItems = [
  "Audit log viewer for admins with filtering by entity and date range.",
  "Notification inbox for quota breaches, approvals, and reminders.",
  "Bulk CSV import for historical logs and department onboarding.",
  "PDF and CSV export for compliance reports and presentations.",
  "Role-based KPIs for admins, managers, and department owners.",
  "Campus transport and hostel-specific footprint dashboards.",
];

export const ProjectInsights = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-carbon-200 bg-gradient-to-br from-slate-50/6 via-cyan-500/5 to-teal-500/4 p-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-accent-600 mb-2">📊 Project Architecture & Insights</h2>
        <p className="text-carbon-700 text-lg">A documentation-style view of the schema, triggers, functions, and demo coverage behind Carbon Commit.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="📋 Tables" value="8" color="emerald" />
        <StatCard label="⚙️ Functions" value="5" color="blue" />
        <StatCard label="🔗 Triggers" value="4" color="purple" />
        <StatCard label="🔐 RLS Policies" value="10+" color="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <InfoCard
          title="Database Tables"
          icon="🗄️"
          summary="The tables below are the core nouns of the platform: identity, departments, emissions, logs, and alerts."
          color="emerald"
        >
          <div className="space-y-3">
            {schemaTables.map((table, index) => (
              <div key={table.name} className="rounded-xl border border-carbon-200 bg-white/6 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-carbon-900">{table.name}</p>
                    <p className="text-sm text-carbon-700">{table.purpose}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard
          title="Automation Layer"
          icon="⚡"
          summary="Functions perform the work; triggers decide when that work runs. Together they keep derived data and compliance records in sync."
          color="blue"
        >
          <div className="space-y-6">
            <DocBlock
              title="Functions"
              intro="Reusable database routines that compute or persist derived state."
            >
              {schemaFunctions.map((item) => (
                <div key={item.name} className="rounded-xl border border-carbon-200 bg-white/6 px-4 py-3">
                  <p className="font-mono text-sm font-semibold text-carbon-900">{item.name}</p>
                  <p className="mt-1 text-sm text-carbon-700">{item.summary}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-carbon-600">{item.usedBy}</p>
                </div>
              ))}
            </DocBlock>

            <DocBlock
              title="Triggers"
              intro="Automatic hooks that fire after database writes and keep secondary data current."
            >
              {schemaTriggers.map((item) => (
                <div key={item.name} className="rounded-xl border border-carbon-200 bg-white/6 px-4 py-3">
                  <p className="font-mono text-sm font-semibold text-carbon-900">{item.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-carbon-600">{item.firesOn}</p>
                  <p className="mt-2 text-sm text-carbon-700">{item.effect}</p>
                </div>
              ))}
            </DocBlock>
          </div>
        </InfoCard>

        <InfoCard
          title="Automation Flow"
          icon="🔁"
          summary="This is the actual execution order the app follows after a user submits or edits activity data."
          color="purple"
        >
          <div className="space-y-3">
            {automationSteps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-carbon-200 bg-white/6 px-4 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-bold text-purple-700">
                  {index + 1}
                </div>
                <p className="text-sm text-carbon-700">{step}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard
          title="Campus Demo Dataset"
          icon="🏫"
          summary="The demo dataset mirrors campus operations so the dashboard can show realistic numbers immediately after seeding."
          color="purple"
        >
          <div className="grid grid-cols-2 gap-2">
            {demoScope.map((dept) => (
              <div key={dept} className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 transition-colors duration-300 hover:border-purple-300">
                <p className="text-sm text-purple-700">{dept}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard
          title="Product Roadmap"
          icon="🚀"
          summary="A documentation-style view of where the platform can grow next."
          color="amber"
        >
          <div className="space-y-3">
            {roadmapItems.map((item, i) => (
              <div key={item} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-carbon-700 text-sm pt-1">{item}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 backdrop-blur-sm">
        <h3 className="mb-2 text-2xl font-bold text-emerald-400">🔄 System Architecture Flow</h3>
        <p className="mb-6 text-sm text-slate-300">The app is layered so the UI stays thin, the services stay testable, and the database keeps the expensive work close to the data.</p>
        <div className="space-y-4">
          <ArchitectureBox title="Frontend (React + TypeScript)" color="blue" items={["Dashboard", "Operations Console", "Insights Page"]} />
          <Arrow />
          <ArchitectureBox title="API Layer (Express + Zod)" color="purple" items={["Authentication", "Data Validation", "Error Handling"]} />
          <Arrow />
          <ArchitectureBox title="Business Logic (Services)" color="emerald" items={["Analytics", "Audit Logs", "Notifications", "PDF/CSV Export"]} />
          <Arrow />
          <ArchitectureBox title="Database (PostgreSQL + Prisma)" color="amber" items={["Tables", "Functions", "Triggers", "RLS Policies"]} />
          <Arrow />
          <ArchitectureBox title="Authentication (Supabase)" color="red" items={["JWT Tokens", "User Management", "Role-Based Access"]} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Total Endpoints" value="15+" description="REST API endpoints covering all operations" icon="📡" />
        <SummaryCard title="Database Queries" value="50+" description="Optimized queries with caching layer" icon="🔍" />
        <SummaryCard title="Active Features" value="12+" description="Core features with role-based access control" icon="✨" />
      </div>
    </div>
  );
};

type StatCardProps = {
  label: string;
  value: string;
  color: "emerald" | "blue" | "purple" | "amber";
};

const StatCard = ({ label, value, color }: StatCardProps) => {
  const colors = {
    emerald: "from-emerald-950/60 to-emerald-900/40 border-emerald-700/50 text-emerald-400",
    blue: "from-blue-950/60 to-blue-900/40 border-blue-700/50 text-blue-400",
    purple: "from-purple-950/60 to-purple-900/40 border-purple-700/50 text-purple-400",
    amber: "from-amber-950/60 to-amber-900/40 border-amber-700/50 text-amber-400",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors[color]} p-5 hover:scale-105 transition-all duration-300`}>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
};

type InfoCardProps = {
  title: string;
  icon: string;
  summary: string;
  children: ReactNode;
  color: "emerald" | "blue" | "purple" | "amber";
};

const InfoCard = ({ title, icon, summary, children, color }: InfoCardProps) => {
  return (
    <article className={`rounded-2xl border border-carbon-200 bg-white/6 p-6 backdrop-blur-sm hover:border-carbon-300 transition-all duration-300`}>
      <h3 className="text-xl font-bold text-accent-600 mb-1">{icon} {title}</h3>
      <p className="text-sm text-carbon-700 mb-4">{summary}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
};

const DocBlock = ({ title, intro, children }: { title: string; intro: string; children: ReactNode }) => (
  <section>
    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</p>
    <p className="mb-3 text-sm text-carbon-700">{intro}</p>
    <div className="space-y-2">{children}</div>
  </section>
);

const ArchitectureBox = ({ title, color, items }: { title: string; color: "blue" | "purple" | "emerald" | "amber" | "red"; items: string[] }) => {
  const colors = {
    blue: "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100",
    purple: "border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100",
    emerald: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100",
    amber: "border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100",
    red: "border-red-200 bg-gradient-to-r from-red-50 to-red-100",
  };

  const textColors = {
    blue: "text-blue-600",
    purple: "text-purple-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };

  return (
    <div className={`rounded-xl border ${colors[color]} p-4 backdrop-blur-sm`}>
      <p className={`font-bold text-lg mb-2 ${textColors[color]}`}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`text-xs px-2 py-1 rounded-md bg-white/6 border border-carbon-200 text-carbon-700`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const Arrow = () => (
  <div className="flex justify-center">
    <div className="text-emerald-500 text-2xl animate-bounce">↓</div>
  </div>
);

const SummaryCard = ({ title, value, description, icon }: { title: string; value: string; description: string; icon: string }) => (
  <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 text-center hover:border-slate-600 transition-all duration-300">
    <p className="text-3xl mb-2">{icon}</p>
    <p className="text-3xl font-bold text-emerald-400 mb-2">{value}</p>
    <p className="text-sm font-semibold text-slate-300 mb-1">{title}</p>
    <p className="text-xs text-slate-500">{description}</p>
  </div>
);