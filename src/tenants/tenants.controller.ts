import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiCreatedDataResponse,
  ApiDataResponse,
  DataResponse,
  DecodedUser,
  ErrorResponseDto,
  JwtDecodedEntity,
  MessageResponseDto,
  RequireQuota,
  RequireSubscription,
  Roles,
  SubscriptionGuard,
} from '../common';
import {
  SubscriptionUsageResponseDto,
  TenantResponseDto,
  UpdateTenantDto,
} from './dto';
import { TenantProfilesService } from './tenant-profiles.service';
import { SubscriptionResponseDto } from 'src/subscriptions/dto';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantProfilesService: TenantProfilesService,
  ) {}

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'get tenant profile',
  })
  @ApiDataResponse(TenantResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: true,
    allowSuspended: true,
  })
  @Roles(['user'])
  @Get('profile')
  async getProfile(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<TenantResponseDto>> {
    const result = await this.tenantsService.getById(decodedUser.tenantId!);
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'update tenant profile',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(TenantResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
  })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: false,
    allowSuspended: false,
  })
  @Roles(['user'])
  @Patch('profile')
  async update(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Body() payload: UpdateTenantDto,
  ): Promise<DataResponse<TenantResponseDto>> {
    const result = await this.tenantProfilesService.update(
      decodedUser.userId,
      decodedUser.tenantId!,
      payload,
    );
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'get tenant subscription',
  })
  @ApiDataResponse(SubscriptionResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: true,
    allowSuspended: true,
  })
  @Roles(['user'])
  @Get('subscription')
  async getSubscription(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionResponseDto>> {
    const result = await this.tenantsService.getSubscription(
      decodedUser.tenantId!,
    );
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'get tenant usage',
  })
  @ApiDataResponse(SubscriptionUsageResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: true,
    allowSuspended: true,
  })
  @Roles(['user'])
  @Get('usage')
  async getUsage(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result = await this.tenantsService.getUsage(decodedUser.tenantId!);
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'tenant enterprise plan check',
  })
  @ApiResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: false,
    allowActive: true,
    allowPastDue: true,
    allowSuspended: false,
    requireOwnEnterprisePlan: true,
  })
  @Roles(['user'])
  @Get('enterprise-endpoint')
  getEnterpriseMessage(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<MessageResponseDto> {
    return this.tenantProfilesService.getEnterpriseMessage(
      decodedUser.userId,
      decodedUser.tenantId!,
    );
  }

  // quota use endpoints

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription quota (max projects)',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(SubscriptionUsageResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: false,
    allowSuspended: false,
  })
  @RequireQuota('maxProjects')
  @Roles(['user'])
  @Post('usage/use-projects')
  async useProjectsQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result = await this.tenantProfilesService.tenantSubscriptionUse({
      tenantId: decodedUser.tenantId!,
      quotaUsageKey: 'projectsCount',
    });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription quota (max users)',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(SubscriptionUsageResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: false,
    allowSuspended: false,
  })
  @RequireQuota('maxUsers')
  // permissions
  @Roles(['user'])
  @Post('usage/use-users')
  async useUsersQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result = await this.tenantProfilesService.tenantSubscriptionUse({
      tenantId: decodedUser.tenantId!,
      quotaUsageKey: 'usersCount',
    });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription quota (max sessions)',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(SubscriptionUsageResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: false,
    allowSuspended: false,
  })
  @RequireQuota('maxSessions')
  // permissions
  @Roles(['user'])
  @Post('usage/use-sessions')
  async useSessionsQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result = await this.tenantProfilesService.tenantSubscriptionUse({
      tenantId: decodedUser.tenantId!,
      quotaUsageKey: 'sessionsCount',
    });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription quota (max requests)',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(SubscriptionUsageResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: false,
    allowSuspended: false,
  })
  @RequireQuota('maxRequests')
  @Roles(['user'])
  @Post('usage/use-requests')
  async useRequestsQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result = await this.tenantProfilesService.tenantSubscriptionUse({
      tenantId: decodedUser.tenantId!,
      quotaUsageKey: 'requestsCount',
    });
    return new DataResponse(result);
  }
}
