import { supabaseAdmin } from "../lib/supabase.js";
export const requireAuth = async (req, res, next) => {
    const isDev = process.env.NODE_ENV !== "production" && process.env.SKIP_AUTH === "true";
    if (isDev) {
        const devUserId = req.header("x-dev-user-id") || process.env.DEV_USER_ID;
        if (devUserId) {
            const devUserEmail = req.header("x-dev-user-email") || process.env.DEV_USER_EMAIL || null;
            req.user = {
                id: devUserId,
                email: devUserEmail ?? null,
            };
            next();
            return;
        }
    }
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
        email: data.user.email ?? null,
    };
    next();
};
