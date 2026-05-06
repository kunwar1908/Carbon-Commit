import { NotificationType, Prisma, UserRole } from "@prisma/client";
import { parse } from "csv-parse/sync";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma.js";
import { decimalToNumber } from "../lib/decimal.js";

export type CurrentUserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  deptId: number | null;
  departmentName: string | null;
};

export type AuditLogEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: UserRole | null;
  timestamp: string;
  summary: string;
};

export type NotificationEntry = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  relatedData: Record<string, unknown> | null;
};

export type RoleKpi = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "warning" | "success" | "critical";
};

export type FootprintDepartment = {
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
  departments: FootprintDepartment[];
};

export type OperationsSnapshot = {
  profile: CurrentUserProfile;
  roleKpis: RoleKpi[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationEntry[];
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

export type ImportKind = "logs" | "departments";

type ImportRow = Record<string, string>;

type ActivityImportRow = {
  userId: string;
  email: string;
  fullName: string | null;
  deptId: number;
  activityType: string;
  units: number;
  notes: string | null;
  timestamp: Date | undefined;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseBoolean = (value: string | undefined) => {
  if (!value) return true;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
};

const parseNumber = (value: string | undefined) => {
  if (!value) return Number.NaN;
  return Number(value.trim());
};

const parseDate = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toJsonObject = (value: Prisma.JsonValue | null | undefined) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const getCurrentUserProfile = async (userId: string, email?: string | null): Promise<CurrentUserProfile> => {
  const profile = await prisma.userProfile.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: email ?? `${userId}@supabase.local`,
      isActive: true,
    },
    update: {
      email: email ?? `${userId}@supabase.local`,
      isActive: true,
    },
    include: {
      dept: true,
    },
  });

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    deptId: profile.deptId,
    departmentName: profile.dept?.name ?? null,
  };
};

export const recordAuditLog = async (input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Prisma.JsonValue | null;
  newValues?: Prisma.JsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues ?? undefined,
      newValues: input.newValues ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
};

export const getDepartmentNotificationRecipients = async (deptId: number, actorId?: string) => {
  const recipients = await prisma.userProfile.findMany({
    where: {
      isActive: true,
      OR: [{ deptId }, { role: "ADMIN" }],
    },
    select: { id: true },
  });

  const recipientIds = new Set(recipients.map((recipient) => recipient.id));
  if (actorId) {
    recipientIds.add(actorId);
  }

  return Array.from(recipientIds);
};

export const createNotifications = async (
  recipientIds: string[],
  input: {
    title: string;
    message: string;
    type: NotificationType;
    relatedData?: Prisma.JsonValue | null;
  },
) => {
  const uniqueRecipientIds = Array.from(new Set(recipientIds.filter(Boolean)));

  if (uniqueRecipientIds.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: uniqueRecipientIds.map((userId) => ({
      userId,
      title: input.title,
      message: input.message,
      type: input.type,
      relatedData: input.relatedData ?? undefined,
    })),
  });
};

export const listAuditLogs = async ({
  profile,
  entityType,
  from,
  to,
  limit = 25,
}: {
  profile: CurrentUserProfile;
  entityType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) => {
  const where: Prisma.AuditLogWhereInput = {
    ...(profile.role === "ADMIN" ? {} : { userId: profile.id }),
    ...(entityType ? { entityType } : {}),
    ...(from || to
      ? {
          timestamp: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: Math.max(1, Math.min(limit, 100)),
    include: {
      user: {
        select: { id: true, email: true, role: true, fullName: true },
      },
    },
  });

  return logs.map<AuditLogEntry>((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actorId: entry.user?.id ?? null,
    actorEmail: entry.user?.email ?? null,
    actorRole: entry.user?.role ?? null,
    timestamp: entry.timestamp.toISOString(),
    summary: `${entry.action} ${entry.entityType}#${entry.entityId}`,
  }));
};

export const listNotifications = async (profile: CurrentUserProfile) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return notifications.map<NotificationEntry>((entry) => ({
    id: entry.id,
    title: entry.title,
    message: entry.message,
    type: entry.type,
    isRead: entry.isRead,
    createdAt: entry.createdAt.toISOString(),
    readAt: entry.readAt ? entry.readAt.toISOString() : null,
    relatedData: toJsonObject(entry.relatedData),
  }));
};

export const markNotificationRead = async (profile: CurrentUserProfile, notificationId: number) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: profile.id },
  });

  if (!notification) {
    return false;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  await recordAuditLog({
    userId: profile.id,
    action: "READ_NOTIFICATION",
    entityType: "notifications",
    entityId: String(notificationId),
    newValues: { isRead: true },
  });

  return true;
};

