import { Prisma, PrismaClient } from "@prisma/client";
import "../src/config/env.js";

const prisma = new PrismaClient();

const demoDepartments = [
  {
    name: "Computer Science and Engineering",
    baseline: 520,
    description: "Academic and lab workloads for software, AI, and systems courses.",
    manager: "Dr. Aman Gupta",
    category: "academic",
  },
  {
    name: "Electronics and Communication Engineering",
    baseline: 540,
    description: "Signal processing, embedded systems, and communication labs.",
    manager: "Prof. Nidhi Sharma",
    category: "lab",
  },
  {
    name: "Mechanical Engineering",
    baseline: 620,
    description: "Workshop, machine shop, and thermal systems operations.",
    manager: "Dr. Rohit Bansal",
    category: "operations",
  },
  {
    name: "Civil Engineering",
    baseline: 470,
    description: "Construction lab, survey work, and campus maintenance support.",
    manager: "Dr. Sneha Verma",
    category: "operations",
  },
  {
    name: "Electrical Engineering",
    baseline: 560,
    description: "Power systems, lab equipment, and instrumentation usage.",
    manager: "Dr. Amit Patel",
    category: "lab",
  },
  {
    name: "Chemical Engineering",
    baseline: 510,
    description: "Process labs, utilities, and controlled consumable handling.",
    manager: "Prof. Asha Mehta",
    category: "lab",
  },
  {
    name: "Biotechnology",
    baseline: 500,
    description: "Wet labs, sterilization, cold storage, and consumable tracking.",
    manager: "Dr. Priya Malhotra",
    category: "lab",
  },
  {
    name: "School of Mathematics and Computing",
    baseline: 430,
    description: "Teaching and research workloads with lower physical resource use.",
    manager: "Prof. Kabir Singh",
    category: "academic",
  },
  {
    name: "School of Physics and Materials",
    baseline: 450,
    description: "Instrument rooms, research labs, and sample preparation activity.",
    manager: "Dr. Meera Sethi",
    category: "lab",
  },
  {
    name: "School of Chemistry and Biochemistry",
    baseline: 460,
    description: "Analytical labs, chemical handling, and glassware cleaning cycles.",
    manager: "Dr. Arjun Khanna",
    category: "lab",
  },
  {
    name: "Hostel and Residential Services",
    baseline: 780,
    description: "Residential electricity, water, and kitchen demand.",
    manager: "Mr. Varun Chadha",
    category: "residential",
  },
  {
    name: "Campus Transport and Logistics",
    baseline: 860,
    description: "Vehicle fuel, shuttle movement, and goods handling across campus.",
    manager: "Ms. Riya Arora",
    category: "transport",
  },
  {
    name: "Library and Learning Resources",
    baseline: 390,
    description: "Reading halls, printing, and digital access support services.",
    manager: "Dr. Kavita Bedi",
    category: "academic",
  },
  {
    name: "Canteen and Dining Services",
    baseline: 710,
    description: "Food preparation, refrigeration, waste segregation, and utilities.",
    manager: "Mr. Sanjay Mehra",
    category: "residential",
  },
  {
    name: "Sports and Recreation",
    baseline: 400,
    description: "Grounds maintenance, lighting, and event-day utility spikes.",
    manager: "Ms. Neha Batra",
    category: "operations",
  },
] as const;

