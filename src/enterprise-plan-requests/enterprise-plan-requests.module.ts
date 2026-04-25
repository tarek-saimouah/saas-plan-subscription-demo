import { Module } from '@nestjs/common';
import { EnterprisePlanRequestsService } from './enterprise-plan-requests.service';
import { EnterprisePlanRequestsController } from './enterprise-plan-requests.controller';
import { EnterprisePlanRequestsDashboardController } from './enterprise-plan-requests.dashboard.controller';
import { EnterprisePlanRequestEventsService } from './enterprise-plan-request-events.service';

@Module({
  providers: [
    EnterprisePlanRequestsService,
    EnterprisePlanRequestEventsService,
  ],
  controllers: [
    EnterprisePlanRequestsController,
    EnterprisePlanRequestsDashboardController,
  ],
})
export class EnterprisePlanRequestsModule {}
