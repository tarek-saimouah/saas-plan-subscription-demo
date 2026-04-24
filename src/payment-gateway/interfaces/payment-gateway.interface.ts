export interface IPaymentGateway {
  createCardToken(cardId: string, customerId: string): Promise<any>;

  createRecurringCharge(params: {
    amount: number;
    currency: string;
    description?: string;
    customerId: string;
    cardTokenId: string;
    paymentAgreementId: string;
    email: string;
    referenceOrder: string;
    referenceTransaction: string;
    metadata: Record<string, any>;
  }): Promise<any>;

  createInitialChargeWithSaveCard(params: {
    amount: number;
    currency: string;
    customer: {
      firstName: string;
      lastName?: string;
      email: string;
    };
    referenceOrder: string;
    referenceTransaction: string;
    metadata: Record<string, any>;
  }): Promise<any>;
}