export const dismissNotification = async (profile: CurrentUserProfile, notificationId: number) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: profile.id },
  });

  if (!notification) {
    return false;
  }

  await prisma.notification.delete({ where: { id: notificationId } });

  await recordAuditLog({
    userId: profile.id,
    action: "DISMISS_NOTIFICATION",
    entityType: "notifications",
    entityId: String(notificationId),
    oldValues: { title: notification.title, type: notification.type },
  });

  return true;
};

export const dismissAllNotifications = async (profile: CurrentUserProfile) => {
  const result = await prisma.notification.deleteMany({
    where: { userId: profile.id },
  });

  if (result.count > 0) {
    await recordAuditLog({
      userId: profile.id,
      action: "DISMISS_ALL_NOTIFICATIONS",
      entityType: "notifications",
      entityId: profile.id,
      newValues: { count: result.count },
    });
  }

  return result.count;
};

export const buildRoleKpis = async ({
  profile,
  analytics,
  notifications,
  auditLogs,
}: {
  profile: CurrentUserProfile;
  analytics: Array<{ deptId: number; deptName: string; totalEmissions: number; baseline: number; variance: number; exceedsBaseline: boolean }>;
  notifications: NotificationEntry[];
  auditLogs: AuditLogEntry[];
}) => {
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const alerts = analytics.filter((entry) => entry.exceedsBaseline);

  if (profile.role === "ADMIN") {
    return [
      {
        label: "Departments",
        value: String(analytics.length),
        detail: "Campus departments in the active analytics feed.",
        tone: "neutral" as const,
      },
      {
        label: "Active Alerts",
        value: String(alerts.length),
        detail: "Departments currently above baseline quota.",
        tone: alerts.length > 0 ? ("critical" as const) : ("success" as const),
      },
      {
        label: "Unread Notifications",
        value: String(unreadNotifications),
        detail: "Quota breaches, approvals, and reminders waiting in the inbox.",
        tone: unreadNotifications > 0 ? ("warning" as const) : ("success" as const),
      },
      {
        label: "Audit Entries",
        value: String(auditLogs.length),
        detail: "Recent admin and activity events captured by the audit viewer.",
        tone: "neutral" as const,
      },
    ];
  }

  const targetDepartment = profile.deptId ? analytics.find((entry) => entry.deptId === profile.deptId) : undefined;

  if (profile.role === "MANAGER") {
    return [
      {
        label: "Department Emissions",
        value: targetDepartment ? targetDepartment.totalEmissions.toFixed(2) : "0.00",
        detail: "Current total emissions for the manager-owned department.",
        tone: targetDepartment && targetDepartment.exceedsBaseline ? ("warning" as const) : ("success" as const),
      },
      {
        label: "Variance",
        value: targetDepartment ? targetDepartment.variance.toFixed(2) : "0.00",
        detail: "Current gap to baseline quota.",
        tone: targetDepartment && targetDepartment.exceedsBaseline ? ("critical" as const) : ("neutral" as const),
      },
      {
        label: "Unread Notifications",
        value: String(unreadNotifications),
        detail: "Notifications routed to this department lead.",
        tone: unreadNotifications > 0 ? ("warning" as const) : ("success" as const),
      },
      {
        label: "Recent Audit Items",
        value: String(Math.min(auditLogs.length, 25)),
        detail: "Latest actions affecting your sustainability view.",
        tone: "neutral" as const,
      },
    ];
  }

  return [
    {
      label: "My Submissions",
      value: String(auditLogs.filter((entry) => entry.actorId === profile.id).length),
      detail: "Submission and inbox activity associated with your account.",
      tone: "neutral" as const,
    },
    {
      label: "Unread Notifications",
      value: String(unreadNotifications),
      detail: "Pending alerts and reminders.",
      tone: unreadNotifications > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Tracked Department",
      value: profile.departmentName ?? "Unassigned",
      detail: "Current department scope for role-based access.",
      tone: "neutral" as const,
    },
    {
      label: "Latest Status",
      value: alerts.length > 0 ? "Attention" : "Clear",
      detail: alerts.length > 0 ? "One or more departments are above quota." : "No department is currently above quota.",
      tone: alerts.length > 0 ? ("critical" as const) : ("success" as const),
    },
  ];
};

