import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionMapper } from './mappers';
import { createLoggerMock, createPrismaMock } from '../../test/mock-helpers';
import { decimal } from '../../test/test-utils';
import {
  BillingCycleEnum,
  PlanKindEnum,
  SubscriptionEventTypeEnum,
  SubscriptionStatusEnum,
} from 'src/common';

describe('SubscriptionsService', () => {
  const prisma = createPrismaMock();
  const mapper = new SubscriptionMapper();
  const service = new SubscriptionsService(
    prisma,
    mapper,
    createLoggerMock() as any,
  );

  const runTransaction = () => {
    prisma.$transaction.mockImplementation(async (arg: any) =>
      typeof arg === 'function' ? arg(prisma) : arg,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    runTransaction();
  });

  it('startTrialForNewUser() creates a trial subscription and event', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      ownerId: 'user-1',
      subscription: null,
    } as any);
    prisma.plan.findFirst.mockResolvedValue({
      planId: 'plan-free',
      trialDays: 14,
      monthlyPrice: decimal(0),
      maxProjects: 2,
      maxUsers: 2,
      maxSessions: 2,
      maxRequests: 2,
    } as any);
    (prisma.tenantSubscription.create as any).mockImplementation(
      async ({ data }: any) => ({
        subscriptionId: 'sub-1',
        ...data,
      }),
    );

    const result = await service.startTrialForNewUser('user-1', 'tenant-1');

    expect(result.subscription.status).toBe(SubscriptionStatusEnum.TRIALING);
    expect(result.subscription.priceSnapshot?.toString()).toBe('0');
    expect(prisma.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: 'sub-1',
        type: SubscriptionEventTypeEnum.TRIAL_STARTED,
        toPlanId: 'plan-free',
      }),
    });
  });

  it('requestUpgradeToPaidPlan() throws when target plan does not exist', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      plan: { monthlyPrice: decimal(0) },
    } as any);
    prisma.plan.findUnique.mockResolvedValue(null);

    await expect(
      service.requestUpgradeToPaidPlan({
        tenantId: 'tenant-1',
        planId: 'missing',
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requestUpgradeToPaidPlan() throws for a free target plan', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      plan: { monthlyPrice: decimal(0) },
    } as any);
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'plan-free-2',
      isActive: true,
      kind: PlanKindEnum.STANDARD,
      tenantId: null,
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
    } as any);

    await expect(
      service.requestUpgradeToPaidPlan({
        tenantId: 'tenant-1',
        planId: 'plan-free-2',
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toThrow('Use trial flow for free plans');
  });

  it('requestUpgradeToPaidPlan() throws when already on the same plan', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      plan: { monthlyPrice: decimal(20) },
    } as any);
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'plan-pro',
      isActive: true,
      kind: PlanKindEnum.STANDARD,
      tenantId: null,
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
    } as any);

    await expect(
      service.requestUpgradeToPaidPlan({
        tenantId: 'tenant-1',
        planId: 'plan-pro',
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toThrow('Already on this plan');
  });

  it('requestUpgradeToPaidPlan() throws for another tenant enterprise plan', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      plan: { monthlyPrice: decimal(0) },
    } as any);
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'plan-enterprise',
      isActive: true,
      kind: PlanKindEnum.ENTERPRISE_CUSTOM,
      tenantId: 'other-tenant',
      monthlyPrice: decimal(100),
      yearlyPrice: decimal(1000),
    } as any);

    await expect(
      service.requestUpgradeToPaidPlan({
        tenantId: 'tenant-1',
        planId: 'plan-enterprise',
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toThrow('Enterprise plan not available for this tenant');
  });

  it('requestUpgradeToPaidPlan() sets pendingPlanId and writes payment_pending', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      status: SubscriptionStatusEnum.TRIALING,
      plan: { monthlyPrice: decimal(0) },
      tenant: {},
    } as any);
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'plan-pro',
      name: 'Pro',
      currency: 'USD',
      isActive: true,
      kind: PlanKindEnum.STANDARD,
      tenantId: null,
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
    } as any);

    const result = await service.requestUpgradeToPaidPlan({
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      billingCycle: BillingCycleEnum.MONTHLY,
    });

    expect(prisma.tenantSubscription.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: expect.objectContaining({
        pendingPlanId: 'plan-pro',
      }),
    });
    expect(prisma.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: SubscriptionEventTypeEnum.PAYMENT_PENDING,
        toPlanId: 'plan-pro',
      }),
    });
    expect(result.amount).toBe(20);
  });

  it('activateAfterSuccessfulPayment() returns early on duplicate providerEventId', async () => {
    // activateAfterSuccessfulPayment()
    // Returns updated subscription for success
    // Returns existing payment for duplicate event

    prisma.tenantSubscription.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
    } as any);
    prisma.subscriptionPayment.findUnique.mockResolvedValue({
      paymentId: 'pay-1',
      providerEventId: 'evt-1',
    } as any);

    const result = await service.activateAfterSuccessfulPayment({
      tenantId: 'tenant-1',
      provider: 'tap',
      providerEventId: 'evt-1',
      tapCardId: 'card-1',
      tapCustomerId: 'customer-1',
      tapPaymentAgreementId: 'agreement-1',
      amount: 20,
      currency: 'USD',
      billingCycle: BillingCycleEnum.MONTHLY,
    });

    // must return the subscription payment after found with the same providerEventId

    expect(result).toEqual(
      expect.objectContaining({ providerEventId: 'evt-1' }),
    );
    expect(prisma.subscriptionPayment.create).not.toHaveBeenCalled();
  });

  it('activateAfterSuccessfulPayment() activates a trialing subscription and clears pending fields', async () => {
    // activateAfterSuccessfulPayment()
    // Returns updated subscription for success
    // Returns existing payment for duplicate event

    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      pendingPlanId: 'plan-pro',
      status: SubscriptionStatusEnum.TRIALING,
      billingCycle: BillingCycleEnum.MONTHLY,
      quotaSnapshot: { maxProjects: 2 },
      priceSnapshot: decimal(0),
      plan: { planId: 'plan-free' },
    } as any);
    prisma.subscriptionPayment.findUnique.mockResolvedValue(null);
    prisma.subscriptionPayment.create.mockResolvedValue({
      paymentId: 'pay-1',
    } as any);
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'plan-pro',
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
      maxProjects: 10,
      maxUsers: 10,
      maxSessions: 10,
      maxRequests: 10,
    } as any);
    (prisma.tenantSubscription.update as any).mockImplementation(
      async ({ data }: any) => ({
        subscriptionId: 'sub-1',
        ...data,
      }),
    );

    const result = await service.activateAfterSuccessfulPayment({
      tenantId: 'tenant-1',
      provider: 'tap',
      providerEventId: 'evt-1',
      providerPaymentRef: 'charge-1',
      tapCardId: 'card-1',
      tapCustomerId: 'customer-1',
      tapPaymentAgreementId: 'agreement-1',
      amount: 20,
      currency: 'USD',
      billingCycle: BillingCycleEnum.MONTHLY,
    });

    // must return the subscription after update with the status ACTIVE

    expect(result.status).toBe(SubscriptionStatusEnum.ACTIVE);
    expect((result as any).planId).toBe('plan-pro');
    expect((result as any).pendingPlanId).toBeNull();
    expect(prisma.subscriptionEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          type: SubscriptionEventTypeEnum.PAYMENT_SUCCEEDED,
        }),
        expect.objectContaining({
          type: SubscriptionEventTypeEnum.UPGRADED,
        }),
      ]),
    });
  });

  it('markPaymentFailed() returns early on duplicate providerEventId', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
    } as any);
    prisma.subscriptionPayment.findUnique.mockResolvedValue({
      paymentId: 'pay-1',
    } as any);

    const result = await service.markPaymentFailed({
      tenantId: 'tenant-1',
      providerEventId: 'evt-1',
      amount: 20,
      currency: 'USD',
    });

    expect(result).toEqual(expect.objectContaining({ paymentId: 'pay-1' }));
    expect(prisma.subscriptionPayment.create).not.toHaveBeenCalled();
  });

  it('markPaymentFailed() records a failed payment and increments retryCount', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      retryCount: 2,
    } as any);
    prisma.subscriptionPayment.findUnique.mockResolvedValue(null);
    prisma.subscriptionPayment.create.mockResolvedValue({
      paymentId: 'pay-1',
    } as any);

    await service.markPaymentFailed({
      tenantId: 'tenant-1',
      providerEventId: 'evt-1',
      amount: 20,
      currency: 'USD',
      failureReason: 'declined',
    });

    expect(prisma.tenantSubscription.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: expect.objectContaining({
        status: SubscriptionStatusEnum.ACTIVE,
        retryCount: { increment: 1 },
      }),
    });
    expect(prisma.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: SubscriptionEventTypeEnum.PAYMENT_FAILED,
      }),
    });
  });

  it('processTrialExpirations() emits trial_expired for expired trials', async () => {
    prisma.tenantSubscription.findMany.mockResolvedValue([
      {
        subscriptionId: 'sub-1',
        planId: 'plan-free',
        trialEndsAt: new Date(Date.now() - 60_000),
      },
    ] as any);

    await service.processTrialExpirations();

    expect(prisma.subscriptionEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          subscriptionId: 'sub-1',
          type: SubscriptionEventTypeEnum.TRIAL_EXPIRED,
        }),
      ],
    });
  });

  it('movePastDueSubscriptions() promotes eligible subscriptions to past_due', async () => {
    prisma.tenantSubscription.updateManyAndReturn.mockResolvedValue([
      {
        subscriptionId: 'sub-1',
        planId: 'plan-pro',
      },
    ] as any);

    await service.movePastDueSubscriptions();

    expect(prisma.subscriptionEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          subscriptionId: 'sub-1',
          type: SubscriptionEventTypeEnum.PAST_DUE,
        }),
      ],
    });
  });

  it('moveSuspendedSubscriptions() promotes eligible subscriptions to suspended', async () => {
    prisma.tenantSubscription.updateManyAndReturn.mockResolvedValue([
      {
        subscriptionId: 'sub-1',
        planId: 'plan-pro',
      },
    ] as any);

    await service.moveSuspendedSubscriptions();

    expect(prisma.subscriptionEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          subscriptionId: 'sub-1',
          type: SubscriptionEventTypeEnum.SUSPENDED,
        }),
      ],
    });
  });

  it('moveExpiredSubscriptions() expires suspended subscriptions older than 60 days', async () => {
    prisma.tenantSubscription.findMany.mockResolvedValue([
      {
        subscriptionId: 'sub-1',
        tenantId: 'tenant-1',
        planId: 'plan-pro',
        suspendedAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
      },
    ] as any);

    await service.moveExpiredSubscriptions();

    expect(prisma.tenantSubscription.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: {
        status: SubscriptionStatusEnum.EXPIRED,
        nextBillingAt: null,
      },
    });
    expect(prisma.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: SubscriptionEventTypeEnum.EXPIRED,
      }),
    });
  });

  it('moveCancelledSubscriptions() finalizes cancellations at period end', async () => {
    prisma.tenantSubscription.updateManyAndReturn.mockResolvedValue([
      {
        subscriptionId: 'sub-1',
        planId: 'plan-pro',
        currentPeriodEnd: new Date(Date.now() - 60_000),
      },
    ] as any);

    await service.moveCancelledSubscriptions();

    expect(prisma.subscriptionEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          subscriptionId: 'sub-1',
          type: SubscriptionEventTypeEnum.CANCELLED,
          meta: expect.objectContaining({
            finalizedByCron: true,
          }),
        }),
      ],
    });
  });

  it('scheduleDowngrade() schedules a lower plan for currentPeriodEnd', async () => {
    const currentPeriodEnd = new Date(Date.now() + 60_000);
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      currentPeriodEnd,
      plan: {
        monthlyPrice: decimal(50),
      },
    } as any);
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'plan-basic',
      isActive: true,
      kind: PlanKindEnum.STANDARD,
      tenantId: null,
      monthlyPrice: decimal(20),
    } as any);

    const result = await service.scheduleDowngrade({
      tenantId: 'tenant-1',
      targetPlanId: 'plan-basic',
    });

    expect(result.effectiveAt).toEqual(currentPeriodEnd);
    expect(prisma.tenantSubscription.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: {
        pendingPlanId: 'plan-basic',
        pendingPlanEffectiveAt: currentPeriodEnd,
      },
    });
  });

  it('cancelSubscription() marks active subscriptions for period-end cancellation', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      status: SubscriptionStatusEnum.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 60_000),
    } as any);
    prisma.tenantSubscription.update.mockResolvedValue({
      subscriptionId: 'sub-1',
      cancelAtPeriodEnd: true,
    } as any);

    const result = await service.cancelSubscription('tenant-1');

    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(prisma.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: SubscriptionEventTypeEnum.CANCELLED,
      }),
    });
  });

  it('cancelSubscription() rejects suspended subscriptions', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      status: SubscriptionStatusEnum.SUSPENDED,
    } as any);

    await expect(service.cancelSubscription('tenant-1')).rejects.toThrow(
      'Only active and past due subscriptions can be cancelled',
    );
  });

  it('requestResubscribeToSuspendedSubscription() rejects non-suspended subscriptions', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.ACTIVE,
    } as any);

    await expect(
      service.requestResubscribeToSuspendedSubscription({
        tenantId: 'tenant-1',
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toThrow('Only suspended subscriptions can be resubscribed');
  });

  it('requestResubscribeToSuspendedSubscription() rejects suspended subscriptions after 60 days', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatusEnum.SUSPENDED,
      suspendedAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
      plan: { monthlyPrice: decimal(20), yearlyPrice: decimal(200) },
      tenant: {},
    } as any);

    await expect(
      service.requestResubscribeToSuspendedSubscription({
        tenantId: 'tenant-1',
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toThrow('Reactivation window expired');
  });

  it('applyScheduledDowngrade() swaps the plan and clears pending fields', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      billingCycle: BillingCycleEnum.MONTHLY,
      pendingPlan: {
        planId: 'plan-basic',
        monthlyPrice: decimal(20),
        yearlyPrice: decimal(200),
        maxProjects: 10,
        maxUsers: 10,
        maxSessions: 10,
        maxRequests: 10,
      },
    } as any);
    prisma.tenantSubscription.update.mockResolvedValue({
      subscriptionId: 'sub-1',
    } as any);

    await service.applyScheduledDowngrade({
      tenantId: 'tenant-1',
      subscriptionId: 'sub-1',
    });

    expect(prisma.tenantSubscription.update).toHaveBeenCalledWith({
      where: { subscriptionId: 'sub-1' },
      data: expect.objectContaining({
        planId: 'plan-basic',
        pendingPlanId: null,
        pendingPlanEffectiveAt: null,
      }),
    });
    expect(prisma.subscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: SubscriptionEventTypeEnum.DOWNGRADED,
      }),
    });
  });

  it('getSubscriptionByTenantId() throws when not found', async () => {
    prisma.tenantSubscription.findUnique.mockResolvedValue(null);

    await expect(
      service.getSubscriptionByTenantId('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
