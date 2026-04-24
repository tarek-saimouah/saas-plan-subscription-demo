import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentGatewayService } from './payment-gateway.service';
import { TapPaymentGatewayService } from './tap-payment-provider';

@Module({
  imports: [HttpModule],
  exports: [PaymentGatewayService],
  providers: [PaymentGatewayService, TapPaymentGatewayService],
})
export class PaymentGatewayModule {}
