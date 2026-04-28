import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  cleanDatabase,
  createAccessToken,
  createAdmin,
  createPlan,
  createSubscription,
  createTenant,
  createTenantUsage,
  createUser,
  decimal,
  delay,
  seedStandardPlans,
} from './test-utils';
import {
  AllExceptionsFilter,
  BillingCycleEnum,
  JwtServiceUtils,
  PlanKindEnum,
  SubscriptionStatusEnum,
} from 'src/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaService } from 'src/database';
import { PaymentGatewayService } from 'src/payment-gateway/payment-gateway.service';

describe('Billing and plans (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtServiceUtils: JwtServiceUtils;
  const paymentGatewayMock = {
    createCardToken: jest.fn(),
    createRecurringCharge: jest.fn(),
    createInitialChargeWithSaveCard: jest.fn(),
    validateWebhookPayload: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PaymentGatewayService)
      .useValue(paymentGatewayMock)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    jwtServiceUtils = app.get(JwtServiceUtils);

    const validatorOptions: ValidationPipeOptions = {
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors: any[]) => {
        const error = errors[0];
        return new BadRequestException(
          error.constraints[Object.keys(error?.constraints)[0]] as string,
        );
      },
    };
    app.useGlobalPipes(new ValidationPipe(validatorOptions));
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    paymentGatewayMock.createInitialChargeWithSaveCard.mockResolvedValue({
      transaction: { url: 'https://tap.test/checkout' },
    });
    paymentGatewayMock.validateWebhookPayload.mockReturnValue(true);
    await cleanDatabase(prisma);
    await seedStandardPlans(prisma);
  }, 12_000);

  afterAll(async () => {
    await app.close();
  });

  const poll = async (assertion: () => Promise<void>, attempts = 10) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await assertion();
        return;
      } catch (error) {
        if (attempt === attempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  };

  it('GET /v1/billing/plans returns only active standard plans ordered by sortOrder', async () => {
    await createPlan(prisma, {
      name: 'Enterprise Private',
      kind: PlanKindEnum.ENTERPRISE_CUSTOM,
      tenant: { connect: { tenantId: (await createTenant(prisma)).tenantId } },
      monthlyPrice: decimal(100),
      yearlyPrice: decimal(1000),
    });
    await createPlan(prisma, {
      name: 'Inactive Public',
      isActive: false,
      monthlyPrice: decimal(10),
      yearlyPrice: decimal(100),
    });

    const response = await request(app.getHttpServer())
      .get('/v1/billing/plans')
      .expect(200);

    expect(response.body.data.map((plan: any) => plan.name)).toEqual([
      'Free Plan',
      'Basic Plan',
      'Pro Plan',
    ]);
  });

  it('POST /v1/plans allows admins and rejects duplicate names', async () => {
    const admin = await createAdmin(prisma);
    const token = await createAccessToken(jwtServiceUtils, {
      userId: admin.userId,
      email: admin.email,
      role: 'admin',
    });

    const payload = {
      name: 'Scale Plan',
      description: 'Scale plan',
      sortOrder: 5,
      monthlyPrice: 75,
      yearlyPrice: 750,
      currency: 'USD',
      maxProjects: 50,
      maxUsers: 50,
      maxSessions: 50,
      maxRequests: 50,
    };

    await request(app.getHttpServer())
      .post('/v1/plans')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/plans')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(409);
  });

  it('POST /v1/plans rejects non-admin users', async () => {
    const user = await createUser(prisma);
    const token = await createAccessToken(jwtServiceUtils, {
      userId: user.userId,
      email: user.email,
      role: 'user',
    });

    await request(app.getHttpServer())
      .post('/v1/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Scale Plan',
        description: 'Scale plan',
        sortOrder: 5,
        monthlyPrice: 75,
        yearlyPrice: 750,
        currency: 'USD',
        maxProjects: 50,
        maxUsers: 50,
        maxSessions: 50,
        maxRequests: 50,
      })
      .expect(403);
  });

  it('POST /v1/billing/plan-upgrade returns a transaction URL and CAPTURED webhook activates the subscription idempotently', async () => {
    const tenant = await createTenant(prisma);
    const freePlan = await prisma.plan.findUnique({
      where: { name: 'Free Plan' },
    });
    const paidPlan = await prisma.plan.findUnique({
      where: { name: 'Basic Plan' },
    });

    await createSubscription(prisma, {
      tenantId: tenant.tenantId,
      planId: freePlan!.planId,
      status: SubscriptionStatusEnum.TRIALING,
      billingCycle: BillingCycleEnum.MONTHLY,
      overrides: {
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        nextBillingAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        priceSnapshot: decimal(0),
      },
    });

    const token = await createAccessToken(jwtServiceUtils, {
      userId: tenant.ownerId,
      tenantId: tenant.tenantId,
      role: 'user',
    });

    const upgradeResponse = await request(app.getHttpServer())
      .post('/v1/billing/plan-upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({
        planId: paidPlan!.planId,
        billingCycle: BillingCycleEnum.MONTHLY,
      })
      .expect(201);

    expect(upgradeResponse.body.data.transactionUrl).toBe(
      'https://tap.test/checkout',
    );

    const pending = await prisma.tenantSubscription.findUnique({
      where: { tenantId: tenant.tenantId },
    });
    expect(pending?.pendingPlanId).toBe(paidPlan!.planId);

    const payload = {
      id: 'evt_001',
      amount: 20,
      currency: 'USD',
      status: 'CAPTURED',
      metadata: { tenantId: tenant.tenantId },
      payment_agreement: {
        id: 'agreement_1',
        contract: {
          id: 'contract_1',
          customer_id: 'customer_1',
        },
      },
      card: { id: 'card_1' },
      customer: { id: 'customer_1' },
      response: { message: 'ok' },
    };

    await request(app.getHttpServer())
      .post('/webhooks/tap-charge')
      .set('hashstring', 'valid')
      .send(payload)
      .expect(200);

    await delay(1000);

    await request(app.getHttpServer())
      .post('/webhooks/tap-charge')
      .set('hashstring', 'valid')
      .send(payload)
      .expect(200);

    await poll(async () => {
      const active = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenant.tenantId },
      });
      expect(active?.status).toBe(SubscriptionStatusEnum.ACTIVE);
      expect(active?.pendingPlanId).toBeNull();
    });

    const payments = await prisma.subscriptionPayment.findMany();
    expect(payments).toHaveLength(1);
  });

  it('POST /webhooks/tap-charge rejects invalid signatures', async () => {
    paymentGatewayMock.validateWebhookPayload.mockReturnValue(false);

    await request(app.getHttpServer())
      .post('/webhooks/tap-charge')
      .set('hashstring', 'bad')
      .send({ id: 'evt_002' })
      .expect(400);
  });

  it('SubscriptionGuard allows trialing profile access but blocks suspended mutations and quota overages', async () => {
    const tenant = await createTenant(prisma);
    const freePlan = await prisma.plan.findUnique({
      where: { name: 'Free Plan' },
    });

    await createTenantUsage(prisma, tenant.tenantId, { projectsCount: 2 });
    await createSubscription(prisma, {
      tenantId: tenant.tenantId,
      planId: freePlan!.planId,
      status: SubscriptionStatusEnum.TRIALING,
      billingCycle: BillingCycleEnum.MONTHLY,
      overrides: {
        trialEndsAt: new Date(Date.now() + 60_000),
        currentPeriodEnd: new Date(Date.now() + 60_000),
        nextBillingAt: new Date(Date.now() + 60_000),
        priceSnapshot: decimal(0),
      },
    });

    const token = await createAccessToken(jwtServiceUtils, {
      userId: tenant.ownerId,
      tenantId: tenant.tenantId,
      role: 'user',
    });

    await request(app.getHttpServer())
      .get('/v1/tenants/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/tenants/resources/use-projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await prisma.tenantSubscription.update({
      where: { tenantId: tenant.tenantId },
      data: {
        status: SubscriptionStatusEnum.SUSPENDED,
        suspendedAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .patch('/v1/tenants/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'updated-tenant' })
      .expect(403);
  });
});
