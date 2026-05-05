import { CurrencyEnum } from '../../src/common/enums/currency.enum';
import { PlanKindEnum } from '../../src/common/enums/plan-kind.enum';
import { Prisma } from '../../src/generated/prisma/client';

export const PlansSeedData: Prisma.PlanCreateInput[] = [
  // Free plan
  {
    name: 'Free Plan',
    description: 'Free plan with 14 days trial',
    sortOrder: 0,
    kind: PlanKindEnum.STANDARD,
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 14,
    currency: CurrencyEnum.KWD,
    // quota
    maxProjects: 2,
    maxUsers: 2,
    maxSessions: 2,
    maxRequests: 100,
  },
  // Basic plan
  {
    name: 'Basic Plan',
    description: 'Basic plan with 5x free plan quota',
    sortOrder: 1,
    kind: PlanKindEnum.STANDARD,
    monthlyPrice: 20,
    yearlyPrice: 200,
    currency: CurrencyEnum.KWD,
    // quota
    maxProjects: 10,
    maxUsers: 10,
    maxSessions: 10,
    maxRequests: 500,
  },
  // Pro plan
  {
    name: 'Pro Plan',
    description: 'Pro plan with 20x free plan quota',
    sortOrder: 2,
    kind: PlanKindEnum.STANDARD,
    monthlyPrice: 50,
    yearlyPrice: 500,
    currency: CurrencyEnum.KWD,
    // quota
    maxProjects: 40,
    maxUsers: 40,
    maxSessions: 40,
    maxRequests: 2000,
  },
];
