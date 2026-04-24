import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BillingCycleEnum, SubscriptionStatusEnum } from 'src/common';
import { PrismaService } from 'src/database';
import { PaymentGatewayService } from 'src/payment-gateway/payment-gateway.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class BillingCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectPinoLogger(BillingCronService.name)
    private readonly logger: PinoLogger,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processDueRecurringPayments() {
    this.logger.info(`Cron ${new Date()} run: processDueRecurringPayments`);

    const now = new Date();

    const dueSubscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatusEnum.ACTIVE,
        nextBillingAt: { lte: now },
        cancelAtPeriodEnd: false,
        paymentProvider: 'tap',
        retryCount: { lt: 3 }, // skip if failed to charge 3 times
      },
      include: {
        plan: true,
        tenant: { include: { owner: true } },
      },
    });

    this.logger.info(`number of due subscriptions: ${dueSubscriptions.length}`);

    for (const sub of dueSubscriptions) {
      try {
        this.logger.info('due subscription: ');
        this.logger.info({ subsicription: sub });

        if (
          !sub.tapCardId ||
          !sub.tapCustomerId ||
          !sub.tapPaymentAgreementId
        ) {
          this.logger.warn(
            `Missing Tap recurring fields for subscription ${sub.subscriptionId}`,
          );
          continue;
        }

        const cardToken = await this.paymentGatewayService.createCardToken(
          sub.tapCardId,
          sub.tapCustomerId,
        );

        this.logger.info({ cardToken });

        const amount =
          sub.billingCycle === BillingCycleEnum.MONTHLY
            ? sub.plan.monthlyPrice.toNumber()
            : sub.plan.yearlyPrice.toNumber();

        await this.paymentGatewayService.createRecurringCharge({
          amount,
          currency: sub.plan.currency,
          description: `Recurring payment for subscription plan ${sub.plan.name}`,
          customerId: sub.tapCustomerId,
          cardTokenId: cardToken.id,
          paymentAgreementId: sub.tapPaymentAgreementId,
          email: sub.tenant.owner.email,
          referenceOrder: `ord_${sub.subscriptionId}_${Date.now()}`,
          referenceTransaction: `txn_${sub.subscriptionId}_${Date.now()}`,
          metadata: {
            subscriptionId: sub.subscriptionId,
            tenantId: sub.tenantId,
            paymentFor: 'subscription',
          },
        });

        this.logger.info(
          `Recurring charge triggered for subscription: ${sub.subscriptionId}`,
        );

        // webhook will confirm success/failure
      } catch (error) {
        this.logger.error(
          `Recurring charge failed for ${sub.subscriptionId}`,
          error,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async applySubscriptionLifecycleRules() {
    this.logger.info(`Cron ${new Date()} run: applySubscriptionLifecycleRules`);

    try {
      await this.subscriptionsService.movePastDueExpiredSuspended();
    } catch (error) {
      this.logger.error(
        'apply subscription lifecycle rules cron failed',
        error,
      );
    }
  }
}
