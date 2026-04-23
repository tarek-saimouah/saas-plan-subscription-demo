import { ApiProperty } from '@nestjs/swagger';

export class SignupResponseDto {
  @ApiProperty({
    description:
      'The verification token that needs to be sent with verification code received by phone sms to the verify-verification-token endpoint',
  })
  verificationToken: string;
}
