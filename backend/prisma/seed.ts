import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DeptMaster...');

  const depts = [
    { name: 'Computer Engineering', baseline: 500 },
    { name: 'Mechanical Engineering', baseline: 600 },
    { name: 'Electrical Engineering', baseline: 550 },
    { name: 'Civil Engineering', baseline: 450 },
  ];

  for (const d of depts) {
    await prisma.deptMaster.upsert({
      where: { name: d.name },
      update: { baseline: d.baseline },
      create: { name: d.name, baseline: d.baseline },
    });
  }

  console.log('Seeding EmissionRef...');

  const refs = [
    { activityType: 'Electricity', factor: 0.82, unit: 'kWh' },
    { activityType: 'Water', factor: 0.0003, unit: 'L' },
    { activityType: 'Fuel', factor: 2.68, unit: 'L' },
    { activityType: 'Waste', factor: 1.12, unit: 'kg' },
  ];

  for (const r of refs) {
    await prisma.emissionRef.upsert({
      where: { activityType: r.activityType },
      update: { factor: r.factor, unit: r.unit },
      create: { activityType: r.activityType, factor: r.factor, unit: r.unit },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
