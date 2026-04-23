import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { UserRoleEnum } from 'src/common';
import { IsEnum } from 'class-validator';

export class GetUserDto extends PartialType(
  PickType(CreateUserDto, ['fullName', 'email'] as const),
) {
  @ApiPropertyOptional({ enum: UserRoleEnum })
  @IsEnum(UserRoleEnum)
  role?: string;
}
