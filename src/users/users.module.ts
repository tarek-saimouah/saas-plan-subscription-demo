import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserMapper } from './mappers';
import { UsersDashboardController } from './users.dashboard.controller';
import { TenantsModule } from 'src/tenants/tenants.module';
import { UsersController } from './users.controller';

@Module({
  imports: [TenantsModule],
  exports: [UsersService, UserMapper],
  controllers: [UsersController, UsersDashboardController],
  providers: [UsersService, UserMapper],
})
export class UsersModule {}
