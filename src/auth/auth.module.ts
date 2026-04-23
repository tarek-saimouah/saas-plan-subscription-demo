import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CustomJwtModule } from 'src/common';
import { UsersModule } from 'src/users/users.module';
import { TenantsModule } from 'src/tenants/tenants.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [UsersModule, TenantsModule, SubscriptionsModule, CustomJwtModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
