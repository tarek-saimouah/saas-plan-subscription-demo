import { SetMetadata } from '@nestjs/common';

export const QUOTA_KEY = 'quota_key';

export type QuotaKey =
  | 'maxProjects'
  | 'maxUsers'
  | 'maxSessions'
  | 'maxRequests';

export const RequireQuota = (key: QuotaKey) => SetMetadata(QUOTA_KEY, key);
