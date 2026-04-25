import { Module } from '@nestjs/common';
import { EnterprisePlanRequestsService } from './enterprise-plan-requests.service';
import { EnterprisePlanRequestsController } from './enterprise-plan-requests.controller';
import { EnterprisePlanRequestsDashboardController } from './enterprise-plan-requests.dashboard.controller';

@Module({
  providers: [EnterprisePlanRequestsService],
  controllers: [
    EnterprisePlanRequestsController,
    EnterprisePlanRequestsDashboardController,
  ],
})
export class EnterprisePlanRequestsModule {}
