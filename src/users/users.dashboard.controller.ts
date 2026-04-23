import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiPaginatedResponse,
  DataResponse,
  ErrorResponseDto,
  IPaginatedResult,
  PaginationParams,
  Roles,
} from '../common';
import { CreateAdminUserDto, GetUserDto, UserResponseDto } from './dto';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('dashboard/users')
@Controller('dashboard/users')
export class UsersDashboardController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'create admin user',
  })
  @ApiDataResponse(UserResponseDto)
  @ApiConflictResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Post('admin')
  async createAdmin(
    @Body() payload: CreateAdminUserDto,
  ): Promise<DataResponse<UserResponseDto>> {
    const result = await this.usersService.createAdmin(payload);
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'Get users (paging)',
  })
  @ApiPaginatedResponse(UserResponseDto)
  // permissions
  @Roles(['admin'])
  @Get()
  findAll(
    @Query() filter?: GetUserDto,
    @Query() pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<UserResponseDto>> {
    return this.usersService.findAllPaging(filter, pagingArgs);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get user by id',
  })
  @ApiDataResponse(UserResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  async getById(
    @Param('id') userId: string,
  ): Promise<DataResponse<UserResponseDto>> {
    const result = await this.usersService.getById(userId);
    return new DataResponse(result);
  }
}
