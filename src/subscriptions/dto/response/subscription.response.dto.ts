import { OmitType } from '@nestjs/swagger';
import { SubscriptionEntity } from '../../entities';

export class SubscriptionResponseDto extends OmitType(SubscriptionEntity, [
  'tapCardId',
  'tapCustomerId',
  'tapPaymentAgreementId',
] as const) {}
