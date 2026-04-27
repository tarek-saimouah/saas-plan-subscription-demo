import { ForbiddenException, Injectable } from '@nestjs/common';
import { Plan, TenantUsage } from 'src/generated/prisma/client';
import { QuotaKey, SubscriptionResourcekey } from './resource-keys.types';

@Injectable()
export class SubscriptionUsageLimitsService {
  isLimitExceeded(
    // at least one optional quota key (plan/usage) is required
    // use Union type
    params:
      | {
          plan: Plan;
          usage: TenantUsage;
          quotaKey: QuotaKey; // required
          resourceKey?: SubscriptionResourcekey; // optional
        }
      | {
          plan: Plan;
          usage: TenantUsage;
          quotaKey?: QuotaKey; // optional
          resourceKey: SubscriptionResourcekey; // required
        },
  ) {
    // add limit check implementation for each key

    if (
      params.quotaKey === 'maxProjects' ||
      params.resourceKey === 'projectsCount'
    ) {
      const isLimitExceeded = this.projectsLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });

      if (isLimitExceeded) {
        throw new ForbiddenException('Quota exceeded: (max projects)');
      }
    }

    if (params.quotaKey === 'maxUsers' || params.resourceKey === 'usersCount') {
      const isLimitExceeded = this.usersLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });

      if (isLimitExceeded) {
        throw new ForbiddenException('Quota exceeded: (max users)');
      }
    }

    if (
      params.quotaKey === 'maxSessions' ||
      params.resourceKey === 'sessionsCount'
    ) {
      const isLimitExceeded = this.sessionsLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });

      if (isLimitExceeded) {
        throw new ForbiddenException('Quota exceeded: (max sessions)');
      }
    }

    if (
      params.quotaKey === 'maxRequests' ||
      params.resourceKey === 'requestsCount'
    ) {
      const isLimitExceeded = this.requestsLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });

      if (isLimitExceeded) {
        throw new ForbiddenException('Quota exceeded: (max requests)');
      }
    }
  }

  canUseResource(params: {
    plan: Plan;
    usage: TenantUsage;
    resourceKey: SubscriptionResourcekey; // optional
  }): boolean {
    // add limit check implementation for each key

    if (params.resourceKey === 'projectsCount') {
      return !this.projectsLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });
    }

    if (params.resourceKey === 'usersCount') {
      return !this.usersLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });
    }

    if (params.resourceKey === 'sessionsCount') {
      return !this.sessionsLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });
    }

    if (params.resourceKey === 'requestsCount') {
      return !this.requestsLimitExceeded({
        plan: params.plan,
        usage: params.usage,
      });
    }

    return true;
  }

  // limits check implementations

  private projectsLimitExceeded(params: {
    plan: Plan;
    usage: TenantUsage;
  }): boolean {
    const limit = params.plan.maxProjects;
    const current = params.usage.projectsCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      return true;
    }

    return false;
  }

  private usersLimitExceeded(params: {
    plan: Plan;
    usage: TenantUsage;
  }): boolean {
    const limit = params.plan.maxUsers;
    const current = params.usage.usersCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      return true;
    }

    return false;
  }

  private sessionsLimitExceeded(params: {
    plan: Plan;
    usage: TenantUsage;
  }): boolean {
    const limit = params.plan.maxSessions;
    const current = params.usage.sessionsCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      return true;
    }

    return false;
  }

  private requestsLimitExceeded(params: {
    plan: Plan;
    usage: TenantUsage;
  }): boolean {
    const limit = params.plan.maxRequests;
    const current = params.usage.requestsCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      return true;
    }

    return false;
  }
}
