import { Router } from "express";
import { getLeaderboard } from "../services/activity.service.js";
export const leaderboardRouter = Router();
leaderboardRouter.get("/", async (_req, res, next) => {
    try {
        const data = await getLeaderboard();
        res.json({ data });
    }
    catch (error) {
        next(error);
    }
});
