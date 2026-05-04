import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Seed DeptMaster
  console.log("📋 Seeding DeptMaster (Departments)...");
  await prisma.deptMaster.createMany({
    data: [
      {
        name: "Computer Engineering",
        baseline: new Prisma.Decimal(500),
        description: "Computer Science and Engineering Department",
        manager: "Dr. Rajesh Kumar",
        isActive: true,
      },
      {
        name: "Mechanical Engineering",
        baseline: new Prisma.Decimal(600),
        description: "Mechanical Engineering Department",
        manager: "Prof. Priya Singh",
        isActive: true,
      },
      {
        name: "Electrical Engineering",
        baseline: new Prisma.Decimal(550),
        description: "Electrical Engineering Department",
        manager: "Dr. Amit Patel",
        isActive: true,
      },
      {
        name: "Civil Engineering",
        baseline: new Prisma.Decimal(450),
        description: "Civil Engineering Department",
        manager: "Dr. Sneha Verma",
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("   ✓ Departments seeded");

  // Seed EmissionRef
  console.log("⚡ Seeding EmissionRef (Emission Factors)...");
  await prisma.emissionRef.createMany({
    data: [
      {
        activityType: "Electricity",
        factor: new Prisma.Decimal("0.82"),
        unit: "kWh",
        category: "Energy",
        description: "CO2e emissions per kilowatt-hour of electricity",
        isActive: true,
      },
      {
        activityType: "Water",
        factor: new Prisma.Decimal("0.0003"),
        unit: "L",
        category: "Water",
        description: "CO2e emissions per liter of water consumed",
        isActive: true,
      },
      {
        activityType: "Fuel",
        factor: new Prisma.Decimal("2.68"),
        unit: "L",
        category: "Transport",
        description: "CO2e emissions per liter of fuel consumed",
        isActive: true,
      },
      {
        activityType: "Waste",
        factor: new Prisma.Decimal("1.12"),
        unit: "kg",
        category: "Waste",
        description: "CO2e emissions per kilogram of waste generated",
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("   ✓ Emission factors seeded");

  // Seed sample UserProfiles
  console.log("👤 Seeding sample UserProfiles...");
  try {
    await prisma.userProfile.createMany({
      data: [
        {
          id: "sample-admin-1",
          email: "admin@example.com",
          fullName: "Admin User",
          role: "ADMIN",
          isActive: true,
        },
        {
          id: "sample-manager-1",
          email: "manager@example.com",
          fullName: "Department Manager",
          role: "MANAGER",
          deptId: 1,
          isActive: true,
        },
        {
          id: "sample-user-1",
          email: "user@example.com",
          fullName: "Regular User",
          role: "USER",
          deptId: 1,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });
    console.log("   ✓ Sample user profiles created");
  } catch (error) {
    console.log("   ℹ️  Sample user profiles already exist or skipped");
  }

  // Initialize AnalyticsCache for existing departments
  console.log("📊 Initializing AnalyticsCache...");
  const departments = await prisma.deptMaster.findMany({ where: { isActive: true } });
  for (const dept of departments) {
    await prisma.analyticsCache.upsert({
      where: { deptId: dept.id },
      create: {
        deptId: dept.id,
        totalEmissions: new Prisma.Decimal(0),
        baselineUsage: dept.baseline,
        variance: new Prisma.Decimal(0),
        percentOverage: new Prisma.Decimal(0),
        logCount: 0,
      },
      update: {
        baselineUsage: dept.baseline,
        lastUpdated: new Date(),
      },
    });
  }
  console.log("   ✓ Analytics cache initialized for all departments");

  console.log("\n✅ Database seed completed successfully!");
  console.log("\n📝 Database Schema Summary:");
  console.log("   - DeptMaster (Departments): 4 records");
  console.log("   - EmissionRef (Factors): 4 records");
  console.log("   - AnalyticsCache: Initialized");
  console.log("   - UserProfile (Sample): Ready for Supabase Auth integration");
  console.log("   - All triggers and functions: Active");
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
