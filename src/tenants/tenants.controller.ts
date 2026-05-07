import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
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
  ApiPaginatedResponse,
  DataResponse,
  DecodedUser,
  ErrorResponseDto,
  IPaginatedResult,
  JwtDecodedEntity,
  MessageResponseDto,
  PaginationParams,
  PlanKindEnum,
  RequireQuota,
  RequireSubscription,
  Roles,
  SubscriptionGuard,
} from '../common';
import {
  CanUseResourceDto,
  CanUseResourceResponseDto,
  SubscriptionUsageResponseDto,
  TenantResponseDto,
  UpdateTenantDto,
} from './dto';
import { TenantProfilesService } from './tenant-profiles.service';
import {
  SubscriptionEventResponseDto,
  SubscriptionResponseDto,
} from 'src/subscriptions/dto';
import { PaymentResponseDto } from 'src/payments/dto';
import { PaymentsService } from 'src/payments/payments.service';
import { SubscriptionEventsService } from 'src/subscriptions/subscription-events.service';
import { PlanResponseDto } from 'src/plans';
import { PlansService } from 'src/plans/plans.service';

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
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionEventsService: SubscriptionEventsService,
    private readonly plansService: PlansService,
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
  async updateProfile(
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
    description: 'Get payments (paging)',
  })
  @ApiPaginatedResponse(PaymentResponseDto)
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: true,
    allowSuspended: true,
  })
  @Roles(['user'])
  @Get('subscription/payments')
  findAllPaymentsPaging(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Query() pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<PaymentResponseDto>> {
    return this.paymentsService.findAllPaging(
      { tenantId: decodedUser.tenantId! },
      pagingArgs,
    );
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'Get subscription events (paging)',
  })
  @ApiPaginatedResponse(SubscriptionEventResponseDto)
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: true,
    allowSuspended: true,
  })
  @Roles(['user'])
  @Get('subscription/events')
  findAllEventsPaging(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Query() pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<SubscriptionEventResponseDto>> {
    return this.subscriptionEventsService.findAllPaging(
      { tenantId: decodedUser.tenantId! },
      pagingArgs,
    );
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
    description: 'Get tenant enterprise plans (paging)',
  })
  @ApiPaginatedResponse(PlanResponseDto)
  // permissions
  @Roles(['user'])
  @Get('enterprise-plans')
  findAllEnterprisePlansPaging(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Query() pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<PlanResponseDto>> {
    return this.plansService.findAllPaging(
      { tenantId: decodedUser.tenantId!, kind: PlanKindEnum.ENTERPRISE_CUSTOM },
      pagingArgs,
    );
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
    description: 'check if can use subscription resource by client',
  })
  @ApiDataResponse(CanUseResourceResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @UseGuards(SubscriptionGuard)
  @RequireSubscription({
    allowTrial: true,
    allowActive: true,
    allowPastDue: false,
    allowSuspended: false,
  })
  @Roles(['user'])
  @Get('resources/can-use')
  async canTenantUseResource(
    @DecodedUser() decodedUser: JwtDecodedEntity,
    @Query() getArgs: CanUseResourceDto,
  ): Promise<DataResponse<CanUseResourceResponseDto>> {
    const result = await this.tenantProfilesService.canTenantUseResource({
      tenantId: decodedUser.tenantId!,
      resourceKey: getArgs.resource as any,
    });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription resource (max projects)',
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
  @Post('resources/use-projects')
  async useProjectsQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result =
      await this.tenantProfilesService.tenantSubscriptionResourceUse({
        tenantId: decodedUser.tenantId!,
        resourceKey: 'projectsCount',
      });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription resource (max users)',
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
  @Post('resources/use-users')
  async useUsersQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result =
      await this.tenantProfilesService.tenantSubscriptionResourceUse({
        tenantId: decodedUser.tenantId!,
        resourceKey: 'usersCount',
      });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription resource (max sessions)',
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
  @Post('resources/use-sessions')
  async useSessionsQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result =
      await this.tenantProfilesService.tenantSubscriptionResourceUse({
        tenantId: decodedUser.tenantId!,
        resourceKey: 'sessionsCount',
      });
    return new DataResponse(result);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'use subscription resource (max requests)',
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
  @Post('resources/use-requests')
  async useRequestsQuota(
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<SubscriptionUsageResponseDto>> {
    const result =
      await this.tenantProfilesService.tenantSubscriptionResourceUse({
        tenantId: decodedUser.tenantId!,
        resourceKey: 'requestsCount',
      });
    return new DataResponse(result);
  }
}
