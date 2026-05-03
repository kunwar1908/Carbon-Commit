import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedTable<T extends Record<string, unknown>>(table: string, rows: T[], onConflict: string) {
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
  });

  if (error) {
    throw new Error(`Failed to seed ${table}: ${error.message}`);
  }
}

async function main() {
  console.log("Seeding DeptMaster...");

  await seedTable(
    "dept_master",
    [
      { name: "Computer Engineering", baseline: 500 },
      { name: "Mechanical Engineering", baseline: 600 },
      { name: "Electrical Engineering", baseline: 550 },
      { name: "Civil Engineering", baseline: 450 },
    ],
    "name",
  );

  console.log("Seeding EmissionRef...");

  await seedTable(
    "emission_ref",
    [
      { activity_type: "Electricity", factor: 0.82, unit: "kWh" },
      { activity_type: "Water", factor: 0.0003, unit: "L" },
      { activity_type: "Fuel", factor: 2.68, unit: "L" },
      { activity_type: "Waste", factor: 1.12, unit: "kg" },
    ],
    "activity_type",
  );

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
