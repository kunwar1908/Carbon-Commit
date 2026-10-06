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

export const updateCurrentUserProfile = async (userId: string, deptId: number | null) => {
  if (deptId !== null) {
    const department = await prisma.deptMaster.findUnique({
      where: { id: deptId },
      select: { id: true, isActive: true },
    });

    if (!department || !department.isActive) {
      throw new Error("Department not found or inactive.");
    }
  }

  const profile = await prisma.userProfile.update({
    where: { id: userId },
    data: { deptId },
    include: { dept: true },
  });

  await recordAuditLog({
    userId,
    action: "UPDATE_PROFILE_DEPARTMENT",
    entityType: "user_profiles",
    entityId: userId,
    newValues: {
      deptId: profile.deptId,
      departmentName: profile.dept?.name ?? null,
    },
  });

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    deptId: profile.deptId,
    departmentName: profile.dept?.name ?? null,
  } satisfies CurrentUserProfile;
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
  const data: Prisma.AuditLogUncheckedCreateInput = {
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };

  // Only include optional fields if they're explicitly provided
  if (input.oldValues !== undefined) {
    (data as Record<string, unknown>).oldValues = input.oldValues;
  }
  if (input.newValues !== undefined) {
    (data as Record<string, unknown>).newValues = input.newValues;
  }

  await prisma.auditLog.create({ data });
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

  const notificationData: Prisma.NotificationCreateManyInput[] = uniqueRecipientIds.map((userId) => {
    const data: Prisma.NotificationUncheckedCreateInput = {
      userId,
      title: input.title,
      message: input.message,
      type: input.type,
    };

    // Only include relatedData if explicitly provided
    if (input.relatedData !== undefined) {
      (data as Record<string, unknown>).relatedData = input.relatedData;
    }

    return data;
  });

  await prisma.notification.createMany({ data: notificationData });
};

