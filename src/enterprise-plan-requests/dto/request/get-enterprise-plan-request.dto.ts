import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { EnterprisePlanRequestStatusEnum } from 'src/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateEnterprisePlanRequestDto } from './create-enterprise-plan-request.dto';

export class GetEnterprisePlanRequestDto extends PartialType(
  PickType(CreateEnterprisePlanRequestDto, ['title', 'description'] as const),
) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ enum: EnterprisePlanRequestStatusEnum })
  @IsEnum(EnterprisePlanRequestStatusEnum)
  @IsOptional()
  status?: string;
}
