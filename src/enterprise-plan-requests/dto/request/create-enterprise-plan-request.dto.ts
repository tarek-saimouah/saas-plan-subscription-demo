import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateEnterprisePlanRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ type: Number })
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedProjects?: number;

  @ApiPropertyOptional({ type: Number })
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedUsers?: number;

  @ApiPropertyOptional({ type: Number })
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedSessions?: number;

  @ApiPropertyOptional({ type: Number })
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedRequests?: number;
}
