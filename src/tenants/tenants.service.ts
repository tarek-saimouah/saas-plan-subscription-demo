import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getPaginationArgs,
  getPaginationMeta,
  IPaginatedResult,
  PaginationParams,
  PagingDataResponse,
} from 'src/common';
import { TenantMapper } from './mappers';

import { PrismaService } from 'src/database';
import { CreateTenantDto, GetTenantDto, TenantResponseDto } from './dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantMapper: TenantMapper,
  ) {}

  async create(
    userId: string,
    payload: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    const created = await this.prisma.tenant.create({
      data: {
        ...payload,
        owner: { connect: { userId } },
        usage: { create: {} },
      },
    });

    if (!created) {
      throw new Error('Error creating tenant');
    }

    return this.tenantMapper.entityToResponseDto(
      this.tenantMapper.modelToEntity(created),
    );
  }

  async exists(name: string): Promise<boolean> {
    const exists = await this.prisma.tenant.findFirst({
      where: { name },
      select: { tenantId: true },
    });

    return !!exists;
  }

  async getById(tenantId: string): Promise<TenantResponseDto> {
    const result = await this.prisma.tenant.findUnique({
      where: {
        tenantId,
      },
    });

    if (!result) {
      throw new NotFoundException('Tenant not found');
    }

    return this.tenantMapper.entityToResponseDto(
      this.tenantMapper.modelToEntity(result),
    );
  }

  async findAllPaging(
    filter?: GetTenantDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<TenantResponseDto>> {
    const query: Prisma.TenantWhereInput = {
      ...(filter?.name && {
        name: { contains: filter.name, mode: 'insensitive' },
      }),
    };

    const orderBy: Prisma.TenantOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.tenant.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    const data = results.map((res) =>
      this.tenantMapper.entityToResponseDto(
        this.tenantMapper.modelToEntity(res),
      ),
    );

    return new PagingDataResponse(data, meta);
  }
}
