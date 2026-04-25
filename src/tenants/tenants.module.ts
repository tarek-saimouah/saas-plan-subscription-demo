import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantMapper } from './mappers';
import { TenantsController } from './tenants.controller';
import { DashboardTenantsController } from './tenants.dashboard.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { TenantProfilesService } from './tenant-profiles.service';
import { PaymentsModule } from 'src/payments/payments.module';
import { PlansModule } from 'src/plans/plans.module';

@Module({
  imports: [SubscriptionsModule, PaymentsModule, PlansModule],
  exports: [TenantsService, TenantMapper],
  controllers: [TenantsController, DashboardTenantsController],
  providers: [TenantsService, TenantProfilesService, TenantMapper],
})
export class TenantsModule {}
