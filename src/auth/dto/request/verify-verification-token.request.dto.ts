import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyVerificationTokenRequestDto {
  @ApiProperty()
  @IsString()
  verificationToken: string;

  @ApiProperty()
  @IsString()
  code: string;
}
