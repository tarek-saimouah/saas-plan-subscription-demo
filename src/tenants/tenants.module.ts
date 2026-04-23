import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantMapper } from './mappers';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [],
  exports: [TenantsService, TenantMapper],
  controllers: [TenantsController],
  providers: [TenantsService, TenantMapper],
})
export class TenantsModule {}
