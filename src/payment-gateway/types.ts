export interface EPaymentMetadata {
  subscriptionId: string;
  tenantId: string;
  paymentFor: 'subscription' | 'program';
  subscriptionPaymentId?: string;
}
