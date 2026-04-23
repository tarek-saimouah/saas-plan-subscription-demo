import { Module } from '@nestjs/common';
import { PlanMapper } from './mappers';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  exports: [PlansService, PlanMapper],
  controllers: [PlansController],
  providers: [PlansService, PlanMapper],
})
export class PlansModule {}
