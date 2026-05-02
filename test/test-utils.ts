import { PlansSeedData } from '../prisma/seed-data/plan.seed.data';
import { JwtServiceUtils } from '../src/common';
import {
  BillingCycleEnum,
  EnterprisePlanRequestStatusEnum,
  PlanKindEnum,
  SubscriptionStatusEnum,
} from '../src/common/enums';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const TABLE_NAMES = [
  'enterprise_plan_request_events',
  'enterprise_plan_requests',
  'subscription_events',
  'subscription_payments',
  'tenant_subscriptions',
  'tenant_usages',
  'plans',
  'tenants',
  'users',
];

export async function cleanDatabase(prisma: PrismaClient) {
  for (const tableName of TABLE_NAMES) {
    await prisma.$queryRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
  }
}

export async function seedStandardPlans(prisma: PrismaClient) {
  for (const plan of PlansSeedData) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }
}

export function decimal(value: number | string) {
  return new Prisma.Decimal(value);
}

export function createPlanInput(
  overrides: Partial<Prisma.PlanCreateInput> = {},
): Prisma.PlanCreateInput {
  return {
    name: `Plan ${Math.random().toString(36).slice(2, 10)}`,
    description: 'Generated test plan',
    sortOrder: 10,
    kind: PlanKindEnum.STANDARD,
    monthlyPrice: decimal(20),
    yearlyPrice: decimal(200),
    currency: 'USD',
    maxProjects: 10,
    maxUsers: 10,
    maxSessions: 10,
    maxRequests: 10,
    trialDays: 0,
    ...overrides,
  };
}

export async function createUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserCreateInput> = {},
) {
  const random = Math.random().toString(36).slice(2, 10);

  return prisma.user.create({
    data: {
      email: `user-${random}@example.com`,
      password: 'hashed-password',
      fullName: `User ${random}`,
      role: 'user',
      isActive: true,
      isVerified: true,
      ...overrides,
    },
  });
}

export async function createAdmin(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserCreateInput> = {},
) {
  return createUser(prisma, {
    role: 'admin',
    email: `admin-${Math.random().toString(36).slice(2, 10)}@example.com`,
    ...overrides,
  });
}

export async function createTenant(
  prisma: PrismaClient,
  overrides: Partial<Prisma.TenantUncheckedCreateInput> = {},
) {
  const ownerId = overrides.ownerId ?? (await createUser(prisma)).userId;
  const random = Math.random().toString(36).slice(2, 10);

  return prisma.tenant.create({
    data: {
      name: `tenant-${random}`,
      ownerId,
      ...overrides,
    },
  });
}

export async function createTenantUsage(
  prisma: PrismaClient,
  tenantId: string,
  overrides: Partial<Prisma.TenantUsageUncheckedCreateInput> = {},
) {
  return prisma.tenantUsage.create({
    data: {
      tenantId,
      projectsCount: 0,
      usersCount: 0,
      sessionsCount: 0,
      requestsCount: 0,
      ...overrides,
    },
  });
}

export async function createPlan(
  prisma: PrismaClient,
  overrides: Partial<Prisma.PlanCreateInput> = {},
) {
  return prisma.plan.create({
    data: createPlanInput(overrides),
  });
}

export async function createSubscription(
  prisma: PrismaClient,
  params: {
    tenantId: string;
    planId: string;
    status?: SubscriptionStatusEnum;
    billingCycle?: BillingCycleEnum;
    overrides?: Partial<Prisma.TenantSubscriptionUncheckedCreateInput>;
  },
) {
  const now = new Date();

  return prisma.tenantSubscription.create({
    data: {
      tenantId: params.tenantId,
      planId: params.planId,
      status: params.status ?? SubscriptionStatusEnum.ACTIVE,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      billingCycle: params.billingCycle ?? BillingCycleEnum.MONTHLY,
      nextBillingAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      priceSnapshot: decimal(20),
      quotaSnapshot: {
        maxProjects: 10,
        maxUsers: 10,
        maxSessions: 10,
        maxRequests: 10,
      },
      paymentProvider: 'tap',
      ...params.overrides,
    },
  });
}

export async function createEnterprisePlanRequest(
  prisma: PrismaClient,
  tenantId: string,
  overrides: Partial<Prisma.EnterprisePlanRequestUncheckedCreateInput> = {},
) {
  return prisma.enterprisePlanRequest.create({
    data: {
      tenantId,
      title: 'Enterprise request',
      description: 'Need higher limits',
      status: EnterprisePlanRequestStatusEnum.PENDING,
      ...overrides,
    },
  });
}

export async function createAccessToken(
  jwtServiceUtils: JwtServiceUtils,
  payload: {
    userId: string;
    tenantId?: string;
    email?: string;
    role?: string;
  },
) {
  return jwtServiceUtils.generateAccessToken({
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
    role: payload.role,
  });
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
