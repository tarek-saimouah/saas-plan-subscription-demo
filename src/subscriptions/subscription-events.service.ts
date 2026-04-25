import { Injectable } from '@nestjs/common';
import { GetSubscriptionEventDto, SubscriptionEventResponseDto } from './dto';
import {
  getPaginationArgs,
  getPaginationMeta,
  IPaginatedResult,
  PaginationParams,
  PagingDataResponse,
} from 'src/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/database';

@Injectable()
export class SubscriptionEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaging(
    filter?: GetSubscriptionEventDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<SubscriptionEventResponseDto>> {
    const { tenantId, ...rest } = filter || {};
    const query: Prisma.SubscriptionEventWhereInput = {
      ...rest,
      ...(tenantId && { subscription: { tenantId } }),
    };

    const orderBy: Prisma.SubscriptionEventOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.subscriptionEvent.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.subscriptionEvent.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    return new PagingDataResponse(results, meta);
  }
}