const demoEmissionFactors = [
  {
    activityType: "Electricity",
    factor: new Prisma.Decimal("0.82"),
    unit: "kWh",
    category: "Energy",
    description: "CO2e emissions per kilowatt-hour of electricity",
  },
  {
    activityType: "Water",
    factor: new Prisma.Decimal("0.0003"),
    unit: "L",
    category: "Water",
    description: "CO2e emissions per liter of water consumed",
  },
  {
    activityType: "Fuel",
    factor: new Prisma.Decimal("2.68"),
    unit: "L",
    category: "Transport",
    description: "CO2e emissions per liter of fuel consumed",
  },
  {
    activityType: "Waste",
    factor: new Prisma.Decimal("1.12"),
    unit: "kg",
    category: "Waste",
    description: "CO2e emissions per kilogram of waste generated",
  },
  {
    activityType: "Paper",
    factor: new Prisma.Decimal("0.95"),
    unit: "kg",
    category: "Materials",
    description: "CO2e emissions per kilogram of paper consumed",
  },
  {
    activityType: "LPG",
    factor: new Prisma.Decimal("3.00"),
    unit: "kg",
    category: "Energy",
    description: "CO2e emissions per kilogram of LPG consumed",
  },
  {
    activityType: "Campus Shuttle",
    factor: new Prisma.Decimal("0.18"),
    unit: "km",
    category: "Transport",
    description: "CO2e emissions per shuttle kilometer traveled",
  },
  {
    activityType: "Lab Consumables",
    factor: new Prisma.Decimal("2.10"),
    unit: "kg",
    category: "Lab",
    description: "CO2e emissions per kilogram of research consumables",
  },
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const activityPlans = {
  academic: [
    { activityType: "Electricity", baseUnits: 280, notes: "Lecture halls and computer labs" },
    { activityType: "Water", baseUnits: 18000, notes: "Washrooms and landscaping" },
    { activityType: "Paper", baseUnits: 28, notes: "Admissions, assignments, and notices" },
    { activityType: "Waste", baseUnits: 36, notes: "Mixed waste and recycling pickup" },
  ],
  lab: [
    { activityType: "Electricity", baseUnits: 320, notes: "Research equipment and lab lighting" },
    { activityType: "Lab Consumables", baseUnits: 18, notes: "Glassware, reagents, and sample prep" },
    { activityType: "Water", baseUnits: 22000, notes: "Cleaning and lab utility usage" },
    { activityType: "Waste", baseUnits: 42, notes: "Consumable waste and segregation" },
  ],
  residential: [
    { activityType: "Electricity", baseUnits: 360, notes: "Hostel rooms and common areas" },
    { activityType: "LPG", baseUnits: 26, notes: "Kitchen and dining fuel usage" },
    { activityType: "Water", baseUnits: 34000, notes: "Residential water demand" },
    { activityType: "Waste", baseUnits: 48, notes: "Food waste and daily collection" },
  ],
  transport: [
    { activityType: "Fuel", baseUnits: 92, notes: "Bus and maintenance fleet fuel" },
    { activityType: "Campus Shuttle", baseUnits: 480, notes: "Internal shuttle movement" },
    { activityType: "Electricity", baseUnits: 210, notes: "Logistics office and depot lighting" },
    { activityType: "Waste", baseUnits: 28, notes: "Workshop and operations waste" },
  ],
  operations: [
    { activityType: "Electricity", baseUnits: 245, notes: "Building services and support areas" },
    { activityType: "Water", baseUnits: 14000, notes: "Maintenance and grounds watering" },
    { activityType: "Fuel", baseUnits: 64, notes: "Short-haul equipment and utility vehicles" },
    { activityType: "Waste", baseUnits: 30, notes: "Maintenance and event-day disposal" },
  ],
} as const;

const getDepartmentMultiplier = (index: number, category: keyof typeof activityPlans) => {
  const base = 1 + (index % 4) * 0.08;
  if (category === "transport") {
    return base + 0.2;
  }
  if (category === "residential") {
    return base + 0.12;
  }
  if (category === "lab") {
    return base + 0.06;
  }
  return base;
};

const buildActivityLogs = (departmentId: number, userId: string, category: keyof typeof activityPlans, index: number) => {
  const multiplier = getDepartmentMultiplier(index, category);
  const timestampSeed = Date.now() - index * 6 * 24 * 60 * 60 * 1000;

  return activityPlans[category].map((plan, planIndex) => {
    const units = Number((plan.baseUnits * multiplier).toFixed(3));
    const factor = demoEmissionFactors.find((item) => item.activityType === plan.activityType)?.factor ?? new Prisma.Decimal(1);
    const co2Result = new Prisma.Decimal(units).mul(factor);

    return {
      userId,
      deptId: departmentId,
      activityId: plan.activityType,
      units: new Prisma.Decimal(units),
      co2Result,
      notes: plan.notes,
      timestamp: new Date(timestampSeed - planIndex * 18 * 60 * 60 * 1000),
    };
  });
};

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Seed DeptMaster
  console.log("📋 Seeding DeptMaster (Departments)...");
  await prisma.deptMaster.createMany({
    data: demoDepartments.map((department) => ({
      name: department.name,
      baseline: new Prisma.Decimal(department.baseline),
      description: department.description,
      manager: department.manager,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  console.log(`   ✓ ${demoDepartments.length} departments seeded`);

  // Seed EmissionRef
  console.log("⚡ Seeding EmissionRef (Emission Factors)...");
  await prisma.emissionRef.createMany({
    data: demoEmissionFactors.map((activity) => ({
      activityType: activity.activityType,
      factor: activity.factor,
      unit: activity.unit,
      category: activity.category,
      description: activity.description,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  console.log(`   ✓ ${demoEmissionFactors.length} emission factors seeded`);

  const departments = await prisma.deptMaster.findMany({
    where: {
      name: {
        in: demoDepartments.map((department) => department.name),
      },
    },
    orderBy: { id: "asc" },
  });

  const departmentByName = new Map(departments.map((department) => [department.name, department]));

  // Seed sample UserProfiles
  console.log("👤 Seeding sample UserProfiles...");
  const demoProfiles = [
    {
      id: "carbon-admin-1",
      email: "carbon.admin@tiet.demo",
      fullName: "Campus Sustainability Admin",
      role: "ADMIN",
      isActive: true,
    },
    ...demoDepartments.map((department) => {
      const record = departmentByName.get(department.name);

      if (!record) {
        throw new Error(`Missing department seed: ${department.name}`);
      }

      const slug = slugify(department.name);

      return {
        id: `${slug}-lead`,
        email: `${slug}.lead@tiet.demo`,
        fullName: `${department.name} Lead`,
        role: "MANAGER" as const,
        deptId: record.id,
        isActive: true,
      };
    }),
  ];

  try {
    await prisma.userProfile.createMany({
      data: demoProfiles, // type ignore
      skipDuplicates: true,
    });
    console.log(`   ✓ ${demoProfiles.length} sample user profiles created`);
  } catch (error) {
    console.log("   ℹ️  Sample user profiles already exist or skipped");
  }

  // Initialize AnalyticsCache for existing departments
  console.log("📊 Initializing AnalyticsCache...");
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

  const existingDemoLogs = await prisma.activityLogs.count({
    where: {
      userId: {
        in: demoProfiles.map((profile) => profile.id),
      },
    },
  });

  if (existingDemoLogs === 0) {
    console.log("🧪 Seeding Thapar-inspired activity logs...");
    const demoLogs = departments.flatMap((department, index) => {
      const profile = demoProfiles.find((entry) => entry.deptId === department.id);

      if (!profile) {
        return [];
      }

      const category = demoDepartments.find((entry) => entry.name === department.name)?.category ?? "academic";
      return buildActivityLogs(department.id, profile.id, category, index);
    });

    await prisma.activityLogs.createMany({ data: demoLogs });
    console.log(`   ✓ ${demoLogs.length} activity logs seeded`);
  } else {
    console.log(`   ℹ️  Skipping activity log seed because ${existingDemoLogs} demo logs already exist`);
  }

  console.log("\n✅ Database seed completed successfully!");
  console.log("\n📝 Database Schema Summary:");
  console.log(`   - DeptMaster (Departments): ${demoDepartments.length} records`);
  console.log(`   - EmissionRef (Factors): ${demoEmissionFactors.length} records`);
  console.log("   - AnalyticsCache: Initialized");
  console.log(`   - UserProfile (Sample): ${demoProfiles.length} records`);
  console.log("   - ActivityLogs: Thapar-inspired demo dataset ready");
  console.log("   - All triggers and functions: Active");
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
