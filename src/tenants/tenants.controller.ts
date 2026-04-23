import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ErrorResponseDto,
  IPaginatedResult,
  PaginationParams,
  Roles,
} from 'src/common';
import { TenantResponseDto, GetTenantDto } from './dto';
import { TenantsService } from './tenants.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('dashboard/tenants')
@Controller('tenants')
export class TenantsController {
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
  @ApiResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  getById(@Param('id') tenantId: string): Promise<TenantResponseDto> {
    return this.tenantsService.getById(tenantId);
  }
}
