import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnterprisePlanRequestEventTypeEnum } from 'src/common';

export class GetEnterprisePlanRequestEventDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requestId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ enum: EnterprisePlanRequestEventTypeEnum })
  @IsEnum(EnterprisePlanRequestEventTypeEnum)
  @IsOptional()
  type?: string; // trial_started, trial_expired, payment_pending, payment_succeeded, payment_failed, renewed, upgraded, downgraded, downgrade_scheduled, cancelled, past_due, suspended, reactivated, manual_adjustment, enterprise_plan_created, enterprise_plan_updated
}
