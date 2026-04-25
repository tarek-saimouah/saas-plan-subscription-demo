import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsDashboardController } from './payments.dashboard.controller';

@Module({
  exports: [PaymentsService],
  providers: [PaymentsService],
  controllers: [PaymentsDashboardController],
})
export class PaymentsModule {}
