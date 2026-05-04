import { Router } from "express";
import { getAnalytics, getLeaderboard, listReferenceData } from "../services/activity.service.js";
export const analyticsRouter = Router();
analyticsRouter.get("/", async (_req, res, next) => {
    try {
        const data = await getAnalytics();
        res.json({ data });
    }
    catch (error) {
        next(error);
    }
});
analyticsRouter.get("/leaderboard", async (_req, res, next) => {
    try {
        const data = await getLeaderboard();
        res.json({ data });
    }
    catch (error) {
        next(error);
    }
});
analyticsRouter.get("/reference-data", async (_req, res, next) => {
    try {
        const data = await listReferenceData();
        res.json({ data });
    }
    catch (error) {
        next(error);
    }
});
