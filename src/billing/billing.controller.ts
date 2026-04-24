import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
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
  Public,
  Roles,
} from 'src/common';
import { PlanUserResponseDto } from 'src/plans';
import { PlansService } from 'src/plans/plans.service';
import { UpgradePlanDto, UpgradePlanResponseDto } from './dto';
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
  // permissions
  @Roles(['user'])
  @Post('plan-upgrade')
  async create(
    @Body() payload: UpgradePlanDto,
    @DecodedUser() decodedUser: JwtDecodedEntity,
  ): Promise<DataResponse<UpgradePlanResponseDto>> {
    const created = await this.billingService.upgradePlan(
      decodedUser.tenantId!,
      payload,
    );
    return new DataResponse(created);
  }
}
