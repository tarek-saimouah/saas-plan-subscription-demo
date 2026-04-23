import { UserEntity } from '../entities';
import { UserResponseDto } from '../dto';
import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { TenantMapper } from 'src/tenants/mappers';

@Injectable()
export class UserMapper {
  constructor(private readonly tenantMapper: TenantMapper) {}

  modelToEntity(
    model: Prisma.UserGetPayload<{ include: { tenant: true } }>,
  ): UserEntity {
    const tenant = model.tenant
      ? this.tenantMapper.modelToEntity(model.tenant)
      : null;

    return new UserEntity({ ...model, tenant });
  }

  entityToResponseDto(entity: UserEntity): UserResponseDto {
    const { password, verificationCode, tenant, ...rest } = entity;
    const tenantResponse = tenant
      ? this.tenantMapper.entityToResponseDto(tenant)
      : null;

    return { ...rest, tenant: tenantResponse };
  }
}
