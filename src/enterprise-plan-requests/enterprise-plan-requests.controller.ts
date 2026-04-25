import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreateEnterprisePlanRequestDto,
  EnterprisePlanRequestResponseDto,
} from './dto';
import {
  ApiCreatedDataResponse,
  ApiDataResponse,
  ApiPaginatedResponse,
  DataResponse,
  DecodedUser,
  ErrorResponseDto,
  IPaginatedResult,
  JwtDecodedEntity,
  PaginationParams,
  Roles,
} from 'src/common';
import { EnterprisePlanRequestsService } from './enterprise-plan-requests.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('enterprise-plan-requests')
@Controller('enterprise-plan-requests')
export class EnterprisePlanRequestsController {
  constructor(
    private readonly enterprisePlanRequestsService: EnterprisePlanRequestsService,
  ) {}

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'create enterprise plan request',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(EnterprisePlanRequestResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['user'])
  @Post()
  async create(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Body() payload: CreateEnterprisePlanRequestDto,
  ): Promise<DataResponse<EnterprisePlanRequestResponseDto>> {
    const result = await this.enterprisePlanRequestsService.create({
      userId: decodedUser.userId,
      tenantId: decodedUser.tenantId!,
      payload,
    });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'get enterprise plan requests paging',
  })
  @ApiPaginatedResponse(EnterprisePlanRequestResponseDto)
  // permissions
  @Roles(['user'])
  @Get()
  async findAllPaging(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Query() paginationParams?: PaginationParams,
  ): Promise<IPaginatedResult<EnterprisePlanRequestResponseDto>> {
    return await this.enterprisePlanRequestsService.findAllPaging(
      { tenantId: decodedUser.tenantId! },
      paginationParams,
    );
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'get enterprise plan request by id',
  })
  @ApiDataResponse(EnterprisePlanRequestResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['user'])
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<EnterprisePlanRequestResponseDto>> {
    const enterprisePlanRequest =
      await this.enterprisePlanRequestsService.getById(
        id,
        decodedUser.tenantId!,
      );
    return new DataResponse(enterprisePlanRequest);
  }
}
