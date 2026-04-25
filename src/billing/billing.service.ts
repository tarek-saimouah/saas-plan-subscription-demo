import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database';
import { PaymentGatewayService } from 'src/payment-gateway/payment-gateway.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import {
  DowngradePlanDto,
  ResubscribeSuspendedPlanDto,
  UpgradePlanDto,
  RequestPlanSubscriptionResponseDto,
} from './dto';
import {
  BillingCycleEnum,
  MessageResponseDto,
  PlanKindEnum,
  SuccessResponseDto,
} from 'src/common';

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
  ): Promise<RequestPlanSubscriptionResponseDto> {
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

    return {
      transactionUrl: charge.transaction.url,
    };
  }

  async secheduleDowngradePlan(
    tenantId: string,
    payload: DowngradePlanDto,
  ): Promise<MessageResponseDto> {
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

    // request tenant subscription downgrade
    await this.SubscriptionsService.scheduleDowngrade({
      tenantId,
      targetPlanId: payload.planId,
    });

    return new SuccessResponseDto('Downgrade scheduled successfully');
  }

  async subscripeToEnterprisePlan(
    tenantId: string,
    payload: UpgradePlanDto,
  ): Promise<RequestPlanSubscriptionResponseDto> {
    const [tenant, plan] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { tenantId },
        include: {
          owner: true,
          subscription: {
            include: { plan: true },
          },
        },
      }),
      this.prisma.plan.findUnique({ where: { planId: payload.planId } }),
    ]);

    // check if tenant exists
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // check if plan exists

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan.kind !== PlanKindEnum.ENTERPRISE_CUSTOM) {
      throw new BadRequestException('Selected plan is not an enterprise plan');
    }

    if (plan.tenantId !== tenantId) {
      throw new BadRequestException(
        'This enterprise plan does not belong to this tenant',
      );
    }

    if (tenant.subscription?.planId === plan.planId) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    // request tenant subscription upgrade
    const requestUpgrade =
      await this.SubscriptionsService.requestUpgradeToPaidPlan({
        tenantId,
        planId: payload.planId,
        billingCycle: payload.billingCycle as BillingCycleEnum,
      });

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

    return {
      transactionUrl: charge.transaction.url,
    };
  }

  async resubscribeSuspendedPlan(
    tenantId: string,
    payload: ResubscribeSuspendedPlanDto,
  ): Promise<RequestPlanSubscriptionResponseDto> {
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

    // request tenant resubscription
    const requestResubscribe =
      await this.SubscriptionsService.requestResubscribeToSuspendedSubscription(
        {
          tenantId,
          billingCycle: payload.billingCycle as BillingCycleEnum,
        },
      );

    // create charge request

    const charge =
      await this.paymentGatewayService.createInitialChargeWithSaveCard({
        amount: requestResubscribe.amount,
        currency: requestResubscribe.currency,
        description: `Resubscribe with ${requestResubscribe.plan.name}`,
        customer: {
          firstName: tenant.owner.fullName,
          email: tenant.owner.email,
        },
        referenceOrder: `ord_${requestResubscribe.subscriptionId}_${Date.now()}`,
        referenceTransaction: `txn_${requestResubscribe.subscriptionId}_${Date.now()}`,
        metadata: {
          subscriptionId: requestResubscribe.subscriptionId,
          tenantId,
          paymentFor: 'subscription',
        },
      });

    return {
      transactionUrl: charge.transaction.url,
    };
  }

  async cancelSubscriptionPlan(tenantId: string): Promise<MessageResponseDto> {
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

    // request tenant subscription cancel
    await this.SubscriptionsService.cancelSubscription(tenantId);

    return new SuccessResponseDto('Subscription cancelled successfully');
  }
}
