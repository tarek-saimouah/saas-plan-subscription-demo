import { OmitType } from '@nestjs/swagger';
import { PlanEntity } from '../../entities';

export class PlanResponseDto extends PlanEntity {}

export class PlanUserResponseDto extends OmitType(PlanEntity, [
  'kind',
  'tenantId',
] as const) {}
