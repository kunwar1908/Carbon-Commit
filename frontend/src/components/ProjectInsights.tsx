import type { ReactNode } from "react";

const schemaTables = [
  "user_profiles",
  "dept_master",
  "emission_ref",
  "activity_logs",
  "audit_logs",
  "analytics_cache",
  "notifications",
  "admin_actions",
];

const schemaFunctions = [
  "update_analytics_cache()",
  "get_leaderboard_data()",
  "get_department_analytics()",
  "log_audit_action()",
  "notify_baseline_exceeded()",
];

const schemaTriggers = [
  "activity_logs_update_analytics_trigger",
  "activity_logs_audit_trigger",
  "user_profiles_audit_trigger",
  "notifications_update_read_at_trigger",
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
    <section className="rounded-[2rem] border border-carbon-100 bg-white p-6 shadow-[0_24px_80px_rgba(12,23,21,0.08)]">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-carbon-900">Project Intelligence</h2>
          <p className="text-sm text-carbon-500">Database structure, demo coverage, and synopsis-driven upgrade ideas.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Tables" value="8" />
          <StatCard label="Functions" value="5" />
          <StatCard label="Triggers" value="4" />
          <StatCard label="RLS Policies" value="10+" emphasis />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InfoCard title="Database Tables" summary="Core models for users, departments, activity, analytics, and compliance.">
          <TagList items={schemaTables} />
        </InfoCard>

        <InfoCard title="Automation Layer" summary="Functions and triggers keep analytics, audit records, and notifications up to date.">
          <GroupBlock title="Functions" items={schemaFunctions} />
          <GroupBlock title="Triggers" items={schemaTriggers} className="mt-4" />
        </InfoCard>

        <InfoCard title="Thapar Demo Dataset" summary="A larger campus-style seed set built around Thapar-inspired schools and support services.">
          <TagList items={demoScope} />
        </InfoCard>

        <InfoCard title="Synopsis-Driven Features" summary="The dashboard can grow into a fuller sustainability operations console.">
          <TagList items={roadmapItems} compact />
        </InfoCard>
      </div>
    </section>
  );
};

type StatCardProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

const StatCard = ({ label, value, emphasis = false }: StatCardProps) => (
  <div className={`rounded-3xl border px-4 py-3 ${emphasis ? "border-amber-400/40 bg-amber-400/15" : "border-carbon-100 bg-carbon-50"}`}>
    <p className="text-xs uppercase tracking-[0.28em] text-carbon-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-carbon-900">{value}</p>
  </div>
);

type InfoCardProps = {
  title: string;
  summary: string;
  children: ReactNode;
};

const InfoCard = ({ title, summary, children }: InfoCardProps) => (
  <article className="rounded-[1.75rem] border border-carbon-100 bg-carbon-50/60 p-5">
    <h3 className="text-lg font-semibold text-carbon-900">{title}</h3>
    <p className="mt-1 text-sm text-carbon-500">{summary}</p>
    <div className="mt-4">{children}</div>
  </article>
);

const TagList = ({ items, compact = false }: { items: string[]; compact?: boolean }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item) => (
      <span
        key={item}
        className={`rounded-full border border-carbon-200 bg-white px-3 py-1.5 text-sm text-carbon-700 ${compact ? "leading-5" : ""}`}
      >
        {item}
      </span>
    ))}
  </div>
);

const GroupBlock = ({ title, items, className = "" }: { title: string; items: string[]; className?: string }) => (
  <div className={className}>
    <p className="text-xs uppercase tracking-[0.28em] text-carbon-500">{title}</p>
    <ul className="mt-3 space-y-2 text-sm text-carbon-700">
      {items.map((item) => (
        <li key={item} className="rounded-2xl border border-carbon-100 bg-white px-4 py-3">
          {item}
        </li>
      ))}
    </ul>
  </div>
);