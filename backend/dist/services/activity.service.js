import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { decimalToNumber, numberToDecimal } from "../lib/decimal.js";
import { createNotifications, getDepartmentNotificationRecipients, recordAuditLog } from "./operations.service.js";
export const createActivityLog = async (input) => {
    if (!input.userId?.trim()) {
        throw new Error("User ID is required.");
    }
    if (!Number.isFinite(input.units) || input.units <= 0) {
        throw new Error("Units must be a positive number.");
    }
    return prisma.$transaction(async (tx) => {
        await tx.userProfile.upsert({
            where: { id: input.userId },
            create: {
                id: input.userId,
                email: `${input.userId}@supabase.local`,
                isActive: true,
            },
            update: {
                isActive: true,
            },
        });
        const [dept, emissionRef] = await Promise.all([
            tx.deptMaster.findUnique({ where: { id: input.deptId } }),
            tx.emissionRef.findUnique({ where: { activityType: input.activityType } }),
        ]);
        if (!dept) {
            throw new Error("Department not found.");
        }
        if (!emissionRef) {
            throw new Error("Activity type not found.");
        }
        const units = numberToDecimal(input.units);
        const co2Result = units.mul(emissionRef.factor);
        const created = await tx.activityLogs.create({
            data: {
                userId: input.userId,
                deptId: input.deptId,
                activityId: input.activityType,
                units,
                co2Result,
                notes: input.notes ?? null,
                ...(input.timestamp ? { timestamp: input.timestamp } : {}),
            },
        });
        const totalAggregate = await tx.activityLogs.aggregate({
            where: { deptId: input.deptId },
            _sum: { co2Result: true },
        });
        const totalEmissions = decimalToNumber(totalAggregate._sum.co2Result ?? new Prisma.Decimal(0));
        const baseline = decimalToNumber(dept.baseline);
        await recordAuditLog({
            userId: input.userId,
            action: "CREATE_ACTIVITY_LOG",
            entityType: "activity_logs",
            entityId: String(created.id),
            newValues: {
                deptId: input.deptId,
                activityType: input.activityType,
                units: decimalToNumber(created.units),
                co2Result: decimalToNumber(created.co2Result),
            },
        });
        if (totalEmissions > baseline) {
            const recipients = await getDepartmentNotificationRecipients(input.deptId, input.userId);
            await createNotifications(recipients, {
                title: `${dept.name} crossed quota`,
                message: `${dept.name} is ${Math.abs(totalEmissions - baseline).toFixed(2)} above baseline after ${input.activityType}.`,
                type: "WARNING",
                relatedData: {
                    deptId: input.deptId,
                    activityType: input.activityType,
                    totalEmissions,
                    baseline,
                },
            });
        }
        return {
            id: created.id,
            deptId: dept.id,
            deptName: dept.name,
            activityType: emissionRef.activityType,
            units: decimalToNumber(created.units),
            co2Result: decimalToNumber(created.co2Result),
            timestamp: created.timestamp.toISOString(),
            totalEmissions,
            baseline,
            exceedsBaseline: totalEmissions > baseline,
        };
    });
};
export const getAnalytics = async () => {
    const departments = await prisma.deptMaster.findMany({
        orderBy: { id: "asc" },
        include: {
            logs: {
                select: { co2Result: true },
            },
        },
    });
    return departments.map((dept) => {
        const totalEmissions = dept.logs.reduce((sum, log) => sum + decimalToNumber(log.co2Result), 0);
        const baseline = decimalToNumber(dept.baseline);
        return {
            deptId: dept.id,
            deptName: dept.name,
            totalEmissions,
            baseline,
            variance: totalEmissions - baseline,
            usagePercent: baseline > 0 ? (totalEmissions / baseline) * 100 : 0,
            exceedsBaseline: totalEmissions > baseline,
        };
    });
};
export const getLeaderboard = async () => {
    const analytics = await getAnalytics();
    return analytics
        .slice()
        .sort((left, right) => left.totalEmissions - right.totalEmissions)
        .map((entry, index) => ({
        rank: index + 1,
        ...entry,
    }));
};
export const listReferenceData = async () => {
    const [departments, activityRefs] = await Promise.all([
        prisma.deptMaster.findMany({ orderBy: { name: "asc" } }),
        prisma.emissionRef.findMany({ orderBy: { activityType: "asc" } }),
    ]);
    return {
        departments: departments.map((dept) => ({
            id: dept.id,
            name: dept.name,
            baseline: decimalToNumber(dept.baseline),
        })),
        activities: activityRefs.map((activity) => ({
            activityType: activity.activityType,
            factor: decimalToNumber(activity.factor),
            unit: activity.unit,
        })),
    };
};
export const getRecentActivityLogs = async (userId, limit = 8) => {
    const rows = await prisma.activityLogs.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
        take: Math.max(1, Math.min(limit, 20)),
        include: {
            dept: { select: { name: true } },
            activity: { select: { activityType: true } },
        },
    });
    return rows.map((row) => ({
        id: row.id,
        deptName: row.dept.name,
        activityType: row.activity.activityType,
        units: decimalToNumber(row.units),
        co2Result: decimalToNumber(row.co2Result),
        timestamp: row.timestamp.toISOString(),
    }));
};
