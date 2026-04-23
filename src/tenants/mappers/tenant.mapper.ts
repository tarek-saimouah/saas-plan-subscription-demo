import { Injectable } from '@nestjs/common';
import { TenantEntity } from '../entities';
import { TenantResponseDto } from '../dto';
import { Tenant } from 'src/generated/prisma/client';

@Injectable()
export class TenantMapper {
  modelToEntity(tenant: Tenant): TenantEntity {
    return new TenantEntity({
      tenantId: tenant.tenantId,
      name: tenant.name,
      suspendedAt: tenant.suspendedAt,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  }

  entityToResponseDto(tenant: TenantEntity): TenantResponseDto {
    return tenant;
  }
}
