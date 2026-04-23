import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetTenantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;
}
