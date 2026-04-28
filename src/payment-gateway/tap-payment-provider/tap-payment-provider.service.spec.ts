import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { createHmac } from 'node:crypto';
import { TapPaymentGatewayService } from './tap-payment-provider.service';
import { createLoggerMock } from '../../../test/mock-helpers';

describe('TapPaymentGatewayService.validateWebhookPayload', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        TAP_PAYMENT_BASE_URL: 'https://tap.example.com',
        TAP_PAYMENT_API_KEY: 'test-secret',
        TAP_PAYMENT_WEBHOOK_URL: 'https://demo.test/webhooks/tap-charge',
        TAP_PAYMENT_REDIRECT_URL: 'https://demo.test/billing/after-charge',
        TAP_MERCHANT_ID: 'merchant-1',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const service = new TapPaymentGatewayService(
    config,
    { axiosRef: {} } as HttpService,
    createLoggerMock() as any,
  );

  const payload = {
    id: 'chg_1',
    amount: 20,
    currency: 'USD',
    reference: {
      gateway: 'gateway_1',
      payment: 'payment_1',
    },
    status: 'CAPTURED',
    transaction: {
      created: '2026-04-27T10:00:00.000Z',
    },
  };

  const sign = (body: typeof payload) => {
    const toBeHashedString =
      'x_id' +
      body.id +
      'x_amount' +
      body.amount.toFixed(2) +
      'x_currency' +
      body.currency +
      'x_gateway_reference' +
      body.reference.gateway +
      'x_payment_reference' +
      body.reference.payment +
      'x_status' +
      body.status +
      'x_created' +
      body.transaction.created;

    return createHmac('sha256', 'test-secret')
      .update(toBeHashedString)
      .digest('hex');
  };

  it('returns true for a valid payload and key', () => {
    expect(service.validateWebhookPayload(payload, sign(payload))).toBe(true);
  });

  it('returns false for a wrong key', () => {
    const wrongHash = createHmac('sha256', 'wrong-secret')
      .update('anything')
      .digest('hex');

    expect(service.validateWebhookPayload(payload, wrongHash)).toBe(false);
  });

  it('returns false when amount is tampered', () => {
    const validHash = sign(payload);

    expect(
      service.validateWebhookPayload({ ...payload, amount: 25 }, validHash),
    ).toBe(false);
  });

  it('returns false when status is tampered', () => {
    const validHash = sign(payload);

    expect(
      service.validateWebhookPayload(
        { ...payload, status: 'DECLINED' },
        validHash,
      ),
    ).toBe(false);
  });
});
