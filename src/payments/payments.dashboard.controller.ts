import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GetPaymentDto, PaymentResponseDto } from './dto';
import {
  ApiDataResponse,
  ApiPaginatedResponse,
  DataResponse,
  ErrorResponseDto,
  IPaginatedResult,
  PaginationParams,
  Roles,
} from 'src/common';
import { PaymentsService } from './payments.service';

@ApiInternalServerErrorResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBearerAuth()
@ApiTags('dashboard/payments')
@Controller('dashboard/payments')
export class PaymentsDashboardController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get payments paging',
  })
  @ApiPaginatedResponse(PaymentResponseDto)
  // permissions
  @Roles(['admin'])
  @Get()
  async findAllPaging(
    @Query() filter?: GetPaymentDto,
    @Query() paginationParams?: PaginationParams,
  ): Promise<IPaginatedResult<PaymentResponseDto>> {
    return await this.paymentsService.findAllPaging(filter, paginationParams);
  }

  @ApiOperation({
    summary: 'Roles: (admin)',
    description: 'get payment by id',
  })
  @ApiDataResponse(PaymentResponseDto)
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  // permissions
  @Roles(['admin'])
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<DataResponse<PaymentResponseDto>> {
    const payment = await this.paymentsService.getById(id);
    return new DataResponse(payment);
  }
}
