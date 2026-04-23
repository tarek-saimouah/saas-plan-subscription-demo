import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/users/dto/response/user.response.dto';

export class SigninResponseDto {
  @ApiProperty({ type: UserResponseDto, nullable: true })
  user?: UserResponseDto;

  @ApiProperty({ nullable: true })
  accessToken?: string;

  @ApiProperty({ nullable: true })
  verificationToken?: string;
}
