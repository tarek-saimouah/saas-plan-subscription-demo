import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiDataResponse,
  DataResponse,
  DecodedUser,
  ErrorResponseDto,
  JwtDecodedEntity,
  Roles,
} from '../common';
import { UserResponseDto } from './dto';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Roles: (admin, user)',
    description: 'get user profile',
  })
  @ApiDataResponse(UserResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin', 'user'])
  @Get('me')
  async getMe(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<UserResponseDto>> {
    const result = await this.usersService.getById(decodedUser.userId);
    return new DataResponse(result);
  }
}
