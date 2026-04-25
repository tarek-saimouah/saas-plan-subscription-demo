import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
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
  GetEnterprisePlanRequestDto,
  EnterprisePlanRequestResponseDto,
  ReviewEnterprisePlanRequestDto,
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
import { CreateEnterprisePlanDto } from 'src/plans';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('dashboard/enterprise-plan-requests')
@Controller('dashboard/enterprise-plan-requests')
export class EnterprisePlanRequestsDashboardController {
  constructor(
    private readonly enterprisePlanRequestsService: EnterprisePlanRequestsService,
  ) {}

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get enterprise plan requests paging',
  })
  @ApiPaginatedResponse(EnterprisePlanRequestResponseDto)
  // permissions
  @Roles(['admin'])
  @Get()
  async findAllPaging(
    @Query() filter?: GetEnterprisePlanRequestDto,
    @Query() paginationParams?: PaginationParams,
  ): Promise<IPaginatedResult<EnterprisePlanRequestResponseDto>> {
    return await this.enterprisePlanRequestsService.findAllPaging(
      filter,
      paginationParams,
    );
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get enterprise plan request by id',
  })
  @ApiDataResponse(EnterprisePlanRequestResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<DataResponse<EnterprisePlanRequestResponseDto>> {
    const enterprisePlanRequest =
      await this.enterprisePlanRequestsService.getById(id);
    return new DataResponse(enterprisePlanRequest);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'review enterprise plan request',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(EnterprisePlanRequestResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'When trying to review finalized enterprise plan request',
  })
  // permissions
  @Roles(['admin'])
  @Patch(':id/review')
  async reviewRequest(
    @Param('id') id: string,
    @Body() payload: ReviewEnterprisePlanRequestDto,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<EnterprisePlanRequestResponseDto>> {
    const enterprisePlanRequest =
      await this.enterprisePlanRequestsService.reviewRequest({
        requestId: id,
        adminUserId: decodedUser.userId,
        payload,
      });
    return new DataResponse(enterprisePlanRequest);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'approve and create enterprise plan request',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(EnterprisePlanRequestResponseDto)
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'When trying to approve finalized enterprise plan request',
  })
  // permissions
  @Roles(['admin'])
  @Post(':id/approve-and-create')
  async update(
    @Param('id') id: string,
    @Body() payload: CreateEnterprisePlanDto,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<EnterprisePlanRequestResponseDto>> {
    const result =
      await this.enterprisePlanRequestsService.approveAndCreatePlan({
        requestId: id,
        adminUserId: decodedUser.userId,
        payload,
      });

    return new DataResponse(result.request);
  }
}
