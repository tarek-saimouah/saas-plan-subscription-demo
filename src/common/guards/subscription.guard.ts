import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SUBSCRIPTION_KEY,
  SubscriptionRequirement,
} from '../decorators/require-subscription.decorator';
import { QUOTA_KEY } from '../decorators/require-quota.decorator';
import { PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from 'src/database';
import { JwtDecodedEntity } from '../entities';
import { PlanKindEnum, SubscriptionStatusEnum } from '../enums';
import { QuotaKey, SubscriptionUsageLimitsService } from 'src/subscriptions';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly usageLimitsService: SubscriptionUsageLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const decodedUser: JwtDecodedEntity = request.user;

    if (!decodedUser?.tenantId) {
      throw new ForbiddenException('No tenant context');
    }

    const subscriptionMeta =
      this.reflector.getAllAndOverride<SubscriptionRequirement>(
        SUBSCRIPTION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const quotaKey = this.reflector.getAllAndOverride<QuotaKey>(QUOTA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: decodedUser.tenantId },
      include: {
        plan: true,
        tenant: {
          include: {
            usage: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new ForbiddenException('Subscription not found');
    }

    // Enterprise plans must belong to the current tenant.
    if (
      subscription.plan.kind === PlanKindEnum.ENTERPRISE_CUSTOM &&
      subscription.plan.tenantId !== decodedUser.tenantId
    ) {
      throw new ForbiddenException(
        'Enterprise plan not allowed for this tenant',
      );
    }

    // State checks
    if (subscriptionMeta) {
      const stateAllowed = this.isStateAllowed(
        subscription.status,
        subscriptionMeta,
      );
      if (!stateAllowed) {
        throw new ForbiddenException('Subscription not allowed for this route');
      }

      if (
        subscriptionMeta.planKinds &&
        !subscriptionMeta.planKinds.includes(subscription.plan.kind as any)
      ) {
        throw new ForbiddenException('Plan type not allowed for this route');
      }

      if (
        subscriptionMeta.requireOwnEnterprisePlan &&
        subscription.plan.tenantId !== decodedUser.tenantId
      ) {
        throw new ForbiddenException('Require own enterprise plan');
      }

      const now = new Date();

      if (
        subscription.status === SubscriptionStatusEnum.TRIALING &&
        subscription.trialEndsAt &&
        now > subscription.trialEndsAt
      ) {
        throw new ForbiddenException('Trial expired');
      }

      if (
        subscription.currentPeriodEnd &&
        now > subscription.currentPeriodEnd &&
        subscription.status !== SubscriptionStatusEnum.SUSPENDED
      ) {
        throw new ForbiddenException('Subscription expired');
      }
    }

    // Quota checks
    if (quotaKey) {
      const usage = subscription.tenant.usage;
      if (!usage) {
        throw new ForbiddenException('Usage record is missing');
      }

      this.usageLimitsService.isLimitExceeded({
        plan: subscription.plan,
        usage,
        quotaKey,
      });

      // Also Check limit on service-level
      // Don't rely on guard middleware only
      // That protects from:
      //  - parallel requests
      //  - background jobs
      //  - internal service calls
    }

    return true;
  }

  private isStateAllowed(
    status: string,
    meta: SubscriptionRequirement,
  ): boolean {
    switch (status) {
      case SubscriptionStatusEnum.TRIALING:
        return meta.allowTrial !== false;
      case SubscriptionStatusEnum.ACTIVE:
        return meta.allowActive !== false;
      case SubscriptionStatusEnum.PAST_DUE:
        return meta.allowPastDue === true;
      case SubscriptionStatusEnum.SUSPENDED:
        return meta.allowSuspended === true;
      case SubscriptionStatusEnum.CANCELLED:
      case SubscriptionStatusEnum.EXPIRED:
        return false;
      default:
        return false;
    }
  }
}
