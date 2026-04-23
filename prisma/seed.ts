import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/common/utils/hashing.utils';
import { AdminSeedData, PlansSeedData } from './seed-data';
import { PrismaPg } from '@prisma/adapter-pg';
import { UserRoleEnum } from '../src/common/enums/user-role.enum';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  console.log('creating admin...');

  const hashed = await hashPassword(AdminSeedData.password);

  const created = await prisma.user.upsert({
    where: {
      email: AdminSeedData.email,
    },
    update: {},
    create: {
      fullName: 'Seed Admin',
      ...AdminSeedData,
      password: hashed,
      role: UserRoleEnum.ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  console.log('admin created successfully.');
}

async function createPlans() {
  console.log('creating plans...');

  for (const plan of PlansSeedData) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }

  console.log('plans created successfully.');
}

async function main() {
  await createAdmin();
  await createPlans();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })

  .catch(async (e) => {
    console.error({ err: JSON.stringify(e, null, 2) });
    await prisma.$disconnect();
    process.exit(1);
  });
