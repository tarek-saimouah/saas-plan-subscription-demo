export interface EPaymentMetadata {
  subscriptionId: string;
  tenantId: string;
  paymentFor: 'subscription'; // you can add more types like: paymentFor: 'subscription' | 'program' | ...
  subscriptionPaymentId?: string;
}
