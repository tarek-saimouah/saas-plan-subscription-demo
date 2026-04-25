import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EnterprisePlanRequestStatusEnum } from 'src/common';

export class ReviewEnterprisePlanRequestDto {
  @ApiProperty({
    enum: [
      EnterprisePlanRequestStatusEnum.CONTACTED,
      EnterprisePlanRequestStatusEnum.APPROVED,
      EnterprisePlanRequestStatusEnum.REJECTED,
    ],
  })
  @IsEnum([
    EnterprisePlanRequestStatusEnum.CONTACTED,
    EnterprisePlanRequestStatusEnum.APPROVED,
    EnterprisePlanRequestStatusEnum.REJECTED,
  ])
  status: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  adminNotes?: string;
}
