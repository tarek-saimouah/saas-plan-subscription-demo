import { ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyEnum, PaymentStatusEnum } from 'src/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetPaymentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ enum: CurrencyEnum })
  @IsEnum(CurrencyEnum)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: PaymentStatusEnum })
  @IsEnum(PaymentStatusEnum)
  @IsOptional()
  status?: string;
}
