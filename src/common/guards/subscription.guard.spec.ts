import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionGuard } from './subscription.guard';
import { createPrismaMock } from '../../../test/mock-helpers';
import { SubscriptionUsageLimitsService } from 'src/subscriptions';
import {
  PlanKindEnum,
  SubscriptionStatusEnum,
} from 'src/common/enums';
import {
  PUBLIC_KEY,
  QUOTA_KEY,
  SUBSCRIPTION_KEY,
} from 'src/common/decorators';

describe('SubscriptionGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const prisma = createPrismaMock();
  const usageLimitsService = {
    isLimitExceeded: jest.fn(),
  } as unknown as SubscriptionUsageLimitsService;
  const guard = new SubscriptionGuard(reflector, prisma, usageLimitsService);

  const createContext = (user?: any) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    (reflector.getAllAndOverride as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === PUBLIC_KEY) return false;
        if (key === SUBSCRIPTION_KEY) return { allowTrial: true };
        if (key === QUOTA_KEY) return undefined;
        return undefined;
      },
    );
  });

  it('throws when JWT has no tenantId', async () => {
    await expect(guard.canActivate(createContext({ userId: 'user-1' }))).rejects
      .toBeInstanceOf(ForbiddenException);
  });

  it('throws when tenant has no subscription', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', tenantId: 't-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks enterprise plans owned by another tenant', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.ACTIVE,
      trialEndsAt: null,
      currentPeriodEnd: new Date(Date.now() + 60_000),
      plan: {
        kind: PlanKindEnum.ENTERPRISE_CUSTOM,
        tenantId: 'other-tenant',
      },
      tenant: { usage: {} },
    } as any);

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', tenantId: 't-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks cancelled subscriptions on active routes', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.CANCELLED,
      trialEndsAt: null,
      currentPeriodEnd: new Date(Date.now() + 60_000),
      plan: {
        kind: PlanKindEnum.STANDARD,
        tenantId: null,
      },
      tenant: { usage: {} },
    } as any);

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', tenantId: 't-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('passes for a valid trialing subscription', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.TRIALING,
      trialEndsAt: new Date(Date.now() + 60_000),
      currentPeriodEnd: new Date(Date.now() + 60_000),
      plan: {
        kind: PlanKindEnum.STANDARD,
        tenantId: null,
      },
      tenant: { usage: {} },
    } as any);

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', tenantId: 't-1' })),
    ).resolves.toBe(true);
  });

  it('throws when quota is exceeded', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === PUBLIC_KEY) return false;
        if (key === SUBSCRIPTION_KEY) return { allowActive: true };
        if (key === QUOTA_KEY) return 'maxProjects';
        return undefined;
      },
    );
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.ACTIVE,
      trialEndsAt: null,
      currentPeriodEnd: new Date(Date.now() + 60_000),
      plan: {
        kind: PlanKindEnum.STANDARD,
        tenantId: null,
      },
      tenant: { usage: { projectsCount: 2 } },
    } as any);
    (usageLimitsService.isLimitExceeded as jest.Mock).mockImplementation(() => {
      throw new ForbiddenException('Quota exceeded: (max projects)');
    });

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', tenantId: 't-1' })),
    ).rejects.toThrow('Quota exceeded: (max projects)');
  });

  it('throws when a trial timestamp is stale', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.TRIALING,
      trialEndsAt: new Date(Date.now() - 60_000),
      currentPeriodEnd: new Date(Date.now() + 60_000),
      plan: {
        kind: PlanKindEnum.STANDARD,
        tenantId: null,
      },
      tenant: { usage: {} },
    } as any);

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', tenantId: 't-1' })),
    ).rejects.toThrow('Trial expired');
  });
});
