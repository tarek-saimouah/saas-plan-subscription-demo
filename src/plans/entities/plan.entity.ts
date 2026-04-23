import { ApiProperty } from '@nestjs/swagger';
import { CurrencyEnum, PlanKindEnum } from 'src/common';

export class PlanEntity {
  @ApiProperty()
  readonly planId: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ type: String, nullable: true })
  readonly description?: string | null;

  @ApiProperty({ type: Boolean })
  readonly isActive: boolean;

  @ApiProperty({ type: Number })
  sortOrder: number;

  @ApiProperty({ enum: PlanKindEnum })
  readonly kind: string; // standard, enterprise_custom

  // For 'standard' plans this is the public price.
  // For 'enterprise_custom' plans this is the negotiated academy-specific price.
  @ApiProperty({ type: Number })
  readonly monthlyPrice: number;

  @ApiProperty({ type: Number })
  readonly yearlyPrice: number;

  @ApiProperty({ enum: CurrencyEnum })
  readonly currency: string; // USD

  // Optional binding for private enterprise plans.
  @ApiProperty({ type: String, nullable: true })
  readonly tenantId?: string | null;

  // quota columns
  @ApiProperty({ type: Number })
  readonly maxProjects: number;

  @ApiProperty({ type: Number })
  readonly maxUsers: number;

  @ApiProperty({ type: Number })
  readonly maxSessions: number;

  @ApiProperty({ type: Number })
  readonly maxRequests: number;

  // trial settings
  @ApiProperty({ type: Number })
  readonly trialDays: number;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<PlanEntity>) {
    Object.assign(this, props);
  }
}
