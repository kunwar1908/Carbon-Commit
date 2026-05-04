import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/requireAuth.js";
import { logsRouter } from "./routes/logs.js";
import { analyticsRouter } from "./routes/analytics.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { errorHandler } from "./middleware/errorHandler.js";
export const createApp = () => {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.use(requireAuth);
    app.use("/logs", logsRouter);
    app.use("/analytics", analyticsRouter);
    app.use("/leaderboard", leaderboardRouter);
    app.use(errorHandler);
    return app;
};
