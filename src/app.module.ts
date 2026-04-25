import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.validation';

import { PrismaModule } from './database/prisma.module';
import { CustomJwtModule, JwtGuard, RolesGuard } from './common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';

import { LoggerModule } from 'nestjs-pino';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentGatewayModule } from './payment-gateway/payment-gateway.module';
import { BillingModule } from './billing/billing.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from './payments/payments.module';
import { EnterprisePlanRequestsModule } from './enterprise-plan-requests/enterprise-plan-requests.module';

@Module({
  imports: [
    // config
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: './.env',
    }),
    // Logger
    LoggerModule.forRoot({
      pinoHttp: {
        base: undefined,
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          (process.env.NODE_ENV ?? 'development') === 'development' ||
          process.env.LOG_FORMAT === 'pretty'
            ? {
                target: 'pino-pretty',
              }
            : undefined,
      },
    }),

    // database
    PrismaModule,
    // jwt
    CustomJwtModule,
    // cronjobs
    ScheduleModule.forRoot(),

    PaymentGatewayModule,

    AuthModule,
    UsersModule,
    TenantsModule,
    PlansModule,
    SubscriptionsModule,
    BillingModule,
    EnterprisePlanRequestsModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
