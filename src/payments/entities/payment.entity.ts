import { ApiProperty } from '@nestjs/swagger';
import { CurrencyEnum, PaymentStatusEnum } from 'src/common';

export class PaymentEntity {
  @ApiProperty()
  readonly paymentId: string;

  @ApiProperty()
  readonly subscriptionId: string;

  @ApiProperty()
  readonly provider: string;

  @ApiProperty({ type: String, nullable: true })
  readonly providerEventId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly providerPaymentRef?: string | null;

  @ApiProperty({ type: Number })
  readonly amount: number;

  @ApiProperty({ enum: CurrencyEnum })
  readonly currency: string; // USD

  @ApiProperty({ enum: PaymentStatusEnum })
  readonly status: string; // pending, succeeded, failed, refunded

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  readonly rawPayload?: any;

  @ApiProperty({ type: Date, nullable: true })
  readonly paidAt?: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  readonly failedAt?: Date | null;

  @ApiProperty({ type: String, nullable: true })
  readonly failureReason?: string | null;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<PaymentEntity>) {
    Object.assign(this, props);
  }
}
