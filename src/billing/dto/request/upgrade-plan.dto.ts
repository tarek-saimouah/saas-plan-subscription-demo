import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { BillingCycleEnum } from 'src/common';

export class UpgradePlanDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ enum: BillingCycleEnum })
  @IsEnum(BillingCycleEnum)
  billingCycle: string;
}
