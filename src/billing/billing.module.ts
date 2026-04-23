import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PlansModule } from 'src/plans/plans.module';

@Module({
  imports: [PlansModule],
  providers: [BillingService],
  controllers: [BillingController],
})
export class BillingModule {}
