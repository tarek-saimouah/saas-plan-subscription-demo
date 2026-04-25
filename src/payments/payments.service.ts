import { Injectable, NotFoundException } from '@nestjs/common';
import { GetPaymentDto, PaymentResponseDto } from './dto';
import {
  getPaginationArgs,
  getPaginationMeta,
  IPaginatedResult,
  PaginationParams,
  PagingDataResponse,
} from 'src/common';
import { PrismaService } from 'src/database';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(
    paymentId: string,
    tenantId?: string,
  ): Promise<PaymentResponseDto> {
    const result = await this.prisma.subscriptionPayment.findUnique({
      where: { paymentId, ...(tenantId && { subscription: { tenantId } }) },
    });

    if (!result) {
      throw new NotFoundException('Payment not found');
    }

    return { ...result, amount: result.amount.toNumber() };
  }

  async findAllPaging(
    filter?: GetPaymentDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<PaymentResponseDto>> {
    const { tenantId, ...rest } = filter || {};
    const query: Prisma.SubscriptionPaymentWhereInput = {
      ...rest,
      ...(tenantId && {
        subscription: {
          tenantId,
        },
      }),
    };

    const orderBy: Prisma.SubscriptionPaymentOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.subscriptionPayment.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.subscriptionPayment.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    const data = results.map((res) => {
      return { ...res, amount: res.amount.toNumber() };
    });

    return new PagingDataResponse(data, meta);
  }
}
