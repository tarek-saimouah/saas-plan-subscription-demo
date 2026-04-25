import { PickType } from '@nestjs/swagger';
import { UpgradePlanDto } from './upgrade-plan.dto';

export class ResubscribeSuspendedPlanDto extends PickType(UpgradePlanDto, [
  'billingCycle',
] as const) {}