export const listAuditLogs = async ({
  profile,
  entityType,
  entityId,
  from,
  to,
  limit = 25,
}: {
  profile: CurrentUserProfile;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) => {
  const where: Prisma.AuditLogWhereInput = {
    ...(profile.role === "ADMIN" ? {} : { userId: profile.id }),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
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

export const listNotifications = async (profile: CurrentUserProfile, isRead?: boolean) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id, ...(isRead === undefined ? {} : { isRead }) },
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
    const document = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    const pageBottom = 800;
    const contentWidth = 515;

    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const safeText = (value: string) => value.replace(/[^\x20-\x7E]/g, "");
    const addSectionHeading = (title: string) => {
      if (document.y > pageBottom - 45) document.addPage();
      document.fontSize(12).font("Helvetica-Bold").fillColor("#2d5a4c").text(title);
      document.moveDown(0.35);
    };

    document.fontSize(28).font("Helvetica-Bold").fillColor("#059669").text("Carbon Commit", { align: "center" });
    document.fontSize(11).font("Helvetica").fillColor("#2d5a4c").text("Campus Sustainability and Emissions Report", { align: "center" });
    document.fontSize(9).fillColor("#666").text(`Report generated: ${new Date().toLocaleString()}`, { align: "center" });
    document.moveDown(0.6);
    document.strokeColor("#10b981").lineWidth(1.5).moveTo(40, document.y).lineTo(555, document.y).stroke();
    document.moveDown(0.8);

    addSectionHeading("User Profile");
    const profileY = document.y;
    document.fillColor("#f0f9f7").strokeColor("#10b981").lineWidth(1);
    document.roundedRect(40, profileY, contentWidth, 62, 5).fillAndStroke();
    document.fontSize(9).font("Helvetica").fillColor("#333");
    document.text(`Email: ${safeText(snapshot.profile.email)}`, 52, profileY + 10, { width: 490 });
    document.text(`Role: ${snapshot.profile.role}`, 52, profileY + 27);
    document.text(`Department: ${safeText(snapshot.profile.departmentName ?? "Campus-wide")}`, 220, profileY + 27, { width: 320 });
    document.text(`Recent audit entries: ${snapshot.auditLogs.length}`, 52, profileY + 44);
    document.y = profileY + 78;

    addSectionHeading("Key Performance Indicators");
    const kpiWidth = 247;
    for (let index = 0; index < snapshot.roleKpis.length; index += 2) {
      if (document.y > pageBottom - 75) document.addPage();
      const rowY = document.y;
      snapshot.roleKpis.slice(index, index + 2).forEach((kpi, column) => {
        const x = 40 + column * 268;
        const bgColor = kpi.tone === "success" ? "#d1fae5" : kpi.tone === "critical" ? "#fee2e2" : kpi.tone === "warning" ? "#fef3c7" : "#f3f4f6";
        const borderColor = kpi.tone === "success" ? "#10b981" : kpi.tone === "critical" ? "#ef4444" : kpi.tone === "warning" ? "#f59e0b" : "#9ca3af";
        document.fillColor(bgColor).strokeColor(borderColor).lineWidth(1);
        document.roundedRect(x, rowY, kpiWidth, 56, 5).fillAndStroke();
        document.fontSize(8).font("Helvetica-Bold").fillColor("#111827").text(safeText(kpi.label), x + 9, rowY + 7, { width: kpiWidth - 18 });
        document.fontSize(12).fillColor(borderColor).text(safeText(kpi.value), x + 9, rowY + 20, { width: kpiWidth - 18 });
        document.fontSize(7).font("Helvetica").fillColor("#4b5563").text(safeText(kpi.detail), x + 9, rowY + 38, { width: kpiWidth - 18 });
      });
      document.y = rowY + 68;
    }

    addSectionHeading("Emissions Footprint Analysis");
    for (const section of [snapshot.footprints.transport, snapshot.footprints.hostel]) {
      if (document.y > pageBottom - 125) document.addPage();
      const percentUsed = section.baseline > 0 ? (section.totalEmissions / section.baseline) * 100 : 0;
      const barWidth = 350;
      const barY = document.y + 28;
      const filledWidth = Math.min(Math.max(percentUsed, 0) / 100, 1) * barWidth;
      const barColor = percentUsed > 100 ? "#dc2626" : percentUsed > 80 ? "#d97706" : "#059669";
      document.fontSize(10).font("Helvetica-Bold").fillColor("#2d5a4c").text(safeText(section.label));
      document.fontSize(8).font("Helvetica").fillColor("#555").text(`${section.totalEmissions.toFixed(2)} kg CO2 / ${section.baseline.toFixed(2)} kg baseline (${percentUsed.toFixed(1)}%)`);
      document.fillColor("#e5e7eb").roundedRect(60, barY, barWidth, 12, 3).fill();
      document.fillColor(barColor).roundedRect(60, barY, filledWidth, 12, 3).fill();
      document.fontSize(7).font("Helvetica-Bold").fillColor("#fff").text(`${percentUsed.toFixed(1)}%`, 65, barY + 2, { width: barWidth - 10 });
      document.y = barY + 21;
      document.fontSize(8).font("Helvetica").fillColor("#555");
      section.departments.slice(0, 4).forEach((dept) => {
        document.text(`- ${safeText(dept.name)}: ${dept.totalEmissions.toFixed(2)} kg CO2`, 60);
      });
      if (section.departments.length > 4) {
        document.fontSize(7).fillColor("#777").text(`... and ${section.departments.length - 4} more departments`, 60);
      }
      document.moveDown(0.6);
    }

    if (snapshot.notifications.length > 0) {
      addSectionHeading("Recent Alerts");
      snapshot.notifications.slice(0, 3).forEach((notification) => {
        if (document.y > pageBottom - 55) document.addPage();
        const boxY = document.y;
        const bgColor = notification.type === "ERROR" ? "#fee2e2" : notification.type === "WARNING" ? "#fef3c7" : "#d1fae5";
        const borderColor = notification.type === "ERROR" ? "#dc2626" : notification.type === "WARNING" ? "#d97706" : "#059669";
        document.fillColor(bgColor).strokeColor(borderColor).lineWidth(1).roundedRect(40, boxY, contentWidth, 38, 4).fillAndStroke();
        document.fontSize(8).font("Helvetica-Bold").fillColor("#111827").text(`[${notification.type}] ${safeText(notification.title)}`, 50, boxY + 6, { width: 495 });
        document.fontSize(7).font("Helvetica").fillColor("#374151").text(safeText(notification.message), 50, boxY + 19, { width: 495, height: 13, ellipsis: true });
        document.y = boxY + 50;
      });
    }

    if (snapshot.auditLogs.length > 0) {
      addSectionHeading("Recent Activity Log");
      const drawAuditHeader = () => {
        document.fillColor("#2d5a4c").rect(40, document.y, contentWidth, 18).fill();
        document.fontSize(7).font("Helvetica-Bold").fillColor("#fff");
        document.text("Date", 46, document.y + 5);
        document.text("Action", 112, document.y + 5);
        document.text("Entity", 220, document.y + 5);
        document.text("Summary", 315, document.y + 5);
        document.y += 18;
      };
      drawAuditHeader();
      for (const entry of snapshot.auditLogs.slice(0, 8)) {
        if (document.y > pageBottom - 24) {
          document.addPage();
          addSectionHeading("Recent Activity Log (continued)");
          drawAuditHeader();
        }
        const rowY = document.y;
        document.fillColor("#f9fafb").rect(40, rowY, contentWidth, 20).fill();
        document.fontSize(7).font("Helvetica").fillColor("#333");
        document.text(new Date(entry.timestamp).toLocaleDateString(), 46, rowY + 6, { width: 60 });
        document.text(safeText(entry.action), 112, rowY + 6, { width: 100, ellipsis: true });
        document.text(safeText(entry.entityType), 220, rowY + 6, { width: 85, ellipsis: true });
        document.text(safeText(entry.summary), 315, rowY + 6, { width: 235, ellipsis: true });
        document.y = rowY + 20;
      }
    }

    document.fontSize(8).font("Helvetica").fillColor("#999");
    document.strokeColor("#e5e7eb").moveTo(40, Math.min(document.y + 12, pageBottom)).lineTo(555, Math.min(document.y + 12, pageBottom)).stroke();
    document.y = Math.min(document.y + 20, pageBottom + 1);
    document.text("Carbon Commit v1.0 | TIET Sustainability Initiative | Confidential", { align: "center" });
    const pageRange = document.bufferedPageRange();
    for (let page = 0; page < pageRange.count; page += 1) {
      document.switchToPage(page);
      document.fontSize(8).fillColor("#999").text(`Page ${page + 1} of ${pageRange.count}`, 40, 806, { width: contentWidth, align: "center" });
    }

    document.end();
  });

const escapeCsvValue = (value: string) => {
  const text = value.replace(/"/g, '""');
  return `"${text}"`;
};
