import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  BillingCycleEnum,
  PlanKindEnum,
  PaymentStatusEnum,
  SubscriptionEventTypeEnum,
  SubscriptionStatusEnum,
  getEndOfDay,
  PaginationParams,
  IPaginatedResult,
  getPaginationArgs,
  getPaginationMeta,
  PagingDataResponse,
  addDaysToDate,
} from 'src/common';
import { PrismaService } from 'src/database';
import {
  Plan,
  Prisma,
  SubscriptionPayment,
  TenantSubscription,
} from 'src/generated/prisma/client';
import { GetSubscriptionDto, SubscriptionResponseDto } from './dto';
import { SubscriptionMapper } from './mappers';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionMapper: SubscriptionMapper,
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
      const trialEndsAt = addDaysToDate(now, trialPlan.trialDays);

      // optional: if the requirement is to set trial end to the end of the last day
      // const trialEndsAt = getEndOfDay(
      //   addDaysToDate(now, trialPlan.trialDays)
      // );

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

  async requestUpgradeToPaidPlan(params: {
    tenantId: string;
    planId: string;
    billingCycle: BillingCycleEnum;
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
        amount: this.getSubscriptionPriceAmount({
          plan: newPlan,
          billingCycle: params.billingCycle,
        }),
        currency: newPlan.currency,
      };
    });
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

  async applyScheduledDowngrade(params: {
    tenantId: string;
    subscriptionId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: {
          subscriptionId: params.subscriptionId,
          tenantId: params.tenantId,
        },
        include: { plan: true, pendingPlan: true },
      });

      this.logger.info({ subscription });

      if (!subscription || !subscription.pendingPlan) {
        return;
      }

      const newPlan = subscription.pendingPlan;

      const newPrice = this.getSubscriptionPriceAmount({
        plan: newPlan,
        billingCycle: subscription.billingCycle as BillingCycleEnum,
      });

      const updated = await tx.tenantSubscription.update({
        where: { subscriptionId: subscription.subscriptionId },
        data: {
          planId: newPlan.planId,
          pendingPlanId: null,
          pendingPlanEffectiveAt: null,
          priceSnapshot: newPrice,
          quotaSnapshot: {
            maxProjects: newPlan.maxProjects,
            maxUsers: newPlan.maxUsers,
            maxSessions: newPlan.maxSessions,
            maxRequests: newPlan.maxRequests,
          },
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.DOWNGRADED,
          fromPlanId: subscription.planId,
          toPlanId: newPlan.planId,
          meta: {
            appliedAt: new Date(),
          },
        },
      });

      this.logger.info(
        `Downgrade applied for subscription ${updated.subscriptionId} to plan ${newPlan.planId}`,
      );
    });
  }

  async cancelSubscription(tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId },
      });

      this.logger.info({ subscription });

      if (!subscription) throw new NotFoundException('Subscription not found');

      if (
        subscription.status !== SubscriptionStatusEnum.ACTIVE &&
        subscription.status !== SubscriptionStatusEnum.PAST_DUE
      ) {
        throw new BadRequestException(
          'Only active and past due subscriptions can be cancelled',
        );
      }

      const updated = await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          cancelAtPeriodEnd: true,
          // keep ACTIVE until currentPeriodEnd
        },
      });

      this.logger.info({ updated });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.subscriptionId,
          type: SubscriptionEventTypeEnum.CANCELLED,
          fromPlanId: subscription.planId,
          meta: {
            cancelAtPeriodEnd: true,
            effectiveAt: subscription.currentPeriodEnd,
          },
        },
      });

      return updated;
    });
  }

  async requestResubscribeToSuspendedSubscription(params: {
    tenantId: string;
    billingCycle: BillingCycleEnum;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { tenantId: params.tenantId },
        include: {
          plan: true,
          tenant: true,
        },
      });

      this.logger.info({ subscription });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status !== SubscriptionStatusEnum.SUSPENDED) {
        throw new BadRequestException(
          'Only suspended subscriptions can be resubscribed',
        );
      }

      const suspendedAt = subscription.suspendedAt ?? subscription.updatedAt;
      const reactivationWindowMs = 60 * 24 * 60 * 60 * 1000;

      if (Date.now() - suspendedAt.getTime() > reactivationWindowMs) {
        throw new BadRequestException('Reactivation window expired');
      }

      if (!subscription.plan) {
        throw new BadRequestException('Plan not found');
      }

      return {
        subscriptionId: subscription.subscriptionId,
        plan: subscription.plan,
        amount: this.getSubscriptionPriceAmount({
          plan: subscription.plan,
          billingCycle: params.billingCycle,
        }),
        currency: subscription.plan.currency,
      };
    });
  }

  /**
   * first activation
   * renewal
   * upgrade
   * resubscribe suspended
   *
   * Returns updated subscription for success
   * Returns existing payment for duplicate event
   */
  async activateAfterSuccessfulPayment(params: {
    tenantId: string;
    provider: string;
    providerEventId: string;
    providerPaymentRef?: string;
    tapCardId: string;
    tapCustomerId: string;
    tapPaymentAgreementId: string;
    amount: number;
    currency: string;
    billingCycle: BillingCycleEnum;
    rawPayload?: Prisma.JsonValue;
  }): Promise<TenantSubscription | SubscriptionPayment> {
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

      const newEnd = addDaysToDate(now, periodDays);

      // optional: if the requirement is to set end date to (current period end + period days) when subscription status is past_due
      // if subscription status is past_due the new end must be (current period end + period days)
      // if (
      //   subscription.status === SubscriptionStatusEnum.PAST_DUE &&
      //   subscription.currentPeriodEnd < now
      // ) {
      //   const newEnd = addDaysToDate(subscription.currentPeriodEnd, periodDays)
      // }

      // optional: if the requirement is to set end date to the end of the last day
      // const newEnd = getEndOfDay(addDaysToDate(now, periodDays))

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

      let priceSnapshot = subscription.priceSnapshot?.toNumber();

      if (activePlan?.monthlyPrice) {
        priceSnapshot = this.getSubscriptionPriceAmount({
          plan: activePlan!,
          billingCycle: params.billingCycle,
        });
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
          billingCycle: params.billingCycle,
          retryCount: 0, // reset recurring payment retry count
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          suspendedAt: null,
          pastDueAt: null,
          pendingPlanId: null,
          pendingPlanEffectiveAt: null,
          latestPaymentId: payment.paymentId,
          paymentProvider: params.provider,
          ...(params.tapCardId && {
            tapCardId: params.tapCardId,
          }),
          ...(params.tapCustomerId && {
            tapCustomerId: params.tapCustomerId,
          }),
          ...(params.tapPaymentAgreementId && {
            tapPaymentAgreementId: params.tapPaymentAgreementId,
          }),
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

      const eventType = this.getSubscriptionActivationEventType(
        subscription.status as SubscriptionStatusEnum,
      );

      await tx.subscriptionEvent.createMany({
        data: [
          {
            subscriptionId: subscription.subscriptionId,
            type: eventType,
            fromPlanId: subscription.planId,
            toPlanId: activePlanId,
            meta: {
              amount: params.amount,
              currency: params.currency,
              providerPaymentRef: params.providerPaymentRef,
            },
          },
          // if subscription status was TRIALING create upgrade event
          ...(subscription.status === SubscriptionStatusEnum.TRIALING
            ? [
                {
                  subscriptionId: subscription.subscriptionId,
                  type: SubscriptionEventTypeEnum.UPGRADED,
                  fromPlanId: subscription.planId,
                  toPlanId: activePlanId,
                  meta: {
                    amount: params.amount,
                    currency: params.currency,
                    providerPaymentRef: params.providerPaymentRef,
                  },
                },
              ]
            : []),
        ],
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

      // check if retry count exceeded 3
      if (subscription.retryCount >= 3) {
        return subscription;
      }

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
          // increment retry count
          retryCount: { increment: 1 },
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

  // cronjob function

  async processTrialExpirations() {
    const now = new Date();

    const trials = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatusEnum.TRIALING,
        trialEndsAt: {
          lte: now,
        },
        // must not have TRIAL_EXPIRED event
        events: { none: { type: SubscriptionEventTypeEnum.TRIAL_EXPIRED } },
      },
      include: {
        plan: true,
      },
    });

    await this.prisma.subscriptionEvent.createMany({
      data: trials.map((sub) => {
        return {
          subscriptionId: sub.subscriptionId,
          type: SubscriptionEventTypeEnum.TRIAL_EXPIRED,
          fromPlanId: sub.planId,
          toPlanId: sub.planId,
          meta: {
            trialEndedAt: sub.trialEndsAt,
          },
        };
      }),
    });
  }

  async movePastDueSubscriptions() {
    const now = new Date();
    const expirationWindowMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    // 3 days after failed renewal -> PAST_DUE
    const pastDueSubs =
      await this.prisma.tenantSubscription.updateManyAndReturn({
        where: {
          status: SubscriptionStatusEnum.ACTIVE,
          pastDueAt: { not: null },
          updatedAt: {
            lte: new Date(now.getTime() - expirationWindowMs),
          },
        },
        data: {
          status: SubscriptionStatusEnum.PAST_DUE,
        },
      });

    if (pastDueSubs?.length) {
      await this.prisma.subscriptionEvent.createMany({
        data: pastDueSubs.map((sub) => {
          return {
            subscriptionId: sub.subscriptionId,
            type: SubscriptionEventTypeEnum.PAST_DUE,
            fromPlanId: sub.planId,
          };
        }),
      });
    }

    this.logger.info({
      pastDueCount: pastDueSubs.length,
    });
  }

  async moveSuspendedSubscriptions() {
    const now = new Date();
    const expirationWindowMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    // 7 days after failed renewal -> SUSPENDED
    const suspended = await this.prisma.tenantSubscription.updateManyAndReturn({
      where: {
        status: SubscriptionStatusEnum.PAST_DUE,
        pastDueAt: {
          not: null,
          lte: new Date(now.getTime() - expirationWindowMs),
        },
      },
      data: {
        status: SubscriptionStatusEnum.SUSPENDED,
        suspendedAt: now,
      },
    });

    this.logger.info({ suspendedCount: suspended.length });

    if (suspended?.length) {
      await this.prisma.subscriptionEvent.createMany({
        data: suspended.map((sub) => {
          return {
            subscriptionId: sub.subscriptionId,
            type: SubscriptionEventTypeEnum.SUSPENDED,
            fromPlanId: sub.planId,
          };
        }),
      });
    }
  }

  async moveExpiredSubscriptions() {
    const now = new Date();
    const expirationWindowMs = 60 * 24 * 60 * 60 * 1000; // 60 days

    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatusEnum.SUSPENDED,
        suspendedAt: { not: null },
      },
    });

    for (const sub of subscriptions) {
      const isExpired =
        now.getTime() - sub.suspendedAt!.getTime() > expirationWindowMs;

      if (!isExpired) continue;

      await this.prisma.$transaction(async (tx) => {
        await tx.tenantSubscription.update({
          where: { tenantId: sub.tenantId },
          data: {
            status: SubscriptionStatusEnum.EXPIRED,
            nextBillingAt: null,
          },
        });

        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: sub.subscriptionId,
            type: SubscriptionEventTypeEnum.EXPIRED,
            fromPlanId: sub.planId,
            meta: {
              suspendedAt: sub.suspendedAt,
              expiredAt: now,
            },
          },
        });
      });
    }
  }

  async moveCancelledSubscriptions() {
    const now = new Date();

    // now > currentPeriodEnd and cancelAtPeriodEnd flag is true -> CANCELLED
    const cancelled = await this.prisma.tenantSubscription.updateManyAndReturn({
      where: {
        status: {
          in: [SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.PAST_DUE],
        },
        cancelAtPeriodEnd: true,
        currentPeriodEnd: {
          lte: now,
        },
      },
      data: {
        status: SubscriptionStatusEnum.CANCELLED,
        cancelledAt: now,
        nextBillingAt: null,
      },
    });

    this.logger.info({ cancelledCount: cancelled.length });

    if (cancelled?.length) {
      await this.prisma.subscriptionEvent.createMany({
        data: cancelled.map((sub) => {
          return {
            subscriptionId: sub.subscriptionId,
            type: SubscriptionEventTypeEnum.CANCELLED,
            fromPlanId: sub.planId,
            meta: {
              effectiveAt: sub.currentPeriodEnd,
              finalizedByCron: true,
            },
          };
        }),
      });
    }
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

  // helper methods

  getSubscriptionPriceAmount(params: {
    plan: Plan;
    billingCycle: BillingCycleEnum;
  }): number {
    return params.billingCycle === BillingCycleEnum.MONTHLY
      ? params.plan.monthlyPrice.toNumber()
      : params.plan.yearlyPrice.toNumber();
  }

  private getSubscriptionActivationEventType(
    currentStatus: SubscriptionStatusEnum,
  ): SubscriptionEventTypeEnum {
    if (currentStatus === SubscriptionStatusEnum.SUSPENDED) {
      return SubscriptionEventTypeEnum.REACTIVATED;
    }

    if (currentStatus === SubscriptionStatusEnum.TRIALING) {
      return SubscriptionEventTypeEnum.PAYMENT_SUCCEEDED;
    }

    if (
      currentStatus === SubscriptionStatusEnum.ACTIVE ||
      currentStatus === SubscriptionStatusEnum.PAST_DUE
    ) {
      return SubscriptionEventTypeEnum.RENEWED;
    }

    return SubscriptionEventTypeEnum.RENEWED;
  }

  // controller methods

  async getById(subscriptionId: string): Promise<SubscriptionResponseDto> {
    const result = await this.prisma.tenantSubscription.findUnique({
      where: {
        subscriptionId,
      },
    });

    if (!result) {
      throw new NotFoundException('Subscription not found');
    }

    return this.subscriptionMapper.entityToResponseDto(
      this.subscriptionMapper.modelToEntity(result),
    );
  }

  async findAllPaging(
    filter?: GetSubscriptionDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<SubscriptionResponseDto>> {
    const query: Prisma.TenantSubscriptionWhereInput = {
      ...filter,
    };

    const orderBy: Prisma.TenantSubscriptionOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.tenantSubscription.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.tenantSubscription.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    const data = results.map((res) =>
      this.subscriptionMapper.entityToResponseDto(
        this.subscriptionMapper.modelToEntity(res),
      ),
    );

    return new PagingDataResponse(data, meta);
  }
}
