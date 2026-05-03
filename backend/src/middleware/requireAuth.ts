import type { RequestHandler } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string | null;
      };
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
  };

  next();
};
