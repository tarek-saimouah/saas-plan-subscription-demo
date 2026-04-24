import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database';
import { PaymentGatewayService } from 'src/payment-gateway/payment-gateway.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UpgradePlanDto, UpgradePlanResponseDto } from './dto';
import { BillingCycleEnum } from 'src/common';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly SubscriptionsService: SubscriptionsService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  async upgradePlan(
    tenantId: string,
    payload: UpgradePlanDto,
  ): Promise<UpgradePlanResponseDto> {
    // check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: {
        owner: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // request tenant subscription upgrade
    const requestUpgrade =
      await this.SubscriptionsService.requestUpgradeToPaidPlan({
        tenantId,
        planId: payload.planId,
        billingCycle: payload.billingCycle as BillingCycleEnum,
      });

    console.log({ requestUpgrade });

    // create charge request

    const charge =
      await this.paymentGatewayService.createInitialChargeWithSaveCard({
        amount: requestUpgrade.amount,
        currency: requestUpgrade.currency,
        description: `Subscription with ${requestUpgrade.plan.name}`,
        customer: {
          firstName: tenant.owner.fullName,
          email: tenant.owner.email,
        },
        referenceOrder: `ord_${requestUpgrade.subscriptionId}_${Date.now()}`,
        referenceTransaction: `txn_${requestUpgrade.subscriptionId}_${Date.now()}`,
        metadata: {
          subscriptionId: requestUpgrade.subscriptionId,
          tenantId,
          paymentFor: 'subscription',
        },
      });

    console.log({ charge });

    return {
      transactionUrl: charge.transaction.url,
    };
  }
}
