import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
const supabaseAuthKey = env.supabaseServiceRoleKey || env.supabasePublishableKey || env.supabaseAnonKey;
if (!env.supabaseUrl || !supabaseAuthKey) {
    throw new Error("Missing Supabase auth environment variables. Set SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, or SUPABASE_ANON_KEY.");
}
export const supabaseAdmin = createClient(env.supabaseUrl, supabaseAuthKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
