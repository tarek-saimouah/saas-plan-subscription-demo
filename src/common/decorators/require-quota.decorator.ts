import { SetMetadata } from '@nestjs/common';
import { QuotaKey } from 'src/subscriptions/usage-keys.types';

export const QUOTA_KEY = 'quota_key';

export const RequireQuota = (key: QuotaKey) => SetMetadata(QUOTA_KEY, key);
