import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string;
}
