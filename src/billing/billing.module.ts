import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PlansModule } from 'src/plans/plans.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { PaymentGatewayModule } from 'src/payment-gateway/payment-gateway.module';
import { BillingWebhookController } from './webhook/billing-webhook.controller';
import { BillingWebhookService } from './webhook/billing-webhook.service';

@Module({
  imports: [PlansModule, SubscriptionsModule, PaymentGatewayModule],
  providers: [BillingService, BillingWebhookService],
  controllers: [BillingController, BillingWebhookController],
})
export class BillingModule {}
