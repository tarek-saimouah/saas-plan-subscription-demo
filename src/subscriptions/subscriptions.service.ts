import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  BillingCycleEnum,
  CurrencyEnum,
  PlanKindEnum,
  PaymentStatusEnum,
  SubscriptionEventTypeEnum,
  SubscriptionStatusEnum,
} from 'src/common';
import { PrismaService } from 'src/database';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(SubscriptionsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async startTrialForNewUser(userId: string, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { tenantId, ownerId: userId },
        include: { subscription: true },
      });

      this.logger.info({ tenant });

      if (!tenant) {
        throw new BadRequestException('Tenant not exists');
      }

      if (tenant.subscription) {
        throw new BadRequestException('Tenant has subscription');
      }

      // find the free trial plan (kind = standard, trialDays > 0)
      const trialPlan = await tx.plan.findFirst({
        where: {
          isActive: true,
          trialDays: { gt: 0 },
          kind: PlanKindEnum.STANDARD,
        },
        orderBy: { sortOrder: 'asc' },
      });

      this.logger.info({ trialPlan });

      if (!trialPlan) {
        throw new BadRequestException('No trial plan configured');
      }

      const now = new Date();
      const trialEndsAt = new Date(
        new Date().setDate(now.getDate() + trialPlan.trialDays),
      );

      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.tenantId,
          planId: trialPlan.planId,
          status: SubscriptionStatusEnum.TRIALING,
          startedAt: now,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          billingCycle: BillingCycleEnum.MONTHLY,
          nextBillingAt: trialEndsAt,
          priceSnapshot: trialPlan.monthlyPrice,
          quotaSnapshot: {
            maxProjects: trialPlan.maxProjects,
            maxUsers: trialPlan.maxUsers,
            maxSessions: trialPlan.maxSessions,
            maxRequests: trialPlan.maxRequests,
          },
          paymentProvider: 'tap',
        },
      });

      this.logger.info({ subscription });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.TRIAL_STARTED,
          toPlanId: trialPlan.planId,
          meta: {
            trialDays: trialPlan.trialDays,
          },
        },
      });

      return { tenant, subscription };
    });
  }

  async createEnterprisePlanForTenant(params: {
    tenantId: string;
    name: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency?: `${CurrencyEnum}`;
    billingCycle?: `${BillingCycleEnum}`;
    quotas: {
      maxProjects: number;
      maxUsers: number;
      maxSessions: number;
      maxRequests: number;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { tenantId: params.tenantId },
      });

      this.logger.info({ tenant });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const existingPrivatePlan = await tx.plan.findFirst({
        where: {
          kind: PlanKindEnum.ENTERPRISE_CUSTOM,
          tenantId: params.tenantId,
        },
      });

      this.logger.info({ existingPrivatePlan });

      if (existingPrivatePlan) {
        throw new BadRequestException(
          'Enterprise plan already exists for this tenant',
        );
      }

      const plan = await tx.plan.create({
        data: {
          kind: PlanKindEnum.ENTERPRISE_CUSTOM,
          tenantId: params.tenantId,
          name: params.name,
          description: params.description,
          isActive: true,
          monthlyPrice: params.monthlyPrice,
          yearlyPrice: params.yearlyPrice,
          currency: params.currency ?? CurrencyEnum.USD,
          maxProjects: params.quotas.maxProjects,
          maxUsers: params.quotas.maxUsers,
          maxSessions: params.quotas.maxSessions,
          maxRequests: params.quotas.maxRequests,
        },
      });

      this.logger.info({ plan });

      // The enterprise plan is now available for this tenant only.
      // If you want audit logging here, use a dedicated admin audit log table
      // rather than SubscriptionEvent, because the subscription may not exist yet.
      return plan;
    });
  }

  async getSubscriptionByTenantId(tenantId: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
        payments: true,
        events: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async requestUpgradeToPaidPlan(params: {
    tenantId: string;
    planId: string;
    billingCycle: `${BillingCycleEnum}`;
    providerPaymentRef?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId: params.tenantId },
        include: { plan: true, tenant: true },
      });

      this.logger.info({ subscription });

      if (!subscription) throw new NotFoundException('Subscription not found');

      const newPlan = await tx.plan.findUnique({
        where: { planId: params.planId },
      });

      this.logger.info({ newPlan });

      if (!newPlan || !newPlan.isActive) {
        throw new BadRequestException('Plan not found');
      }

      // Enterprise custom plans can only be used by their owning tenant.
      if (
        newPlan.kind === PlanKindEnum.ENTERPRISE_CUSTOM &&
        newPlan.tenantId !== params.tenantId
      ) {
        throw new BadRequestException(
          'Enterprise plan not available for this tenant',
        );
      }

      if (newPlan.monthlyPrice.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Use trial flow for free plans');
      }

      if (subscription.planId === newPlan.planId) {
        throw new BadRequestException('Already on this plan');
      }

      const now = new Date();

      await tx.tenantSubscription.update({
        where: { tenantId: params.tenantId },
        data: {
          pendingPlanId: newPlan.planId,
          pendingPlanEffectiveAt: now,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.PAYMENT_PENDING,
          fromPlanId: subscription.planId,
          toPlanId: newPlan.planId,
          meta: {
            action: 'first_payment_or_upgrade',
          },
        },
      });

      return {
        subscriptionId: subscription.subscriptionId,
        plan: newPlan,
        amount:
          params.billingCycle === 'monthly'
            ? newPlan.monthlyPrice.toNumber()
            : newPlan.yearlyPrice.toNumber(),
        currency: newPlan.currency,
      };
    });
  }

  async activateAfterSuccessfulPayment(params: {
    tenantId: string;
    provider: string;
    providerEventId: string;
    providerPaymentRef?: string;
    amount: number;
    currency: `${CurrencyEnum}`;
    billingCycle: `${BillingCycleEnum}`;
    rawPayload?: Prisma.JsonValue;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId: params.tenantId },
        include: { plan: true },
      });

      this.logger.info({ subscription });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const existingPayment = await tx.subscriptionPayment.findUnique({
        where: { providerEventId: params.providerEventId },
      });

      this.logger.info({ existingPayment });

      if (existingPayment) {
        return existingPayment;
      }

      const now = new Date();
      const periodDays =
        subscription.billingCycle === BillingCycleEnum.YEARLY ? 365 : 30;
      const newEnd = new Date(new Date().setDate(now.getDate() + periodDays));

      const payment = await tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          provider: params.provider,
          providerEventId: params.providerEventId,
          providerPaymentRef: params.providerPaymentRef,
          amount: params.amount,
          currency: params.currency,
          status: PaymentStatusEnum.SUCCEEDED,
          rawPayload: params.rawPayload ?? undefined,
          paidAt: now,
        },
      });

      this.logger.info({ payment });

      const activePlanId = subscription.pendingPlanId ?? subscription.planId;
      const activePlan = await tx.plan.findUnique({
        where: { planId: activePlanId },
      });

      this.logger.info({ activePlan });

      let priceSnapshot = subscription.priceSnapshot;
      if (activePlan?.monthlyPrice) {
        priceSnapshot =
          params.billingCycle === 'monthly'
            ? activePlan.monthlyPrice
            : activePlan.yearlyPrice;
      }

      const updated = await tx.tenantSubscription.update({
        where: { tenantId: params.tenantId },
        data: {
          planId: activePlanId,
          status: SubscriptionStatusEnum.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: newEnd,
          nextBillingAt: newEnd,
          lastBillingAt: now,
          retryCount: 0,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          suspendedAt: null,
          pastDueAt: null,
          pendingPlanId: null,
          pendingPlanEffectiveAt: null,
          latestPaymentId: payment.paymentId,
          paymentProvider: params.provider,
          priceSnapshot,
          quotaSnapshot: activePlan
            ? ({
                maxProjects: activePlan.maxProjects,
                maxUsers: activePlan.maxUsers,
                maxSessions: activePlan.maxSessions,
                maxRequests: activePlan.maxRequests,
              } as any)
            : subscription.quotaSnapshot,
        },
      });

      this.logger.info({ updated });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type:
            subscription.status === SubscriptionStatusEnum.TRIALING
              ? SubscriptionEventTypeEnum.PAYMENT_SUCCEEDED
              : SubscriptionEventTypeEnum.RENEWED,
          fromPlanId: subscription.planId,
          toPlanId: activePlanId,
          meta: {
            amount: params.amount,
            currency: params.currency,
            providerPaymentRef: params.providerPaymentRef,
          },
        },
      });

      return updated;
    });
  }

  async upgradeNowWithFullAmount(params: {
    tenantId: string;
    targetPlanId: string;
    billingCycle: `${BillingCycleEnum}`;
  }) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: params.tenantId },
      include: { plan: true },
    });

    this.logger.info({ subscription });

    if (!subscription) throw new NotFoundException('Subscription not found');

    const targetPlan = await this.prisma.plan.findUnique({
      where: { planId: params.targetPlanId },
    });

    this.logger.info({ targetPlan });

    if (!targetPlan || !targetPlan.isActive) {
      throw new BadRequestException('Target plan not found');
    }

    if (
      targetPlan.kind === PlanKindEnum.ENTERPRISE_CUSTOM &&
      targetPlan.tenantId !== params.tenantId
    ) {
      throw new BadRequestException(
        'Enterprise plan not available for this tenant',
      );
    }

    if (targetPlan.monthlyPrice <= subscription.plan.monthlyPrice) {
      throw new BadRequestException('Not an upgrade');
    }

    // The business rule here is "pay full amount now, extend 30 days from today"
    // Payment execution is handled by TapService + webhook confirmation.
    return {
      fromPlan: subscription.plan,
      toPlan: targetPlan,
      amount:
        params.billingCycle === 'monthly'
          ? targetPlan.monthlyPrice.toNumber()
          : targetPlan.yearlyPrice.toNumber(),
      currency: targetPlan.currency,
      extendByDays: 30,
    };
  }

  async scheduleDowngrade(params: { tenantId: string; targetPlanId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId: params.tenantId },
        include: { plan: true },
      });

      this.logger.info({ subscription });

      if (!subscription) throw new NotFoundException('Subscription not found');

      const targetPlan = await tx.plan.findUnique({
        where: { planId: params.targetPlanId },
      });

      this.logger.info({ targetPlan });

      if (!targetPlan || !targetPlan.isActive) {
        throw new BadRequestException('Target plan not found');
      }

      if (
        targetPlan.kind === PlanKindEnum.ENTERPRISE_CUSTOM &&
        targetPlan.tenantId !== params.tenantId
      ) {
        throw new BadRequestException(
          'Enterprise plan not available for this tenant',
        );
      }

      if (
        targetPlan.monthlyPrice.greaterThanOrEqualTo(
          subscription.plan.monthlyPrice,
        )
      ) {
        throw new BadRequestException('Not a downgrade');
      }

      if (!subscription.currentPeriodEnd) {
        throw new BadRequestException('No billing end date configured');
      }

      await tx.tenantSubscription.update({
        where: { tenantId: params.tenantId },
        data: {
          pendingPlanId: targetPlan.planId,
          pendingPlanEffectiveAt: subscription.currentPeriodEnd,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.DOWNGRADE_SCHEDULED,
          fromPlanId: subscription.planId,
          toPlanId: targetPlan.planId,
          meta: {
            effectiveAt: subscription.currentPeriodEnd,
          },
        },
      });

      return {
        effectiveAt: subscription.currentPeriodEnd,
        targetPlan,
      };
    });
  }

  async cancelSubscription(tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId },
      });

      this.logger.info({ subscription });

      if (!subscription) throw new NotFoundException('Subscription not found');

      const updated = await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
          status: SubscriptionStatusEnum.CANCELLED,
        },
      });

      this.logger.info({ updated });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.CANCELLED,
          fromPlanId: subscription.planId,
        },
      });

      return updated;
    });
  }

  async markPaymentFailed(params: {
    tenantId: string;
    providerEventId: string;
    amount: number;
    currency: string;
    failureReason?: string;
    rawPayload?: Prisma.JsonValue;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId: params.tenantId },
      });

      this.logger.info({ subscription });

      if (!subscription) throw new NotFoundException('Subscription not found');

      const existingSubscription = await tx.subscriptionPayment.findUnique({
        where: { providerEventId: params.providerEventId },
      });

      this.logger.info({ existingSubscription });

      if (existingSubscription) return existingSubscription;

      const now = new Date();

      const payment = await tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          provider: 'tap',
          providerEventId: params.providerEventId,
          amount: params.amount,
          currency: params.currency,
          status: PaymentStatusEnum.FAILED,
          rawPayload: params.rawPayload ?? undefined,
          failedAt: now,
          failureReason: params.failureReason,
        },
      });

      this.logger.info({ payment });

      await tx.tenantSubscription.update({
        where: { tenantId: params.tenantId },
        data: {
          status: SubscriptionStatusEnum.ACTIVE,
          pastDueAt: now,
          lastGraceWarningAt: now,
          retryCount: 0,
          latestPaymentId: payment.paymentId,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.PAYMENT_FAILED,
          fromPlanId: subscription.planId,
          meta: {
            providerEventId: params.providerEventId,
            reason: params.failureReason,
          },
        },
      });

      return payment;
    });
  }

  async movePastDueExpiredSuspended() {
    const now = new Date();

    // 3 days after failed renewal -> PAST_DUE
    await this.prisma.tenantSubscription.updateMany({
      where: {
        status: SubscriptionStatusEnum.ACTIVE,
        pastDueAt: { not: null },
        updatedAt: {
          lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      data: {
        status: SubscriptionStatusEnum.PAST_DUE,
      },
    });

    // 7 days after failure -> SUSPENDED
    await this.prisma.tenantSubscription.updateMany({
      where: {
        status: SubscriptionStatusEnum.PAST_DUE,
        pastDueAt: { not: null },
        updatedAt: {
          lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      data: {
        status: SubscriptionStatusEnum.SUSPENDED,
      },
    });
  }

  async resubscribe(tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true, tenant: true },
      });

      this.logger.info({ subscription });

      if (!subscription) throw new NotFoundException('Subscription not found');

      if (subscription.status !== SubscriptionStatusEnum.SUSPENDED) {
        throw new BadRequestException(
          'Only suspended subscriptions can resubscribe',
        );
      }

      const reactivationWindow = 60 * 24 * 60 * 60 * 1000; // 60 days
      const suspendedAt = subscription.suspendedAt ?? subscription.updatedAt;

      if (Date.now() - suspendedAt.getTime() > reactivationWindow) {
        throw new BadRequestException('Reactivation window expired');
      }

      await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: SubscriptionStatusEnum.ACTIVE,
          suspendedAt: null,
          pastDueAt: null,
          cancelAtPeriodEnd: false,
        },
      });

      await tx.tenant.update({
        where: { tenantId: subscription.tenantId },
        data: {
          suspendedAt: null,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.REACTIVATED,
          fromPlanId: subscription.planId,
        },
      });

      return { success: true };
    });
  }
}
