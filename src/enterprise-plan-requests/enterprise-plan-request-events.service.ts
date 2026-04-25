import { Injectable } from '@nestjs/common';
import {
  GetEnterprisePlanRequestEventDto,
  EnterprisePlanRequestEventResponseDto,
} from './dto';
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
export class EnterprisePlanRequestEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaging(
    filter?: GetEnterprisePlanRequestEventDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<EnterprisePlanRequestEventResponseDto>> {
    const { tenantId, ...rest } = filter || {};
    const query: Prisma.EnterprisePlanRequestEventWhereInput = {
      ...rest,
      ...(tenantId && { request: { tenantId } }),
    };

    const orderBy: Prisma.EnterprisePlanRequestEventOrderByWithAggregationInput =
      {
        createdAt: 'desc',
      };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.enterprisePlanRequestEvent.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.enterprisePlanRequestEvent.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    return new PagingDataResponse(results, meta);
  }
}
