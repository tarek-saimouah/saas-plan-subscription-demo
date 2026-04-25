import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiCreatedDataResponse,
  ApiDataArrayResponse,
  DataArrayResponse,
  DataResponse,
  DecodedUser,
  ErrorResponseDto,
  JwtDecodedEntity,
  MessageResponseDto,
  Public,
  Roles,
} from 'src/common';
import { PlanUserResponseDto } from 'src/plans';
import { PlansService } from 'src/plans/plans.service';
import {
  DowngradePlanDto,
  UpgradePlanDto,
  UpgradePlanResponseDto,
} from './dto';
import { BillingService } from './billing.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly plansService: PlansService,
  ) {}

  @ApiOperation({
    summary: 'Public',
    description: 'get standard plans',
  })
  @ApiDataArrayResponse(PlanUserResponseDto)
  // permissions
  @Public()
  @Get('plans')
  async findAllForLanding(): Promise<DataArrayResponse<PlanUserResponseDto>> {
    const results = await this.plansService.findAllForLanding();
    return new DataArrayResponse(results);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'upgrade plan',
  })
  @ApiCreatedDataResponse(UpgradePlanResponseDto)
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
  })
  // permissions
  @Roles(['user'])
  @Post('plan-upgrade')
  async upgradePlan(
    @Body() payload: UpgradePlanDto,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<UpgradePlanResponseDto>> {
    const created = await this.billingService.upgradePlan(
      decodedUser.tenantId!,
      payload,
    );
    return new DataResponse(created);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'enterprise plan subscribe',
  })
  @ApiCreatedDataResponse(UpgradePlanResponseDto)
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
  })
  // permissions
  @Roles(['user'])
  @Post('enterprise-plan-subscribe')
  async subscripeToEnterprisePlan(
    @Body() payload: UpgradePlanDto,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<UpgradePlanResponseDto>> {
    const created = await this.billingService.subscripeToEnterprisePlan(
      decodedUser.tenantId!,
      payload,
    );
    return new DataResponse(created);
  }

  @ApiOperation({
    summary: 'Roles: (user)',
    description: 'downgrade plan',
  })
  @ApiResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
  })
  // permissions
  @Roles(['user'])
  @Post('plan-downgrade')
  downgradePlan(
    @Body() payload: DowngradePlanDto,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<MessageResponseDto> {
    return this.billingService.secheduleDowngradePlan(
      decodedUser.tenantId!,
      payload,
    );
  }

  // this endpoint is just to view a message after charge redirect
  @ApiExcludeEndpoint()
  // permissions
  @Public()
  @Get('after-charge')
  afterCharge() {
    return '<h1>Thanks for subscription!<h1>';
  }
}