export const buildFootprintSections = (
  analytics: Array<{ deptId: number; deptName: string; totalEmissions: number; baseline: number; variance: number; exceedsBaseline: boolean }>,
) => {
  const categorize = (label: string) => {
    const normalized = label.toLowerCase();
    return normalized.includes("transport") || normalized.includes("logistics") || normalized.includes("shuttle")
      ? "transport"
      : normalized.includes("hostel") || normalized.includes("residential") || normalized.includes("dining")
        ? "hostel"
        : "other";
  };

  const transportDepartments = analytics.filter((entry) => categorize(entry.deptName) === "transport");
  const hostelDepartments = analytics.filter((entry) => categorize(entry.deptName) === "hostel");

  const toSection = (label: string, departments: typeof analytics): FootprintSection => {
    const totalEmissions = departments.reduce((sum, entry) => sum + entry.totalEmissions, 0);
    const baseline = departments.reduce((sum, entry) => sum + entry.baseline, 0);

    return {
      label,
      totalEmissions,
      baseline,
      variance: totalEmissions - baseline,
      departments: departments.map((entry) => ({
        id: entry.deptId,
        name: entry.deptName,
        totalEmissions: entry.totalEmissions,
        baseline: entry.baseline,
        variance: entry.variance,
        exceedsBaseline: entry.exceedsBaseline,
      })),
    };
  };

  return {
    transport: toSection("Campus Transport", transportDepartments),
    hostel: toSection("Hostel and Residential", hostelDepartments),
  };
};

export const parseCsvRows = (csvText: string) =>
  parse(csvText, { columns: true, skip_empty_lines: true, trim: true }) as ImportRow[];

export const importDepartmentRows = async (rows: ImportRow[], profile: CurrentUserProfile) => {
  let upserted = 0;

  for (const row of rows) {
    const name = row.name ?? row.department ?? row.deptName ?? "";
    const baseline = parseNumber(row.baseline);

    if (!name.trim() || !Number.isFinite(baseline)) {
      continue;
    }

    const department = await prisma.deptMaster.upsert({
      where: { name: name.trim() },
      create: {
        name: name.trim(),
        baseline: new Prisma.Decimal(baseline),
        description: row.description?.trim() || null,
        manager: row.manager?.trim() || null,
        isActive: parseBoolean(row.isActive),
      },
      update: {
        baseline: new Prisma.Decimal(baseline),
        description: row.description?.trim() || null,
        manager: row.manager?.trim() || null,
        isActive: parseBoolean(row.isActive),
      },
    });

    if (row.managerEmail?.trim()) {
      await prisma.userProfile.upsert({
        where: { id: `manager-${slugify(row.managerEmail)}` },
        create: {
          id: `manager-${slugify(row.managerEmail)}`,
          email: row.managerEmail.trim(),
          fullName: row.manager?.trim() || `${department.name} Manager`,
          role: "MANAGER",
          deptId: department.id,
          isActive: true,
        },
        update: {
          email: row.managerEmail.trim(),
          fullName: row.manager?.trim() || `${department.name} Manager`,
          deptId: department.id,
          isActive: true,
        },
      });
    }

    await recordAuditLog({
      userId: profile.id,
      action: "UPSERT_DEPARTMENT",
      entityType: "dept_master",
      entityId: String(department.id),
      newValues: {
        name: department.name,
        baseline: decimalToNumber(department.baseline),
        manager: department.manager,
      },
    });

    upserted += 1;
  }

  if (upserted > 0) {
    await createNotifications([profile.id], {
      title: "Department onboarding complete",
      message: `${upserted} departments were imported or refreshed from CSV.`,
      type: NotificationType.SUCCESS,
      relatedData: { importedDepartments: upserted },
    });
  }

  return { upserted };
};

