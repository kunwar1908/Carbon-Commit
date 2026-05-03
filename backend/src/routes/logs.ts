import { Router } from "express";
import { z } from "zod";
import { createActivityLog } from "../services/activity.service.js";

const logInputSchema = z.object({
  deptId: z.number().int().positive(),
  activityType: z.string().min(1),
  units: z.number().finite().positive(),
});

export const logsRouter = Router();

logsRouter.post("/", async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const input = logInputSchema.parse(req.body);
    const record = await createActivityLog(input);

    res.status(201).json({
      user: req.user,
      message: record.exceedsBaseline
        ? "Activity logged. Baseline quota exceeded."
        : "Activity logged successfully.",
      data: record,
    });
  } catch (error) {
    next(error);
  }
});