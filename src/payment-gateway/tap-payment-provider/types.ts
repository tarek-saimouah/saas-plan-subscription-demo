// responses

import { EPaymentMetadata } from '../types';

export interface ChargeResponse {
  id: string;
  object: string;
  live_mode: boolean;
  api_version: string;
  method: string;
  status: PaymentChargeStatusEnum;
  amount: number;
  currency: string;
  threeDSecure: boolean;
  card_threeDSecure: boolean;
  save_card: boolean;
  merchant_id: string;
  product: string;
  description: string;
  metadata: EPaymentMetadata;
  transaction: {
    timezone: string;
    created: string;
    url: string;
    expiry: {
      period: number;
      type: string;
    };
    asynchronous: boolean;
    amount: number;
    currency: string;
  };
  reference?: {
    transaction: string;
    order: string;
  };
  response?: {
    code: string;
    message: string;
  };
  receipt: {
    email: boolean;
    sms: boolean;
  };
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: {
      country_code: string;
      number: string;
    };
  };
  merchant?: {
    id: string;
  };
  source: {
    object?: string;
    id: string;
  };
  redirect: {
    status?: string;
    url: string;
  };
  post: {
    status?: string;
    url: string;
  };
  activities?: {
    id: string;
    object: string;
    created: number;
    status: string;
    currency: string;
    amount: number;
    remarks: string;
  }[];
  auto_reversed?: boolean;
}

export interface RetrieveChargeResponse {
  id: string;
  object: string;
  live_mode: boolean;
  api_version: string;
  method: string;
  status: PaymentChargeStatusEnum;
  amount: number;
  currency: string;
  metadata: EPaymentMetadata;
  transaction: {
    authorization_id: string;
    timezone: string;
    created: string;
    expiry: {
      period: number;
      type: string;
    };
    asynchronous: boolean;
    amount: number;
    currency: string;
  };
  // there are more data but not needed
}

export type ChargeResponseWithPaymentAgreement = ChargeResponse & {
  payment_agreement: {
    id: string;
    total_payments_count: number;
    contract: {
      id: string;
      type: string;
    };
    variable_amount: {
      id: string;
    };
  };
};

export interface CardTokenResponse {
  id: string;
  status: string;
  created: number;
  object: string;
  live_mode: boolean;
  type: string;
  purpose: string;
  used: boolean;
  card: {
    id: string;
    object: string;
    on_file: boolean;
    customer: string;
    funding: string;
    fingerprint: string;
    brand: string;
    scheme: string;
    exp_month: number;
    exp_year: number;
    last_four: string;
    first_six: string;
    first_eight: string;
    name: string;
  };
  payment: {
    id: string;
    on_file: boolean;
    card_data: {
      exp_month: number;
      exp_year: number;
      last_four: string;
      first_six: string;
      first_eight: string;
    };
    fingerprint: string;
    scheme: string;
  };
  merchant: {
    id: string;
  };
  client_ip: string;
}

// service payloads

export interface CreateChargePayload {
  amount: number;
  currency: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  metadata: EPaymentMetadata;
  referenceOrder: string;
  referenceTransaction: string;
}

export interface CreateRecurringChargePayload {
  amount: number;
  currency: string;
  customerId: string;
  cardTokenId: string;
  paymentAgreementId: string;
  email: string;
  referenceOrder: string;
  referenceTransaction: string;
  metadata: EPaymentMetadata;
}

export interface CreateCardTokenPayload {
  cardId: string;
  customerId: string;
}

// api request payloads

export interface ChargeRequestPayload {
  amount: number;
  currency: string;
  customer_initiated: boolean;
  threeDSecure: boolean;
  save_card: boolean;
  description?: string;
  metadata: EPaymentMetadata;
  receipt: {
    email: boolean;
    sms?: boolean;
  };
  reference?: {
    transaction: string;
    order: string;
  };
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: {
      country_code: string;
      number: string;
    };
  };
  merchant?: {
    id: string;
  };
  source: {
    id: string;
  };
  post: {
    url: string;
  };
  redirect: {
    url: string;
  };
}

export interface RecurringChargeRequestPayload {
  amount: number;
  currency: string;
  customer_initiated: boolean;
  threeDSecure?: boolean;
  save_card: boolean;
  payment_agreement: {
    id: string;
  };
  customer: {
    id: string;
    email: string;
  };
  source: {
    id: string;
  };
  metadata: EPaymentMetadata;
  receipt: {
    email: boolean;
    sms?: boolean;
  };
  reference?: {
    transaction: string;
    order: string;
  };
  merchant?: {
    id: string;
  };
  post: {
    url: string;
  };
  redirect: {
    url: string;
  };
}

export enum PaymentChargeStatusEnum {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  ABANDONED = 'ABANDONED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  DECLINED = 'DECLINED',
  RESTRICTED = 'RESTRICTED',
  CAPTURED = 'CAPTURED',
  VOID = 'VOID',
  TIMEDOUT = 'TIMEDOUT',
  UNKNOWN = 'UNKNOWN',
}
