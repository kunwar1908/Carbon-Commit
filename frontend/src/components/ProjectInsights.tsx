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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-emerald-400 mb-2">📊 Project Architecture & Insights</h2>
        <p className="text-slate-300 text-lg">Database structure, demo coverage, and advancement roadmap.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="📋 Tables" value="8" color="emerald" />
        <StatCard label="⚙️ Functions" value="5" color="blue" />
        <StatCard label="🔗 Triggers" value="4" color="purple" />
        <StatCard label="🔐 RLS Policies" value="10+" color="amber" />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Database Tables */}
        <InfoCard 
          title="Database Tables" 
          icon="🗄️"
          summary="Core models for users, departments, activity, analytics, and compliance."
          color="emerald"
        >
          <div className="space-y-2">
            {schemaTables.map((table, i) => (
              <div key={table} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-950/50 border border-emerald-700/50 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  {i + 1}
                </div>
                <span className="text-slate-300 font-mono text-sm">{table}</span>
              </div>
            ))}
          </div>
        </InfoCard>

        {/* Automation Layer */}
        <InfoCard 
          title="Automation Layer" 
          icon="⚡"
          summary="Functions and triggers keep analytics, audit records, and notifications synced."
          color="blue"
        >
          <div className="space-y-4">
            <GroupBlock title="Functions" items={schemaFunctions} />
            <GroupBlock title="Triggers" items={schemaTriggers} />
          </div>
        </InfoCard>

        {/* Demo Dataset */}
        <InfoCard 
          title="Campus Demo Dataset" 
          icon="🏫"
          summary="Thapar-inspired schools and support services for testing at scale."
          color="purple"
        >
          <div className="grid grid-cols-2 gap-2">
            {demoScope.map((dept) => (
              <div key={dept} className="px-3 py-2 rounded-lg bg-purple-950/30 border border-purple-700/30 hover:border-purple-600/50 transition-colors duration-300">
                <p className="text-sm text-purple-300">{dept}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        {/* Roadmap */}
        <InfoCard 
          title="Product Roadmap" 
          icon="🚀"
          summary="Features and enhancements for the sustainability dashboard."
          color="amber"
        >
          <div className="space-y-3">
            {roadmapItems.map((item, i) => (
              <div key={item} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-950/50 border border-amber-700/50 flex items-center justify-center text-amber-400 text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-slate-300 text-sm pt-1">{item}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Architecture Diagram */}
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 backdrop-blur-sm">
        <h3 className="text-2xl font-bold text-emerald-400 mb-6">🔄 System Architecture Flow</h3>
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

      {/* Stats Summary */}
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
  const colors = {
    emerald: "border-emerald-700/50 bg-gradient-to-br from-emerald-950/30 to-emerald-900/20",
    blue: "border-blue-700/50 bg-gradient-to-br from-blue-950/30 to-blue-900/20",
    purple: "border-purple-700/50 bg-gradient-to-br from-purple-950/30 to-purple-900/20",
    amber: "border-amber-700/50 bg-gradient-to-br from-amber-950/30 to-amber-900/20",
  };

  return (
    <article className={`rounded-2xl border ${colors[color]} p-6 backdrop-blur-sm hover:border-slate-600 transition-all duration-300`}>
      <h3 className="text-xl font-bold text-white mb-1">{icon} {title}</h3>
      <p className="text-sm text-slate-400 mb-4">{summary}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
};

const GroupBlock = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <p className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">{title}</p>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3 hover:border-slate-600/50 transition-colors duration-300">
          <span className="text-sm text-slate-300 font-mono">{item}</span>
        </div>
      ))}
    </div>
  </div>
);

const ArchitectureBox = ({ title, color, items }: { title: string; color: "blue" | "purple" | "emerald" | "amber" | "red"; items: string[] }) => {
  const colors = {
    blue: "border-blue-700/50 bg-gradient-to-r from-blue-950/40 to-blue-900/20",
    purple: "border-purple-700/50 bg-gradient-to-r from-purple-950/40 to-purple-900/20",
    emerald: "border-emerald-700/50 bg-gradient-to-r from-emerald-950/40 to-emerald-900/20",
    amber: "border-amber-700/50 bg-gradient-to-r from-amber-950/40 to-amber-900/20",
    red: "border-red-700/50 bg-gradient-to-r from-red-950/40 to-red-900/20",
  };

  const textColors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <div className={`rounded-xl border ${colors[color]} p-4 backdrop-blur-sm`}>
      <p className={`font-bold text-lg mb-2 ${textColors[color]}`}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`text-xs px-2 py-1 rounded-md bg-slate-900/50 border border-slate-700 text-slate-300`}>
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