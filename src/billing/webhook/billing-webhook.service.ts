import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  PaymentChargeStatusEnum,
  TapWebhookEvent,
} from 'src/payment-gateway/tap-payment-provider';
import { BillingCycleEnum } from 'src/common';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class BillingWebhookService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    @InjectPinoLogger(BillingWebhookService.name)
    private readonly logger: PinoLogger,
  ) {}

  async handleEvent(event: TapWebhookEvent) {
    // CAPTURED status means payment succeeded

    this.logger.info('webhook event');
    this.logger.info(event);

    try {
      if (!event.payment_agreement) {
        this.logger.warn(
          `Tap did not generate a payment agreement for charge: ${event.id}`,
        );
      }

      const eventId = event.id;
      const paymentRef = event.id;
      const amount = event.amount;
      const currency = event.currency ?? 'USD';
      const tapPaymentAgreementId = event.payment_agreement?.id;
      const tapCardId = event.card.id || event.payment_agreement?.contract.id;
      const tapCustomerId =
        event.customer.id || event.payment_agreement?.contract.customer_id;

      const tenantId = event.metadata.tenantId;
      if (!tenantId) {
        return { ignored: true };
      }

      const subscription =
        await this.subscriptionsService.getSubscriptionByTenantId(tenantId);

      this.logger.info({ subscription });

      if (event.status === PaymentChargeStatusEnum.CAPTURED) {
        await this.subscriptionsService.activateAfterSuccessfulPayment({
          tenantId,
          provider: 'tap',
          providerEventId: String(eventId),
          providerPaymentRef: String(paymentRef),
          tapPaymentAgreementId: String(tapPaymentAgreementId),
          tapCardId: String(tapCardId),
          tapCustomerId: String(tapCustomerId),
          amount: Number(amount),
          currency: String(currency),
          billingCycle: subscription.billingCycle as BillingCycleEnum,
          rawPayload: event as any,
        });

        return { ok: true };
      }

      if (
        event.status === PaymentChargeStatusEnum.FAILED ||
        event.status === PaymentChargeStatusEnum.CANCELLED ||
        event.status === PaymentChargeStatusEnum.DECLINED
      ) {
        await this.subscriptionsService.markPaymentFailed({
          tenantId,
          providerEventId: String(eventId),
          amount: Number(amount),
          currency: String(currency),
          failureReason: event.response.message ?? 'Payment failed',
          rawPayload: event as any,
        });

        return { ok: true };
      }
    } catch (error) {
      this.logger.error(`Error handling webhook with event: ${event.id}`);
      this.logger.error(error);
      return { ignored: true };
    }

    return { ignored: true };
  }
}
