import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateChargePayload,
  ChargeRequestPayload,
  ChargeResponse,
  CreateRecurringChargePayload,
  RecurringChargeRequestPayload,
  CreateCardTokenPayload,
  CardTokenResponse,
  ChargeResponseWithPaymentAgreement,
} from './types';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createHmac } from 'node:crypto';

@Injectable()
export class TapPaymentGatewayService {
  private TAP_PAYMENT_BASE_URL: string;
  private TAP_PAYMENT_API_KEY: string;
  private TAP_PAYMENT_WEBHOOK_URL: string;
  private TAP_PAYMENT_REDIRECT_URL: string;
  private TAP_MERCHANT_ID: string;

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    @InjectPinoLogger(TapPaymentGatewayService.name)
    private readonly logger: PinoLogger,
  ) {
    this.TAP_PAYMENT_BASE_URL = this.config.get('TAP_PAYMENT_BASE_URL')!;
    this.TAP_PAYMENT_API_KEY = this.config.get('TAP_PAYMENT_API_KEY')!;
    this.TAP_PAYMENT_WEBHOOK_URL = this.config.get('TAP_PAYMENT_WEBHOOK_URL')!;
    this.TAP_PAYMENT_REDIRECT_URL = this.config.get(
      'TAP_PAYMENT_REDIRECT_URL',
    )!;
    this.TAP_MERCHANT_ID = this.config.get('TAP_MERCHANT_ID')!;
  }

  async createCardToken(
    payload: CreateCardTokenPayload,
  ): Promise<{ response?: CardTokenResponse; error?: string }> {
    const ENDPOINT_URL = `${this.TAP_PAYMENT_BASE_URL}/tokens`;

    const headers = {
      Authorization: `Bearer ${this.TAP_PAYMENT_API_KEY}`,
    };

    const requestPayload = {
      saved_card: {
        card_id: payload.cardId,
        customer_id: payload.customerId,
      },
    };

    try {
      const result = await this.httpService.axiosRef.post<CardTokenResponse>(
        ENDPOINT_URL,
        requestPayload,
        {
          headers,
        },
      );

      this.logger.info('card token created successfully', result.data);

      return { response: result.data };
    } catch (error: any) {
      this.logger.error(
        'An error happened while requesting tap payment (createCardToken)',
        error.response?.data,
      );
      return {
        error:
          error.response?.data ||
          'An error happened while requesting tap payment (createCardToken)',
      };
    }
  }

  async createCharge(
    payload: CreateChargePayload,
  ): Promise<{ response?: ChargeResponse; error?: string }> {
    const ENDPOINT_URL = `${this.TAP_PAYMENT_BASE_URL}/charges`;

    const headers = {
      Authorization: `Bearer ${this.TAP_PAYMENT_API_KEY}`,
    };

    const requestPayload: ChargeRequestPayload = {
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      metadata: payload.metadata,
      receipt: {
        email: false,
        sms: false,
      },
      customer: {
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        email: payload.customer.email,
      },
      source: {
        id: 'src_card', // for cards
      },
      merchant: {
        id: this.TAP_MERCHANT_ID,
      },
      redirect: {
        url: this.TAP_PAYMENT_REDIRECT_URL,
      },
      // webhook endpoint
      post: {
        url: this.TAP_PAYMENT_WEBHOOK_URL,
      },
    };

    try {
      const result = await this.httpService.axiosRef.post<ChargeResponse>(
        ENDPOINT_URL,
        requestPayload,
        {
          headers,
        },
      );

      this.logger.info('charge created successfully', result.data);

      return { response: result.data };
    } catch (error: any) {
      this.logger.error(
        'An error happened while requesting tap payment (createCharge)',
        error.response?.data,
      );
      return {
        error:
          error.response?.data ||
          'An error happened while requesting tap payment (createCharge)',
      };
    }
  }

  async createRecurringCharge(
    payload: CreateRecurringChargePayload,
  ): Promise<{ response?: ChargeResponse; error?: string }> {
    const ENDPOINT_URL = `${this.TAP_PAYMENT_BASE_URL}/charges`;

    const headers = {
      Authorization: `Bearer ${this.TAP_PAYMENT_API_KEY}`,
    };

    const requestPayload: RecurringChargeRequestPayload = {
      amount: payload.amount,
      currency: payload.currency,
      customer_initiated: false,
      save_card: false,
      metadata: payload.metadata,
      payment_agreement: {
        id: payload.paymentAgreementId,
      },
      receipt: {
        email: false,
        sms: false,
      },
      customer: {
        id: payload.customerId,
        email: payload.email,
      },
      source: {
        id: payload.cardTokenId,
      },
      reference: {
        order: payload.referenceOrder,
        transaction: payload.referenceTransaction,
      },
      merchant: {
        id: this.TAP_MERCHANT_ID,
      },
      redirect: {
        url: this.TAP_PAYMENT_REDIRECT_URL,
      },
      // webhook endpoint
      post: {
        url: this.TAP_PAYMENT_WEBHOOK_URL,
      },
    };

    try {
      const result = await this.httpService.axiosRef.post<ChargeResponse>(
        ENDPOINT_URL,
        requestPayload,
        {
          headers,
        },
      );

      this.logger.info('recurring charge created successfully', result.data);

      return { response: result.data };
    } catch (error: any) {
      this.logger.error(
        'An error happened while requesting tap payment (createRecurringCharge)',
        error.response?.data,
      );
      return {
        error:
          error.response?.data ||
          'An error happened while requesting tap payment (createRecurringCharge)',
      };
    }
  }

  async createInitialChargeWithSaveCard(payload: CreateChargePayload): Promise<{
    response?: ChargeResponseWithPaymentAgreement;
    error?: string;
  }> {
    const ENDPOINT_URL = `${this.TAP_PAYMENT_BASE_URL}/charges`;

    const headers = {
      Authorization: `Bearer ${this.TAP_PAYMENT_API_KEY}`,
    };

    const requestPayload: ChargeRequestPayload = {
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      customer_initiated: true,
      threeDSecure: true,
      save_card: true, // set to true to return payment agreement, card and customer details for upcoming recurring payments
      metadata: payload.metadata,
      receipt: {
        email: false,
        sms: false,
      },
      customer: {
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        email: payload.customer.email,
      },
      source: {
        id: 'src_card', // for cards
      },
      reference: {
        order: payload.referenceOrder,
        transaction: payload.referenceTransaction,
      },
      merchant: {
        id: this.TAP_MERCHANT_ID,
      },
      redirect: {
        url: this.TAP_PAYMENT_REDIRECT_URL,
      },
      // webhook endpoint
      post: {
        url: this.TAP_PAYMENT_WEBHOOK_URL,
      },
    };

    try {
      const result =
        await this.httpService.axiosRef.post<ChargeResponseWithPaymentAgreement>(
          ENDPOINT_URL,
          requestPayload,
          {
            headers,
          },
        );

      this.logger.info('initial charge created successfully', result.data);

      return { response: result.data };
    } catch (error: any) {
      this.logger.error(
        'An error happened while requesting tap payment (createInitialChargeWithSaveCard)',
        error.response?.data,
      );
      return {
        error:
          error.response?.data ||
          'An error happened while requesting tap payment (createInitialChargeWithSaveCard)',
      };
    }
  }

  async retrieveCharge(
    chargeId: string,
  ): Promise<{ response?: ChargeResponse; error?: string }> {
    const ENDPOINT_URL = `${this.TAP_PAYMENT_BASE_URL}/charges/${chargeId}`;

    const headers = {
      Authorization: `Bearer ${this.TAP_PAYMENT_API_KEY}`,
    };

    try {
      const result =
        await this.httpService.axiosRef.get<ChargeResponseWithPaymentAgreement>(
          ENDPOINT_URL,
          {
            headers,
          },
        );

      this.logger.info('charge retrieved successfully', result.data);

      return { response: result.data };
    } catch (error: any) {
      this.logger.error(
        'An error happened while requesting tap payment (retrieveCharge)',
        error.response?.data,
      );
      return {
        error:
          error.response?.data ||
          'An error happened while requesting tap payment (retrieveCharge)',
      };
    }
  }

  validateWebhookPayload(payload: any, postedHashString: string): boolean {
    const id = payload.id;
    // round amount to currency required decimal places
    const amount = this.formatMoneyAmount(payload.amount, payload.currency);
    const currency = payload.currency;
    const gateway_reference = payload.reference.gateway;
    const payment_reference = payload.reference.payment;
    const status = payload.status;
    const created = payload.transaction.created;

    // Charges - Create a hashstring from the posted response data + the data that are related to you.
    const toBeHashedString =
      'x_id' +
      id +
      'x_amount' +
      amount +
      'x_currency' +
      currency +
      'x_gateway_reference' +
      gateway_reference +
      'x_payment_reference' +
      payment_reference +
      'x_status' +
      status +
      'x_created' +
      created;

    // Create your hashstring by passing concatenated string and your secret API Key
    const myHashString = createHmac('sha256', this.TAP_PAYMENT_API_KEY)
      .update(toBeHashedString)
      .digest('hex');

    return myHashString === postedHashString;
  }

  private formatMoneyAmount(amount: number, currency: string): string {
    // Mapping of currencies to their decimal places
    const currencyDecimalPlaces = {
      AED: 2,
      BHD: 3,
      KWD: 3,
      OMR: 3,
      QAR: 2,
      SAR: 2,
      USD: 2,
      EUR: 2,
      GBP: 2,
      EGP: 2,
    };

    // Get the number of decimal places for the currency
    const decimalPlaces = currencyDecimalPlaces[currency];

    // If the currency is not found, default to 2 decimal places
    if (decimalPlaces === undefined) {
      return amount.toFixed(2);
    }

    // Round the amount to the required decimal places
    const roundedAmount = amount.toFixed(decimalPlaces);

    return roundedAmount;
  }
}
