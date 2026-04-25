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
  GetSubscriptionDto,
  GetSubscriptionEventDto,
  SubscriptionEventResponseDto,
  SubscriptionResponseDto,
} from './dto';
import {
  ApiDataResponse,
  ApiPaginatedResponse,
  DataResponse,
  ErrorResponseDto,
  IPaginatedResult,
  PaginationParams,
  Roles,
} from 'src/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionEventsService } from './subscription-events.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('dashboard/subscriptions')
@Controller('dashboard/subscriptions')
export class SubscriptionsDashboardController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionEventsService: SubscriptionEventsService,
  ) {}

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get subscriptions paging',
  })
  @ApiPaginatedResponse(SubscriptionResponseDto)
  // permissions
  @Roles(['admin'])
  @Get()
  async findAllPaging(
    @Query() filter?: GetSubscriptionDto,
    @Query() paginationParams?: PaginationParams,
  ): Promise<IPaginatedResult<SubscriptionResponseDto>> {
    return await this.subscriptionsService.findAllPaging(
      filter,
      paginationParams,
    );
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get subscription events paging',
  })
  @ApiPaginatedResponse(SubscriptionEventResponseDto)
  // permissions
  @Roles(['admin'])
  @Get('events')
  async findAllEventsPaging(
    @Query() filter?: GetSubscriptionEventDto,
    @Query() paginationParams?: PaginationParams,
  ): Promise<IPaginatedResult<SubscriptionEventResponseDto>> {
    return await this.subscriptionEventsService.findAllPaging(
      filter,
      paginationParams,
    );
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get subscription by id',
  })
  @ApiDataResponse(SubscriptionResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<DataResponse<SubscriptionResponseDto>> {
    const subscription = await this.subscriptionsService.getById(id);
    return new DataResponse(subscription);
  }
}
