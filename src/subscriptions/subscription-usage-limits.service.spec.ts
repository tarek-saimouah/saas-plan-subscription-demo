import { ForbiddenException } from '@nestjs/common';
import { SubscriptionUsageLimitsService } from './subscription-usage-limits.service';

describe('SubscriptionUsageLimitsService', () => {
  const service = new SubscriptionUsageLimitsService();

  const plan = {
    maxProjects: 2,
    maxUsers: 3,
    maxSessions: 4,
    maxRequests: 5,
  } as any;

  it('treats projectsCount equal to maxProjects as over limit', () => {
    expect(() =>
      service.isLimitExceeded({
        plan,
        usage: { projectsCount: 2 } as any,
        quotaKey: 'maxProjects',
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows projectsCount one below maxProjects', () => {
    expect(() =>
      service.isLimitExceeded({
        plan,
        usage: { projectsCount: 1 } as any,
        quotaKey: 'maxProjects',
      }),
    ).not.toThrow();
  });

  it('enforces usersCount independently', () => {
    expect(() =>
      service.isLimitExceeded({
        plan,
        usage: { usersCount: 3 } as any,
        quotaKey: 'maxUsers',
      }),
    ).toThrow('Quota exceeded: (max users)');
  });

  it('enforces sessionsCount independently', () => {
    expect(() =>
      service.isLimitExceeded({
        plan,
        usage: { sessionsCount: 4 } as any,
        quotaKey: 'maxSessions',
      }),
    ).toThrow('Quota exceeded: (max sessions)');
  });

  it('enforces requestsCount independently', () => {
    expect(() =>
      service.isLimitExceeded({
        plan,
        usage: { requestsCount: 5 } as any,
        quotaKey: 'maxRequests',
      }),
    ).toThrow('Quota exceeded: (max requests)');
  });
});
