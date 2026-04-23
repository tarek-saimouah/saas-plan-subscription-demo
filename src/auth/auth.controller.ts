import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto, Public } from 'src/common';
import {
  SigninRequestDto,
  SigninResponseDto,
  SignupRequestDto,
  SignupResponseDto,
  VerifyVerificationTokenRequestDto,
} from './dto';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'signup user',
    description:
      'send the verification token with the verification code sent to the email to (verify-verification-token) endpoint',
  })
  @ApiResponse({ type: SignupResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  // permissions
  @Public()
  @Post('sign-up')
  signupUser(@Body() payload: SignupRequestDto): Promise<SignupResponseDto> {
    return this.authService.signupUser(payload);
  }

  @ApiOperation({
    summary: 'signin user',
    description: '',
  })
  @ApiResponse({ type: SigninResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Public()
  @Post('sign-in')
  signinUser(@Body() payload: SigninRequestDto): Promise<SigninResponseDto> {
    return this.authService.signinUser(payload);
  }

  @ApiOperation({
    summary: 'verify verification token and get a signin response',
  })
  @ApiResponse({ type: SigninResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Public()
  @Post('verify-verification-token')
  verifyAccount(
    @Body() payload: VerifyVerificationTokenRequestDto,
  ): Promise<SigninResponseDto> {
    return this.authService.verifyVerificationToken(payload);
  }
}
