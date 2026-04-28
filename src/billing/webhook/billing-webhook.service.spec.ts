import { BillingWebhookService } from './billing-webhook.service';
import { createLoggerMock } from '../../../test/mock-helpers';
import { BillingCycleEnum } from 'src/common';
import { PaymentChargeStatusEnum } from 'src/payment-gateway/tap-payment-provider';

describe('BillingWebhookService', () => {
  const subscriptionsService = {
    getSubscriptionByTenantId: jest.fn(),
    activateAfterSuccessfulPayment: jest.fn(),
    markPaymentFailed: jest.fn(),
  };
  const service = new BillingWebhookService(
    subscriptionsService as any,
    createLoggerMock() as any,
  );

  const baseEvent = {
    id: 'evt_1',
    amount: 20,
    currency: 'USD',
    payment_agreement: {
      id: 'agreement_1',
      contract: { id: 'contract_1', customer_id: 'customer_1' },
    },
    card: { id: 'card_1' },
    customer: { id: 'customer_1' },
    metadata: { tenantId: 'tenant-1' },
    response: { message: 'declined' },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionsService.getSubscriptionByTenantId.mockResolvedValue({
      billingCycle: BillingCycleEnum.MONTHLY,
    });
  });

  it('routes CAPTURED events to activation', async () => {
    await service.handleEvent({
      ...baseEvent,
      status: PaymentChargeStatusEnum.CAPTURED,
    });

    expect(
      subscriptionsService.activateAfterSuccessfulPayment,
    ).toHaveBeenCalled();
    expect(subscriptionsService.markPaymentFailed).not.toHaveBeenCalled();
  });

  it('routes FAILED events to markPaymentFailed', async () => {
    await service.handleEvent({
      ...baseEvent,
      status: PaymentChargeStatusEnum.FAILED,
    });

    expect(subscriptionsService.markPaymentFailed).toHaveBeenCalled();
  });

  it('routes DECLINED events to markPaymentFailed', async () => {
    await service.handleEvent({
      ...baseEvent,
      status: PaymentChargeStatusEnum.DECLINED,
    });

    expect(subscriptionsService.markPaymentFailed).toHaveBeenCalled();
  });

  it('ignores events without tenantId metadata', async () => {
    await service.handleEvent({
      ...baseEvent,
      metadata: {},
      status: PaymentChargeStatusEnum.CAPTURED,
    });

    expect(
      subscriptionsService.activateAfterSuccessfulPayment,
    ).not.toHaveBeenCalled();
    expect(subscriptionsService.markPaymentFailed).not.toHaveBeenCalled();
  });
});
