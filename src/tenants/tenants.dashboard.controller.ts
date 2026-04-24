import { Controller, Get, Param, Query } from '@nestjs/common';
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
  ApiPaginatedResponse,
  DataResponse,
  ErrorResponseDto,
  IPaginatedResult,
  PaginationParams,
  Roles,
} from 'src/common';
import {
  TenantResponseDto,
  GetTenantDto,
  SubscriptionUsageResponseDto,
} from './dto';
import { TenantsService } from './tenants.service';
import { SubscriptionResponseDto } from 'src/subscriptions/dto';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('dashboard/tenants')
@Controller('dashboard/tenants')
export class DashboardTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'Get tenants (paging)',
  })
  @ApiPaginatedResponse(TenantResponseDto)
  // permissions
  @Roles(['admin'])
  @Get()
  findAllPaging(
    @Query() filter?: GetTenantDto,
    @Query() pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<TenantResponseDto>> {
    return this.tenantsService.findAllPaging(filter, pagingArgs);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'Get tenant by id',
  })
  @ApiDataResponse(TenantResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  async getById(
    @Param('id') tenantId: string,
  ): Promise<DataResponse<TenantResponseDto>> {
    const result = await this.tenantsService.getById(tenantId);
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'Get tenant subscription',
  })
  @ApiDataResponse(SubscriptionResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id/subscription')
  async getSubscription(
    @Param('id') tenantId: string,
  ): Promise<DataResponse<SubscriptionResponseDto>> {
    const result = await this.tenantsService.getSubscription(tenantId);
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'Get tenant usage',
  })
  @ApiDataResponse(SubscriptionUsageResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id/usage')
  async getUsage(
    @Param('id') tenantId: string,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result = await this.tenantsService.getUsage(tenantId);
    return new DataResponse(result);
  }
}
