import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanMapper } from './mappers';
import {
  CreatePlanDto,
  GetPlanDto,
  PlanResponseDto,
  PlanUserResponseDto,
  UpdatePlanDto,
} from './dto';
import {
  getPaginationArgs,
  getPaginationMeta,
  IPaginatedResult,
  MessageResponseDto,
  PaginationParams,
  PagingDataResponse,
  PlanKindEnum,
  SuccessResponseDto,
} from 'src/common';
import { PrismaService } from 'src/database';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planMapper: PlanMapper,
  ) {}

  async create(payload: CreatePlanDto): Promise<PlanResponseDto> {
    const exists = await this.prisma.plan.findUnique({
      where: { name: payload.name },
    });

    if (exists) {
      throw new ConflictException('Plan name already exists');
    }

    const created = await this.prisma.plan.create({
      data: payload,
    });

    if (!created) {
      throw new Error('Error creating plan');
    }

    return this.planMapper.entityToResponseDto(
      this.planMapper.modelToEntity(created),
    );
  }

  async getById(planId: string): Promise<PlanResponseDto> {
    const result = await this.prisma.plan.findUnique({
      where: { planId },
    });

    if (!result) {
      throw new NotFoundException('Plan not found');
    }

    return this.planMapper.entityToResponseDto(
      this.planMapper.modelToEntity(result),
    );
  }

  async update(id: string, payload: UpdatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({ where: { planId: id } });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // prevent updating the free plan price
    if (
      plan.monthlyPrice.equals(0) &&
      plan.yearlyPrice.equals(0) &&
      (payload.monthlyPrice || payload.yearlyPrice)
    ) {
      throw new BadRequestException('Cannot update the free plan prices');
    }

    if (payload.name) {
      const exists = await this.prisma.plan.findFirst({
        where: { name: payload.name, planId: { not: id } },
      });

      if (exists) {
        throw new ConflictException('Plan name already exists');
      }
    }

    const updated = await this.prisma.plan.update({
      where: { planId: id },
      data: payload,
    });

    if (!updated) {
      throw new Error('Error updating plan');
    }

    return this.planMapper.entityToResponseDto(
      this.planMapper.modelToEntity(updated),
    );
  }

  async findAllPaging(
    filter?: GetPlanDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<PlanResponseDto>> {
    const query: Prisma.PlanWhereInput = {
      ...filter,
      ...(filter?.name && {
        name: { contains: filter.name, mode: 'insensitive' },
      }),
      ...(filter?.description && {
        description: { contains: filter.description, mode: 'insensitive' },
      }),
    };

    const orderBy: Prisma.PlanOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.plan.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    const data = results.map((res) =>
      this.planMapper.entityToResponseDto(this.planMapper.modelToEntity(res)),
    );

    return new PagingDataResponse(data, meta);
  }

  async remove(id: string): Promise<MessageResponseDto> {
    // deny deleting plan with subscriptions or enterprise tenants

    const plan = await this.prisma.plan.findUnique({
      where: { planId: id },
      select: {
        _count: { select: { subscriptions: true } },
        tenantId: true,
        monthlyPrice: true,
        yearlyPrice: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // deny deleting free plan
    if (plan.monthlyPrice.equals(0) && plan.yearlyPrice.equals(0)) {
      throw new BadRequestException('Cannot delete free plan');
    }

    // deny deleting plan with subscriptions or enterprise tenants
    if (plan._count.subscriptions || plan.tenantId) {
      throw new BadRequestException('Cannot delete plan with subscriptions');
    }

    const deleted = await this.prisma.plan.delete({ where: { planId: id } });

    if (!deleted) {
      throw new Error('Error deleting plan');
    }

    return new SuccessResponseDto('Deleted successfully');
  }

  // for landing page user plans

  async findAllForLanding(): Promise<PlanUserResponseDto[]> {
    const query: Prisma.PlanWhereInput = {
      kind: PlanKindEnum.STANDARD,
      isActive: true,
    };

    const results = await this.prisma.plan.findMany({
      where: query,
      orderBy: { sortOrder: 'asc' },
    });

    return results.map((res) =>
      this.planMapper.entityToUserResponseDto(
        this.planMapper.modelToEntity(res),
      ),
    );
  }
}
