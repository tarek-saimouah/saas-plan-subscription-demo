import { Type, plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  // General

  @IsString()
  @IsEnum(['local', 'development', 'staging', 'production'])
  NODE_ENV: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsEnum(['local', 'dev', 'staging', 'prod'])
  APP_ENV: string;

  // Logger

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;

  @IsString()
  @IsOptional()
  LOG_FORMAT?: string;

  // Database

  @IsString()
  DATABASE_URL: string;

  // Jwt

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_VERIFICATION_TOKEN_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRE: string;

  @IsString()
  JWT_VERIFICATION_TOKEN_EXPIRE: string;

  // Hash

  @IsString()
  HASH_SECRET: string;

  // Payment Gateway

  @IsString()
  TAP_PAYMENT_BASE_URL: string;

  @IsString()
  TAP_PAYMENT_API_KEY: string;

  @IsString()
  TAP_PAYMENT_WEBHOOK_URL: string;

  @IsString()
  TAP_PAYMENT_REDIRECT_URL: string;

  @IsString()
  TAP_MERCHANT_ID: string;

  // Swagger

  @IsString()
  SWAGGER_USER: string;

  @IsString()
  SWAGGER_PASSWORD: string;

  // Seed

  @IsString()
  @IsEmail()
  @IsOptional()
  ADMIN_SEED_EMAIL?: string;

  @IsString()
  @IsOptional()
  ADMIN_SEED_PASSWORD?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
