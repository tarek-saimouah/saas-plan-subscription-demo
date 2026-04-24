import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionMapper } from './mappers';

@Module({
  exports: [SubscriptionsService, SubscriptionMapper],
  providers: [SubscriptionsService, SubscriptionMapper],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
