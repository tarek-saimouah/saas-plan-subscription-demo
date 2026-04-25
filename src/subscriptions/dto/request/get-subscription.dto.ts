import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SubscriptionStatusEnum } from 'src/common';

export class GetSubscriptionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatusEnum })
  @IsEnum(SubscriptionStatusEnum)
  @IsOptional()
  status?: string;
}
