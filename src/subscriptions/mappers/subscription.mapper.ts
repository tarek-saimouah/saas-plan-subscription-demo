import { Injectable } from '@nestjs/common';
import { SubscriptionEntity } from '../entities';
import { SubscriptionResponseDto } from '../dto';
import { TenantSubscription } from 'src/generated/prisma/client';

@Injectable()
export class SubscriptionMapper {
  modelToEntity(model: TenantSubscription): SubscriptionEntity {
    const { priceSnapshot, ...rest } = model;
    return new SubscriptionEntity({
      ...rest,
      ...(priceSnapshot && { priceSnapshot: priceSnapshot.toNumber() }),
    });
  }

  entityToResponseDto(entity: SubscriptionEntity): SubscriptionResponseDto {
    const { tapCardId, tapCustomerId, tapPaymentAgreementId, ...rest } = entity;
    return rest;
  }
}
