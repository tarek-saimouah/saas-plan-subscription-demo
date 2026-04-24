import { PickType } from '@nestjs/swagger';
import { UpgradePlanDto } from './upgrade-plan.dto';

export class DowngradePlanDto extends PickType(UpgradePlanDto, [
  'planId',
] as const) {}
