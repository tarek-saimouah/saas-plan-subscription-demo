import { SetMetadata } from '@nestjs/common';
import { PlanKindEnum } from '../enums';

export interface SubscriptionRequirement {
  allowTrial?: boolean;
  allowActive?: boolean;
  allowPastDue?: boolean;
  allowSuspended?: boolean;
  requireOwnEnterprisePlan?: boolean;
  planKinds?: Array<`${PlanKindEnum}`>;
}

export const SUBSCRIPTION_KEY = 'subscription_requirement';

export const RequireSubscription = (options: SubscriptionRequirement = {}) =>
  SetMetadata(SUBSCRIPTION_KEY, options);
