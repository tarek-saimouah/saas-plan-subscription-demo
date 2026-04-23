import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';
import { PlanKindEnum } from 'src/common';
import { IsEnum, IsOptional } from 'class-validator';

export class GetPlanDto extends PartialType(
  OmitType(CreatePlanDto, ['monthlyPrice', 'yearlyPrice'] as const),
) {
  @ApiPropertyOptional({ enum: PlanKindEnum })
  @IsEnum(PlanKindEnum)
  @IsOptional()
  kind?: string;
}
