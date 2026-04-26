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
  type?: string; // created, reviewed
}
