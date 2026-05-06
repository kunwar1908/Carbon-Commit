export type DepartmentAnalytics = {
  deptId: number;
  deptName: string;
  totalEmissions: number;
  baseline: number;
  variance: number;
  usagePercent: number;
  exceedsBaseline: boolean;
};

export type LeaderboardEntry = DepartmentAnalytics & {
  rank: number;
};

export type ReferenceDepartment = {
  id: number;
  name: string;
  baseline: number;
};

export type ReferenceActivity = {
  activityType: string;
  factor: number;
  unit: string;
};

export type ReferenceData = {
  departments: ReferenceDepartment[];
  activities: ReferenceActivity[];
};

export type LogSubmission = {
  deptId: number;
  activityType: string;
  units: number;
};

export type ActivityLogResponse = {
  id: number;
  deptId: number;
  deptName: string;
  activityType: string;
  units: number;
  co2Result: number;
  timestamp: string;
  totalEmissions: number;
  baseline: number;
  exceedsBaseline: boolean;
};

export type AuditLogEntry = {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: "ADMIN" | "MANAGER" | "USER" | null;
  timestamp: string;
  summary: string;
};

export type NotificationItem = {
  id: number;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  title: string;
  message: string;
  relatedData: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type RoleKpi = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "warning" | "success" | "critical";
};

export type FootprintData = {
  id: number;
  name: string;
  totalEmissions: number;
  baseline: number;
  variance: number;
  exceedsBaseline: boolean;
};

export type FootprintSection = {
  label: string;
  totalEmissions: number;
  baseline: number;
  variance: number;
  departments: FootprintData[];
};

export type OperationsSummary = {
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    role: "ADMIN" | "MANAGER" | "USER";
    deptId: number | null;
    departmentName: string | null;
  };
  roleKpis: RoleKpi[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  unreadNotifications: number;
  footprints: {
    transport: FootprintSection;
    hostel: FootprintSection;
  };
  totals: {
    departments: number;
    alerts: number;
    leaderboardRows: number;
  };
};

export type CsvImportResult = {
  imported: number;
  skipped: number;
};

export type RecentActivityLog = {
  id: number;
  deptName: string;
  activityType: string;
  units: number;
  co2Result: number;
  timestamp: string;
};