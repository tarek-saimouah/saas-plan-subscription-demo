import { PrismaService } from 'src/database';
import { SubscriptionMapper } from 'src/subscriptions/mappers';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { createLoggerMock } from './mock-helpers';
import {
  BillingCycleEnum,
  EnterprisePlanRequestStatusEnum,
  PlanKindEnum,
  SubscriptionEventTypeEnum,
  SubscriptionStatusEnum,
} from 'src/common';
import {
  cleanDatabase,
  createEnterprisePlanRequest,
  createPlan,
  createSubscription,
  createTenant,
  createTenantUsage,
  decimal,
} from './test-utils';
import { EnterprisePlanRequestsService } from 'src/enterprise-plan-requests/enterprise-plan-requests.service';
import { TenantProfilesService } from 'src/tenants/tenant-profiles.service';
import { TenantMapper } from 'src/tenants/mappers';
import { SubscriptionUsageLimitsService } from 'src/subscriptions/subscription-usage-limits.service';
import { createAdmin } from './test-utils';

describe('Billing integration (DB)', () => {
  let prisma: PrismaService;
  let subscriptionsService: SubscriptionsService;
  let enterpriseRequestsService: EnterprisePlanRequestsService;
  let tenantProfilesService: TenantProfilesService;

  jest.setTimeout(30_000);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    subscriptionsService = new SubscriptionsService(
      prisma,
      new SubscriptionMapper(),
      createLoggerMock() as any,
    );
    enterpriseRequestsService = new EnterprisePlanRequestsService(prisma);
    tenantProfilesService = new TenantProfilesService(
      prisma,
      new TenantMapper(),
      new SubscriptionUsageLimitsService(),
    );
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  }, 10_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('boots a trial subscription and writes trial_started', async () => {
    const tenant = await createTenant(prisma);
    await createPlan(prisma, {
      name: 'Free Plan',
      kind: PlanKindEnum.STANDARD,
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
      trialDays: 14,
      maxProjects: 2,
      maxUsers: 2,
      maxSessions: 2,
      maxRequests: 2,
    });

    await subscriptionsService.startTrialForNewUser(
      tenant.ownerId,
      tenant.tenantId,
    );

    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId: tenant.tenantId },
    });
    const events = await prisma.subscriptionEvent.findMany({
      where: { subscriptionId: subscription!.subscriptionId },
    });

    expect(subscription?.status).toBe(SubscriptionStatusEnum.TRIALING);
    expect(subscription?.priceSnapshot?.toString()).toBe('0');
    expect(
      events.some(
        (event) => event.type === SubscriptionEventTypeEnum.TRIAL_STARTED,
      ),
    ).toBe(true);
  });

  it('upgrades a trial subscription and activates it through the webhook path with payment deduplication', async () => {
    const tenant = await createTenant(prisma);
    const freePlan = await createPlan(prisma, {
      name: 'Free Plan',
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
      trialDays: 14,
    });
    const paidPlan = await createPlan(prisma, {
      name: 'Pro Plan',
      monthlyPrice: decimal(50),
      yearlyPrice: decimal(500),
    });

    await createSubscription(prisma, {
      tenantId: tenant.tenantId,
      planId: freePlan.planId,
      status: SubscriptionStatusEnum.TRIALING,
      billingCycle: BillingCycleEnum.MONTHLY,
      overrides: {
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        nextBillingAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        priceSnapshot: decimal(0),
      },
    });

    await subscriptionsService.requestUpgradeToPaidPlan({
      tenantId: tenant.tenantId,
      planId: paidPlan.planId,
      billingCycle: BillingCycleEnum.MONTHLY,
    });

    const pending = await prisma.tenantSubscription.findUnique({
      where: { tenantId: tenant.tenantId },
    });
    expect(pending?.pendingPlanId).toBe(paidPlan.planId);

    await subscriptionsService.activateAfterSuccessfulPayment({
      tenantId: tenant.tenantId,
      provider: 'tap',
      providerEventId: 'evt_001',
      providerPaymentRef: 'charge_001',
      tapCardId: 'card_1',
      tapCustomerId: 'customer_1',
      tapPaymentAgreementId: 'agreement_1',
      amount: 50,
      currency: 'USD',
      billingCycle: BillingCycleEnum.MONTHLY,
    });

    await subscriptionsService.activateAfterSuccessfulPayment({
      tenantId: tenant.tenantId,
      provider: 'tap',
      providerEventId: 'evt_001',
      providerPaymentRef: 'charge_001',
      tapCardId: 'card_1',
      tapCustomerId: 'customer_1',
      tapPaymentAgreementId: 'agreement_1',
      amount: 50,
      currency: 'USD',
      billingCycle: BillingCycleEnum.MONTHLY,
    });

    const active = await prisma.tenantSubscription.findUnique({
      where: { tenantId: tenant.tenantId },
    });
    const payments = await prisma.subscriptionPayment.findMany({
      where: { subscriptionId: active!.subscriptionId },
    });

    expect(active?.status).toBe(SubscriptionStatusEnum.ACTIVE);
    expect(active?.planId).toBe(paidPlan.planId);
    expect(active?.pendingPlanId).toBeNull();
    expect(active?.tapPaymentAgreementId).toBe('agreement_1');
    expect(payments).toHaveLength(1);
  });

  it('applies a scheduled downgrade when the effective time has passed', async () => {
    const tenant = await createTenant(prisma);
    const proPlan = await createPlan(prisma, {
      name: 'Pro Plan',
      monthlyPrice: decimal(50),
      yearlyPrice: decimal(500),
    });
    const basicPlan = await createPlan(prisma, {
      name: 'Basic Plan',
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
    });

    const subscription = await createSubscription(prisma, {
      tenantId: tenant.tenantId,
      planId: proPlan.planId,
      status: SubscriptionStatusEnum.ACTIVE,
      billingCycle: BillingCycleEnum.MONTHLY,
      overrides: {
        priceSnapshot: decimal(50),
        quotaSnapshot: {
          maxProjects: 40,
          maxUsers: 40,
          maxSessions: 40,
          maxRequests: 40,
        },
      },
    });

    await subscriptionsService.scheduleDowngrade({
      tenantId: tenant.tenantId,
      targetPlanId: basicPlan.planId,
    });

    await prisma.tenantSubscription.update({
      where: { subscriptionId: subscription.subscriptionId },
      data: {
        pendingPlanEffectiveAt: new Date(Date.now() - 60_000),
      },
    });

    await subscriptionsService.applyScheduledDowngrade({
      tenantId: tenant.tenantId,
      subscriptionId: subscription.subscriptionId,
    });

    const updated = await prisma.tenantSubscription.findUnique({
      where: { tenantId: tenant.tenantId },
    });
    const downgradeEvent = await prisma.subscriptionEvent.findFirst({
      where: {
        subscriptionId: subscription.subscriptionId,
        type: SubscriptionEventTypeEnum.DOWNGRADED,
      },
    });

    expect(updated?.planId).toBe(basicPlan.planId);
    expect(updated?.pendingPlanId).toBeNull();
    expect(updated?.priceSnapshot?.toString()).toBe('20');
    expect(downgradeEvent).toBeTruthy();
  });

  it('enforces quota limits at the service level and increments usage when under limit', async () => {
    const tenant = await createTenant(prisma);
    const plan = await createPlan(prisma, {
      name: 'Quota Plan',
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
      maxProjects: 2,
    });

    await createTenantUsage(prisma, tenant.tenantId, { projectsCount: 2 });
    await createSubscription(prisma, {
      tenantId: tenant.tenantId,
      planId: plan.planId,
      status: SubscriptionStatusEnum.ACTIVE,
    });

    await expect(
      tenantProfilesService.tenantSubscriptionResourceUse({
        tenantId: tenant.tenantId,
        resourceKey: 'projectsCount',
      }),
    ).rejects.toThrow('Quota exceeded: (max projects)');

    await prisma.tenantUsage.update({
      where: { tenantId: tenant.tenantId },
      data: { projectsCount: 0 },
    });

    const usage = await tenantProfilesService.tenantSubscriptionResourceUse({
      tenantId: tenant.tenantId,
      resourceKey: 'projectsCount',
    });

    expect(usage.projectsCount).toBe(1);
  });

  it('executes the enterprise request workflow and enforces enterprise ownership isolation', async () => {
    const tenantA = await createTenant(prisma);
    const tenantB = await createTenant(prisma);
    const request = await createEnterprisePlanRequest(prisma, tenantA.tenantId);
    const adminUserId = (await createAdmin(prisma)).userId;

    await enterpriseRequestsService.reviewRequest({
      requestId: request.requestId,
      adminUserId,
      payload: {
        status: EnterprisePlanRequestStatusEnum.CONTACTED,
        adminNotes: 'Reached out',
      },
    });

    const approved = await enterpriseRequestsService.approveAndCreatePlan({
      requestId: request.requestId,
      adminUserId,
      payload: {
        name: 'Tenant A Enterprise',
        description: 'Custom enterprise plan',
        monthlyPrice: 120,
        yearlyPrice: 1200,
        currency: 'USD',
        maxProjects: 100,
        maxUsers: 100,
        maxSessions: 100,
        maxRequests: 100,
      },
    });

    const events = await prisma.enterprisePlanRequestEvent.findMany({
      where: { requestId: request.requestId, type: 'reviewed' },
    });

    expect(approved.plan.kind).toBe(PlanKindEnum.ENTERPRISE_CUSTOM);
    expect(approved.request.status).toBe(
      EnterprisePlanRequestStatusEnum.APPROVED,
    );
    expect(events.length).toBeGreaterThanOrEqual(1);

    const tenantBPlan = await createPlan(prisma, {
      name: 'Tenant B Free',
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
      trialDays: 14,
    });

    await createSubscription(prisma, {
      tenantId: tenantB.tenantId,
      planId: tenantBPlan.planId,
      status: SubscriptionStatusEnum.TRIALING,
      overrides: {
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    await expect(
      subscriptionsService.requestUpgradeToPaidPlan({
        tenantId: tenantB.tenantId,
        planId: approved.plan.planId,
        billingCycle: BillingCycleEnum.MONTHLY,
      }),
    ).rejects.toBeInstanceOf(Error);
  });
});
