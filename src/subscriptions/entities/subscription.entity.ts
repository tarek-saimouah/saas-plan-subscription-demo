import { ApiProperty } from '@nestjs/swagger';
import { BillingCycleEnum, SubscriptionStatusEnum } from 'src/common';

export class SubscriptionEntity {
  @ApiProperty()
  readonly subscriptionId: string;

  @ApiProperty()
  readonly tenantId: string;

  @ApiProperty()
  readonly planId: string;

  @ApiProperty({ enum: SubscriptionStatusEnum })
  readonly status: string;

  @ApiProperty({ type: Date })
  readonly startedAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  readonly trialEndsAt?: Date | null;

  @ApiProperty({ type: Date })
  readonly currentPeriodStart: Date;

  @ApiProperty({ type: Date })
  readonly currentPeriodEnd: Date;

  @ApiProperty({ type: Boolean })
  readonly cancelAtPeriodEnd: boolean;

  @ApiProperty({ type: Date, nullable: true })
  readonly cancelledAt?: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  readonly suspendedAt?: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  readonly pastDueAt?: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  readonly lastGraceWarningAt?: Date | null;

  @ApiProperty({ type: String, nullable: true })
  readonly pendingPlanId?: string | null;

  @ApiProperty({ type: Date, nullable: true })
  readonly pendingPlanEffectiveAt?: Date | null;

  @ApiProperty({ type: Number, nullable: true })
  readonly priceSnapshot?: number | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  readonly quotaSnapshot?: any;

  @ApiProperty()
  readonly paymentProvider: string;

  @ApiProperty({ type: String, nullable: true })
  readonly tapCustomerId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly tapCardId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly tapPaymentAgreementId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly latestPaymentId?: string | null;

  @ApiProperty({ enum: BillingCycleEnum })
  readonly billingCycle: string;

  @ApiProperty({ type: Date, nullable: true })
  readonly nextBillingAt?: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  readonly lastBillingAt?: Date | null;

  @ApiProperty({ type: Number })
  readonly retryCount: number;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<SubscriptionEntity>) {
    Object.assign(this, props);
  }
}
