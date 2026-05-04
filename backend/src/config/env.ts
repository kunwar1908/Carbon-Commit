import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["DATABASE_URL"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const databaseUrl = process.env.DATABASE_URL as string;
if (databaseUrl.startsWith("postgresql://") && (databaseUrl.match(/@/g) ?? []).length > 1) {
  throw new Error(
    "DATABASE_URL appears to include an unescaped '@' in the password. URL-encode it as '%40'.",
  );
}

export const env = {
  databaseUrl,
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  port: Number(process.env.PORT ?? 4000),
} as const;