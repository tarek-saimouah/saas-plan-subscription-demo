import { PlansSeedData } from '../prisma/seed-data/plan.seed.data';
import { PrismaClient } from '../src/generated/prisma/client';

export async function cleanDatabase(prisma: PrismaClient) {
  console.log('cleaning database...');

  const tableNames = ['users', 'plans']; // Add your models here

  for (const tableName of tableNames) {
    await prisma.$queryRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
  }
}

export async function seedStandardPlans(prisma: PrismaClient) {
  console.log('creating plans...');

  for (const plan of PlansSeedData) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }
}
