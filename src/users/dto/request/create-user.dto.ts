import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { UserRoleEnum } from 'src/common';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8, { message: 'password must be at least 8 charachters long' })
  @IsString()
  password: string;

  role: UserRoleEnum;

  verificationCode?: string;
}
