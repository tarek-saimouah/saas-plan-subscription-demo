import { Injectable } from '@nestjs/common';
import { TapPaymentGatewayService } from './tap-payment-provider';
import { EPaymentMetadata } from './types';
import { IPaymentGateway } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentGatewayService implements IPaymentGateway {
  constructor(private readonly paymentProvider: TapPaymentGatewayService) {}

  async createCardToken(cardId: string, customerId: string) {
    const { response, error } = await this.paymentProvider.createCardToken({
      cardId,
      customerId,
    });

    if (error) {
      throw new Error(
        `Error creating card token with payment provider: ${error}`,
      );
    }

    if (!response) {
      throw new Error(
        'Error creating card token with payment provider: response is null',
      );
    }

    return response;
  }

  async createRecurringCharge(params: {
    amount: number;
    currency: string;
    description?: string;
    customerId: string;
    cardTokenId: string;
    paymentAgreementId: string;
    email: string;
    referenceOrder: string;
    referenceTransaction: string;
    metadata: EPaymentMetadata;
  }) {
    const { response, error } =
      await this.paymentProvider.createRecurringCharge(params);

    if (error) {
      throw new Error(
        `Error creating recurring payment with payment provider: ${error}`,
      );
    }

    if (!response) {
      throw new Error(
        'Error creating recurring payment with payment provider: response is null',
      );
    }

    return response;
  }

  async createInitialChargeWithSaveCard(params: {
    amount: number;
    currency: string;
    description?: string;
    customer: { firstName: string; lastName?: string; email: string };
    referenceOrder: string;
    referenceTransaction: string;
    metadata: EPaymentMetadata;
  }) {
    const { response, error } =
      await this.paymentProvider.createInitialChargeWithSaveCard(params);

    if (error) {
      throw new Error(
        `Error creating initial payment with payment provider: ${error}`,
      );
    }

    if (!response) {
      throw new Error(
        'Error creating initial payment with payment provider: response is null',
      );
    }

    return response;
  }

  async retriveCharge(chargeId: string) {
    const { response, error } =
      await this.paymentProvider.retrieveCharge(chargeId);

    if (error) {
      throw new Error(
        `Error retrieving payment with payment provider: ${error}`,
      );
    }

    if (!response) {
      throw new Error(
        'Error retrieving payment with payment provider: response is null',
      );
    }

    return response;
  }

  validateWebhookPayload(payload: any, postedHashString: string): boolean {
    return this.paymentProvider.validateWebhookPayload(
      payload,
      postedHashString,
    );
  }
}
