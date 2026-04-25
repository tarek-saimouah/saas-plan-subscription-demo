import { ForbiddenException, Injectable } from '@nestjs/common';
import { Plan, TenantUsage } from 'src/generated/prisma/client';
import { QuotaKey, UsageQuotakey } from './usage-keys.types';

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
          usageKey?: UsageQuotakey; // optional
        }
      | {
          plan: Plan;
          usage: TenantUsage;
          quotaKey?: QuotaKey; // optional
          usageKey: UsageQuotakey; // required
        },
  ) {
    // add limit check implementation for each key

    if (
      params.quotaKey === 'maxProjects' ||
      params.usageKey === 'projectsCount'
    ) {
      return this.checkProjectsLimit({
        plan: params.plan,
        usage: params.usage,
      });
    }

    if (params.quotaKey === 'maxUsers' || params.usageKey === 'usersCount') {
      return this.checkUsersLimit({
        plan: params.plan,
        usage: params.usage,
      });
    }

    if (
      params.quotaKey === 'maxSessions' ||
      params.usageKey === 'sessionsCount'
    ) {
      return this.checkSessionsLimit({
        plan: params.plan,
        usage: params.usage,
      });
    }

    if (
      params.quotaKey === 'maxRequests' ||
      params.usageKey === 'requestsCount'
    ) {
      return this.checkRequestsLimit({
        plan: params.plan,
        usage: params.usage,
      });
    }
  }

  // limits check implementations

  private checkProjectsLimit(params: { plan: Plan; usage: TenantUsage }) {
    const limit = params.plan.maxProjects;
    const current = params.usage.projectsCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      throw new ForbiddenException('Quota exceeded: (max projects)');
    }
  }

  private checkUsersLimit(params: { plan: Plan; usage: TenantUsage }) {
    const limit = params.plan.maxUsers;
    const current = params.usage.usersCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      throw new ForbiddenException('Quota exceeded: (max users)');
    }
  }

  private checkSessionsLimit(params: { plan: Plan; usage: TenantUsage }) {
    const limit = params.plan.maxSessions;
    const current = params.usage.sessionsCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      throw new ForbiddenException('Quota exceeded: (max sessions)');
    }
  }

  private checkRequestsLimit(params: { plan: Plan; usage: TenantUsage }) {
    const limit = params.plan.maxRequests;
    const current = params.usage.requestsCount;

    if (limit !== null && limit !== undefined && current >= limit) {
      throw new ForbiddenException('Quota exceeded: (max requests)');
    }
  }
}
