import { ApiProperty } from '@nestjs/swagger';
import { IsEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsEmpty()
  email: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8, { message: 'password must be at least 8 charachters long' })
  @IsString()
  password: string;
}