export const normalizeActivityImportRows = async (rows: ImportRow[], profile: CurrentUserProfile) => {
  const importedRows: ActivityImportRow[] = [];

  for (const row of rows) {
    const deptId = Number(row.deptId ?? row.departmentId);
    const deptName = row.deptName ?? row.department ?? row.dept ?? "";
    const activityType = row.activityType ?? row.activity ?? "";
    const units = parseNumber(row.units ?? row.quantity ?? row.value);

    if (!activityType.trim() || !Number.isFinite(units) || units <= 0) {
      continue;
    }

    let resolvedDeptId = Number.isFinite(deptId) ? deptId : Number.NaN;
    if (!Number.isFinite(resolvedDeptId) && deptName.trim()) {
      const department = await prisma.deptMaster.findFirst({
        where: { name: { equals: deptName.trim(), mode: "insensitive" } },
        select: { id: true },
      });

      if (department) {
        resolvedDeptId = department.id;
      }
    }

    if (!Number.isFinite(resolvedDeptId)) {
      continue;
    }

    const providedUserId = row.userId?.trim();
    const providedEmail = row.email?.trim() ?? row.userEmail?.trim() ?? row.actorEmail?.trim();
    const userId = providedUserId || (providedEmail ? `import-${slugify(providedEmail)}` : profile.id);
    const email = providedEmail ?? `${userId}@supabase.local`;

    await prisma.userProfile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        fullName: row.fullName?.trim() || row.name?.trim() || null,
        deptId: resolvedDeptId,
        role: "USER",
        isActive: true,
      },
      update: {
        email,
        fullName: row.fullName?.trim() || row.name?.trim() || null,
        deptId: resolvedDeptId,
        isActive: true,
      },
    });

    importedRows.push({
      userId,
      email,
      fullName: row.fullName?.trim() || row.name?.trim() || null,
      deptId: resolvedDeptId,
      activityType: activityType.trim(),
      units,
      notes: row.notes?.trim() || row.comment?.trim() || null,
      timestamp: parseDate(row.timestamp ?? row.date ?? row.createdAt),
    });
  }

  return importedRows;
};

export const buildCsvReport = (snapshot: OperationsSnapshot) => {
  const lines = ["section,label,value,detail"];

  for (const kpi of snapshot.roleKpis) {
    lines.push(["kpi", kpi.label, kpi.value, kpi.detail].map(escapeCsvValue).join(","));
  }

  lines.push(["summary", "departments", String(snapshot.totals.departments), "Active departments in analytics"].map(escapeCsvValue).join(","));
  lines.push(["summary", "alerts", String(snapshot.totals.alerts), "Departments above baseline"].map(escapeCsvValue).join(","));
  lines.push(["summary", "notifications", String(snapshot.unreadNotifications), "Unread notifications"].map(escapeCsvValue).join(","));

  for (const section of [snapshot.footprints.transport, snapshot.footprints.hostel]) {
    lines.push(["footprint", section.label, section.totalEmissions.toFixed(2), `Variance ${section.variance.toFixed(2)}`].map(escapeCsvValue).join(","));
    for (const department of section.departments) {
      lines.push([
        "footprint-department",
        department.name,
        department.totalEmissions.toFixed(2),
        `Baseline ${department.baseline.toFixed(2)}`,
      ]
        .map(escapeCsvValue)
        .join(","));
    }
  }

  for (const notification of snapshot.notifications) {
    lines.push(["notification", notification.title, notification.type, notification.message].map(escapeCsvValue).join(","));
  }

  return `${lines.join("\n")}\n`;
};

export const buildPdfReport = async (snapshot: OperationsSnapshot) =>
  new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(20).text("Carbon Commit Compliance Snapshot", { underline: true });
    document.moveDown(0.5);
    document.fontSize(11).text(`Profile: ${snapshot.profile.email} (${snapshot.profile.role})`);
    document.text(`Department scope: ${snapshot.profile.departmentName ?? "Campus-wide"}`);
    document.moveDown();

    document.fontSize(14).text("Role KPIs");
    document.fontSize(10);
    for (const kpi of snapshot.roleKpis) {
      document.text(`- ${kpi.label}: ${kpi.value} | ${kpi.detail}`);
    }
    document.moveDown();

    document.fontSize(14).text("Footprint Highlights");
    document.fontSize(10);
    for (const section of [snapshot.footprints.transport, snapshot.footprints.hostel]) {
      document.text(`- ${section.label}: ${section.totalEmissions.toFixed(2)} / ${section.baseline.toFixed(2)} baseline (variance ${section.variance.toFixed(2)})`);
      for (const department of section.departments) {
        document.text(`  • ${department.name}: ${department.totalEmissions.toFixed(2)} / ${department.baseline.toFixed(2)}`);
      }
    }
    document.moveDown();

    document.fontSize(14).text("Recent Notifications");
    document.fontSize(10);
    for (const notification of snapshot.notifications.slice(0, 5)) {
      document.text(`- ${notification.title} [${notification.type}] ${notification.message}`);
    }
    document.moveDown();

    document.fontSize(14).text("Audit Log");
    document.fontSize(10);
    for (const entry of snapshot.auditLogs.slice(0, 8)) {
      document.text(`- ${entry.timestamp}: ${entry.summary}`);
    }

    document.end();
  });

const escapeCsvValue = (value: string) => {
  const text = value.replace(/"/g, '""');
  return `"${text}"`;
};
