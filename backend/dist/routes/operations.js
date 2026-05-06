import { NotificationType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { createActivityLog } from "../services/activity.service.js";
import { getAnalytics, getLeaderboard, listReferenceData } from "../services/activity.service.js";
import { buildCsvReport, buildFootprintSections, buildPdfReport, buildRoleKpis, dismissAllNotifications, dismissNotification, getCurrentUserProfile, importDepartmentRows, listAuditLogs, listNotifications, markNotificationRead, normalizeActivityImportRows, parseCsvRows, recordAuditLog, createNotifications, } from "../services/operations.service.js";
const auditQuerySchema = z.object({
    entityType: z.string().trim().optional(),
    entityId: z.string().trim().optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});
const notificationQuerySchema = z.object({
    isRead: z
        .string()
        .trim()
        .transform((value) => value.toLowerCase())
        .refine((value) => value === "true" || value === "false")
        .optional(),
});
const importSchema = z.object({
    csvText: z.string().min(1),
});
const exportSchema = z.object({
    format: z.enum(["csv", "pdf"]).default("csv"),
});
export const operationsRouter = Router();
operationsRouter.get("/summary", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const [analytics, leaderboard, referenceData, notifications, auditLogs] = await Promise.all([
            getAnalytics(),
            getLeaderboard(),
            listReferenceData(),
            listNotifications(profile),
            listAuditLogs({ profile, limit: 8 }),
        ]);
        const roleKpis = await buildRoleKpis({ profile, analytics, notifications, auditLogs });
        const footprints = buildFootprintSections(analytics);
        res.json({
            data: {
                profile,
                roleKpis,
                auditLogs,
                notifications,
                unreadNotifications: notifications.filter((item) => !item.isRead).length,
                footprints,
                totals: {
                    departments: referenceData.departments.length,
                    alerts: analytics.filter((entry) => entry.exceedsBaseline).length,
                    leaderboardRows: leaderboard.length,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.get("/audit-logs", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const query = auditQuerySchema.parse(req.query);
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const auditFilters = {
            profile,
        };
        if (query.entityType) {
            auditFilters.entityType = query.entityType;
        }
        if (query.entityId) {
            auditFilters.entityId = query.entityId;
        }
        if (query.from) {
            auditFilters.from = new Date(query.from);
        }
        if (query.to) {
            auditFilters.to = new Date(query.to);
        }
        if (query.limit) {
            auditFilters.limit = query.limit;
        }
        const data = await listAuditLogs(auditFilters);
        res.json({ data });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.get("/notifications", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const query = notificationQuerySchema.parse(req.query);
        const isRead = query.isRead === undefined ? undefined : query.isRead === "true";
        const data = await listNotifications(profile, isRead);
        res.json({ data });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.patch("/notifications/:id/read", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const notificationId = Number(req.params.id);
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            res.status(400).json({ error: "Invalid notification id." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const ok = await markNotificationRead(profile, notificationId);
        if (!ok) {
            res.status(404).json({ error: "Notification not found." });
            return;
        }
        res.json({ data: { ok: true } });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.delete("/notifications/:id", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const notificationId = Number(req.params.id);
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            res.status(400).json({ error: "Invalid notification id." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const ok = await dismissNotification(profile, notificationId);
        if (!ok) {
            res.status(404).json({ error: "Notification not found." });
            return;
        }
        res.json({ data: { ok: true } });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.delete("/notifications", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const count = await dismissAllNotifications(profile);
        res.json({ data: { count } });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.post("/imports/:kind", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const kind = req.params.kind;
        if (kind !== "logs" && kind !== "departments") {
            res.status(400).json({ error: "Unsupported import kind." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const payload = importSchema.parse(req.body);
        const rows = parseCsvRows(payload.csvText);
        if (kind === "departments") {
            const result = await importDepartmentRows(rows, profile);
            res.status(201).json({ data: result });
            return;
        }
        const activityRows = await normalizeActivityImportRows(rows, profile);
        let imported = 0;
        for (const row of activityRows) {
            const activityInput = {
                userId: row.userId,
                deptId: row.deptId,
                activityType: row.activityType,
                units: row.units,
            };
            // Only include optional fields if they exist
            if (row.notes) {
                activityInput.notes = row.notes;
            }
            if (row.timestamp) {
                activityInput.timestamp = row.timestamp;
            }
            await createActivityLog(activityInput);
            imported += 1;
        }
        if (imported > 0) {
            await recordAuditLog({
                userId: profile.id,
                action: "IMPORT_ACTIVITY_LOGS",
                entityType: "activity_logs",
                entityId: profile.id,
                newValues: { imported },
            });
            await createNotifications([profile.id], {
                title: "Historical logs imported",
                message: `${imported} activity records were imported successfully.`,
                type: NotificationType.SUCCESS,
                relatedData: { imported },
            });
        }
        res.status(201).json({
            data: {
                imported,
                skipped: rows.length - imported,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
operationsRouter.get("/exports/:kind", async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const profile = await getCurrentUserProfile(req.user.id, req.user.email);
        const exportKind = req.params.kind;
        const query = exportSchema.parse(req.query);
        const [analytics, leaderboard, referenceData, notifications, auditLogs] = await Promise.all([
            getAnalytics(),
            getLeaderboard(),
            listReferenceData(),
            listNotifications(profile),
            listAuditLogs({ profile, limit: 12 }),
        ]);
        const snapshot = {
            profile,
            roleKpis: await buildRoleKpis({ profile, analytics, notifications, auditLogs }),
            auditLogs,
            notifications,
            unreadNotifications: notifications.filter((item) => !item.isRead).length,
            footprints: buildFootprintSections(analytics),
            totals: {
                departments: referenceData.departments.length,
                alerts: analytics.filter((entry) => entry.exceedsBaseline).length,
                leaderboardRows: leaderboard.length,
            },
        };
        await recordAuditLog({
            userId: profile.id,
            action: `EXPORT_${query.format.toUpperCase()}_${exportKind.toUpperCase()}`,
            entityType: "reports",
            entityId: exportKind,
            newValues: { format: query.format },
        });
        if (query.format === "csv") {
            const csv = buildCsvReport(snapshot);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="carbon-commit-${exportKind}.csv"`);
            res.send(csv);
            return;
        }
        const pdf = await buildPdfReport(snapshot);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="carbon-commit-${exportKind}.pdf"`);
        res.send(pdf);
    }
    catch (error) {
        next(error);
    }
});
