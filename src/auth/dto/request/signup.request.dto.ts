import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateTenantDto } from 'src/tenants';
import { CreateUserDto } from 'src/users/dto/request/create-user.dto';

export class SignupRequestDto extends OmitType(CreateUserDto, [
  'verificationCode',
] as const) {
  @ApiProperty({ type: CreateTenantDto })
  @Type(() => CreateTenantDto)
  @ValidateNested({ always: true })
  tenant: CreateTenantDto;
}
