import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiDataArrayResponse,
  DataArrayResponse,
  ErrorResponseDto,
  Public,
} from 'src/common';
import { PlanUserResponseDto } from 'src/plans';
import { PlansService } from 'src/plans/plans.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly plansService: PlansService) {}

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
}
