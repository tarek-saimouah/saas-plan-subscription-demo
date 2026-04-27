export const SubscriptionResources = [
  'projectsCount',
  'usersCount',
  'sessionsCount',
  'requestsCount',
] as const;

export type QuotaKey =
  | 'maxProjects'
  | 'maxUsers'
  | 'maxSessions'
  | 'maxRequests';

export type SubscriptionResourcekey = (typeof SubscriptionResources)[number];
