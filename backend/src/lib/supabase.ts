import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  throw new Error("Missing Supabase auth environment variables.");
}

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
