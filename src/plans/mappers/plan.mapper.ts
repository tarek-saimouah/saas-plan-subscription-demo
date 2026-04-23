import { Injectable } from '@nestjs/common';
import { PlanEntity } from '../entities';
import { Plan } from 'src/generated/prisma/client';
import { PlanResponseDto, PlanUserResponseDto } from '../dto';

@Injectable()
export class PlanMapper {
  modelToEntity(model: Plan): PlanEntity {
    return new PlanEntity({
      ...model,
      monthlyPrice: model.monthlyPrice.toNumber(),
      yearlyPrice: model.yearlyPrice.toNumber(),
    });
  }

  entityToResponseDto(entity: PlanEntity): PlanResponseDto {
    return entity;
  }

  entityToUserResponseDto(entity: PlanEntity): PlanUserResponseDto {
    const { kind, tenantId, ...rest } = entity;
    return rest;
  }
}
