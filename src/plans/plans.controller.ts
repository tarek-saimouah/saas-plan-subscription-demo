import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreatePlanDto,
  GetPlanDto,
  PlanResponseDto,
  UpdatePlanDto,
} from './dto';
import {
  ApiCreatedDataResponse,
  ApiDataResponse,
  ApiPaginatedResponse,
  DataResponse,
  ErrorResponseDto,
  IPaginatedResult,
  MessageResponseDto,
  PaginationParams,
  Roles,
} from 'src/common';
import { PlansService } from './plans.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'create plan',
  })
  @ApiCreatedDataResponse(PlanResponseDto)
  @ApiConflictResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Post()
  async create(
    @Body() payload: CreatePlanDto,
  ): Promise<DataResponse<PlanResponseDto>> {
    const created = await this.plansService.create(payload);
    return new DataResponse(created);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get plans paging',
  })
  @ApiPaginatedResponse(PlanResponseDto)
  // permissions
  @Roles(['admin'])
  @Get()
  async findAllPaging(
    @Query() filter?: GetPlanDto,
    @Query() paginationParams?: PaginationParams,
  ): Promise<IPaginatedResult<PlanResponseDto>> {
    return await this.plansService.findAllPaging(filter, paginationParams);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get plan by id',
  })
  @ApiDataResponse(PlanResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<DataResponse<PlanResponseDto>> {
    const plan = await this.plansService.getById(id);
    return new DataResponse(plan);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'update plan',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedDataResponse(PlanResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'When trying to update free plan prices',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
  })
  // permissions
  @Roles(['admin'])
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdatePlanDto,
  ): Promise<DataResponse<PlanResponseDto>> {
    const plan = await this.plansService.update(id, payload);
    return new DataResponse(plan);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'delete plan',
  })
  @ApiResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'When trying to delete free plan or plan with subscriptions',
  })
  @Roles(['admin'])
  @Delete(':id')
  remove(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.plansService.remove(id);
  }
}
