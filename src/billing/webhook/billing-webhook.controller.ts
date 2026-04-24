import {
  Controller,
  Post,
  type RawBodyRequest,
  Req,
  Res,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Public } from 'src/common';
import { PaymentGatewayService } from 'src/payment-gateway/payment-gateway.service';
import { BillingWebhookService } from './billing-webhook.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('webhooks')
@Public()
export class BillingWebhookController {
  constructor(
    private readonly webhookService: BillingWebhookService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  // add this to execlude webhook routes from versioning
  @Version(VERSION_NEUTRAL)
  @Post('tap-charge')
  handleWebhook(@Req() req: RawBodyRequest<any>, @Res() res: any) {
    const sig = req.headers['hashstring'] as string;
    const payload = req.body;

    console.log('event webhook');
    console.log({ sig, payload });

    try {
      const verified = this.paymentGatewayService.validateWebhookPayload(
        payload,
        sig,
      );

      if (!verified) {
        console.log('webhooks: Invalid hash string for charge event');
        return res.status(400).send();
      }

      void this.webhookService.handleEvent(payload as any);
    } catch (error) {
      return res.status(400).send();
    }

    return res.status(200).send();
  }
}
