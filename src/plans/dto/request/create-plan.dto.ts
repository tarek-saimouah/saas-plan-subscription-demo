import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDecimal,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CurrencyEnum } from 'src/common';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder: number;

  @ApiProperty({ type: Number, example: 20.0 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must have a maximum of 2 decimal places' },
  )
  @Min(1.0)
  monthlyPrice: number;

  @ApiProperty({ type: Number, example: 200.0 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must have a maximum of 2 decimal places' },
  )
  @Min(1.0)
  yearlyPrice: number;

  @ApiProperty({ enum: CurrencyEnum })
  @IsEnum(CurrencyEnum)
  currency: string; // USD

  // quota columns
  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxProjects: number;

  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUsers: number;

  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSessions: number;

  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRequests: number;
}
