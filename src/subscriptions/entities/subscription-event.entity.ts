import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionEventTypeEnum } from 'src/common';

export class SubscriptionEventEntity {
  @ApiProperty()
  readonly eventId: string;

  @ApiProperty()
  readonly subscriptionId: string;

  @ApiProperty({ type: String, nullable: true })
  readonly fromPlanId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly toPlanId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly actorUserId?: string | null;

  @ApiProperty({ enum: SubscriptionEventTypeEnum })
  readonly type: string; // trial_started, trial_expired, expired, payment_pending, payment_succeeded, payment_failed, renewed, upgraded, downgraded, downgrade_scheduled, cancelled, past_due, suspended, reactivated, manual_adjustment, enterprise_plan_created, enterprise_plan_updated

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  readonly meta?: any;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  constructor(props: Partial<SubscriptionEventEntity>) {
    Object.assign(this, props);
  }
}
