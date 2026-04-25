import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database';
import {
  CreateEnterprisePlanRequestDto,
  EnterprisePlanRequestResponseDto,
  GetEnterprisePlanRequestDto,
  ReviewEnterprisePlanRequestDto,
} from './dto';
import {
  EnterprisePlanRequestEventTypeEnum,
  EnterprisePlanRequestStatusEnum,
  getPaginationArgs,
  getPaginationMeta,
  IPaginatedResult,
  PaginationParams,
  PagingDataResponse,
  PlanKindEnum,
  SubscriptionEventTypeEnum,
} from 'src/common';
import { Prisma } from 'src/generated/prisma/client';
import { CreateEnterprisePlanDto } from 'src/plans';

@Injectable()
export class EnterprisePlanRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    tenantId: string;
    payload: CreateEnterprisePlanRequestDto;
  }): Promise<EnterprisePlanRequestResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { tenantId: params.tenantId },
        select: { tenantId: true },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const pending = await tx.enterprisePlanRequest.findFirst({
        where: {
          tenantId: params.tenantId,
          status: {
            in: [
              EnterprisePlanRequestStatusEnum.PENDING,
              EnterprisePlanRequestStatusEnum.CONTACTED,
            ],
          },
        },
      });

      if (pending) {
        throw new BadRequestException(
          'You already have an open enterprise plan request',
        );
      }

      const request = await tx.enterprisePlanRequest.create({
        data: {
          tenantId: params.tenantId,
          ...params.payload,
        },
      });

      await tx.enterprisePlanRequestEvent
        .create({
          data: {
            requestId: request.requestId,
            type: EnterprisePlanRequestEventTypeEnum.CREATED,
            actorUserId: params.userId,
            meta: params.payload as any,
          },
        })
        .catch(() => undefined);

      return request;
    });
  }

  async getById(
    requestId: string,
    tenantId?: string,
  ): Promise<EnterprisePlanRequestResponseDto> {
    const result = await this.prisma.enterprisePlanRequest.findUnique({
      where: { requestId, ...(tenantId && { tenantId }) },
    });

    if (!result) {
      throw new NotFoundException('Enterprise plan request not found');
    }

    return result;
  }

  async findAllPaging(
    filter?: GetEnterprisePlanRequestDto,
    pagingArgs?: PaginationParams,
  ): Promise<IPaginatedResult<EnterprisePlanRequestResponseDto>> {
    const query: Prisma.EnterprisePlanRequestWhereInput = {
      ...filter,
      ...(filter?.title && {
        title: { contains: filter.title, mode: 'insensitive' },
      }),
      ...(filter?.description && {
        description: { contains: filter.description, mode: 'insensitive' },
      }),
    };

    const orderBy: Prisma.EnterprisePlanRequestOrderByWithAggregationInput = {
      createdAt: 'desc',
    };

    const { take, skip } = getPaginationArgs(pagingArgs);

    const [results, total] = await this.prisma.$transaction([
      this.prisma.enterprisePlanRequest.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      this.prisma.enterprisePlanRequest.count({ where: query }),
    ]);

    const meta = getPaginationMeta(total, pagingArgs);

    return new PagingDataResponse(results, meta);
  }

  async reviewRequest(params: {
    requestId: string;
    adminUserId: string;
    payload: ReviewEnterprisePlanRequestDto;
  }): Promise<EnterprisePlanRequestResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.enterprisePlanRequest.findUnique({
        where: { requestId: params.requestId },
      });

      if (!request) {
        throw new NotFoundException('Enterprise plan request not found');
      }

      if (
        request.status === EnterprisePlanRequestStatusEnum.APPROVED ||
        request.status === EnterprisePlanRequestStatusEnum.REJECTED
      ) {
        throw new BadRequestException('Request already finalized');
      }

      const updated = await tx.enterprisePlanRequest.update({
        where: { requestId: params.requestId },
        data: {
          status: params.payload.status,
          adminNotes: params.payload.adminNotes,
        },
      });

      await tx.enterprisePlanRequestEvent
        .create({
          data: {
            requestId: request.requestId,
            type: EnterprisePlanRequestEventTypeEnum.REVIEWED,
            actorUserId: params.adminUserId,
            meta: params.payload as any,
          },
        })
        .catch(() => undefined);

      return updated;
    });
  }

  async approveAndCreatePlan(params: {
    requestId: string;
    adminUserId: string;
    payload: CreateEnterprisePlanDto;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.enterprisePlanRequest.findUnique({
        where: { requestId: params.requestId },
      });

      if (!request) {
        throw new NotFoundException('Enterprise plan request not found');
      }

      if (request.status === EnterprisePlanRequestStatusEnum.REJECTED) {
        throw new BadRequestException('Rejected request cannot be approved');
      }

      const tenant = await tx.tenant.findUnique({
        where: { tenantId: request.tenantId },
        include: {
          subscription: true,
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const existingPlan = await tx.plan.findFirst({
        where: {
          name: params.payload.name,
        },
        select: { planId: true },
      });

      if (existingPlan) {
        throw new BadRequestException('Plan name already exists');
      }

      const plan = await tx.plan.create({
        data: {
          ...params.payload,
          kind: PlanKindEnum.ENTERPRISE_CUSTOM,
          tenantId: request.tenantId,
        },
      });

      const approvedRequest = await tx.enterprisePlanRequest.update({
        where: { requestId: request.requestId },
        data: {
          status: EnterprisePlanRequestStatusEnum.APPROVED,
          adminNotes: params.payload.description ?? request.adminNotes ?? null,
        },
      });

      // create events

      await Promise.all([
        tx.enterprisePlanRequestEvent
          .create({
            data: {
              requestId: request.requestId,
              type: EnterprisePlanRequestEventTypeEnum.REVIEWED,
              actorUserId: params.adminUserId,
              meta: params.payload as any,
            },
          })
          .catch(() => undefined),
        tx.subscriptionEvent
          .create({
            data: {
              subscriptionId: tenant.subscription?.subscriptionId ?? '',
              type: SubscriptionEventTypeEnum.ENTERPRISE_PLAN_CREATED,
              toPlanId: plan.planId,
              actorUserId: params.adminUserId,
              meta: {
                requestId: request.requestId,
                tenantId: request.tenantId,
                monthlyPrice: plan.monthlyPrice,
                yearlyPrice: plan.yearlyPrice,
                currency: plan.currency,
              } as any,
            },
          })
          .catch(() => undefined),
      ]);

      return {
        request: approvedRequest,
        plan,
      };
    });
  }
}
