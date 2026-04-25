import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionMapper } from './mappers';
import { SubscriptionUsageLimitsService } from './subscription-usage-limits.service';
import { SubscriptionsDashboardController } from './subscriptions.dashboard.controller';
import { SubscriptionEventsService } from './subscription-events.service';

@Module({
  exports: [
    SubscriptionsService,
    SubscriptionMapper,
    SubscriptionUsageLimitsService,
    SubscriptionEventsService,
  ],
  providers: [
    SubscriptionsService,
    SubscriptionMapper,
    SubscriptionUsageLimitsService,
    SubscriptionEventsService,
  ],
  controllers: [SubscriptionsDashboardController],
})
export class SubscriptionsModule {}
