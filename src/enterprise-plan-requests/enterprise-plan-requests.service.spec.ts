import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EnterprisePlanRequestsService } from './enterprise-plan-requests.service';
import { createPrismaMock } from '../../test/mock-helpers';
import { EnterprisePlanRequestStatusEnum, PlanKindEnum } from 'src/common';
import { decimal } from '../../test/test-utils';

describe('EnterprisePlanRequestsService', () => {
  const prisma = createPrismaMock();
  const service = new EnterprisePlanRequestsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (arg: any) =>
      typeof arg === 'function' ? arg(prisma) : arg,
    );
    prisma.enterprisePlanRequestEvent.create.mockResolvedValue({} as any);
    prisma.subscriptionEvent.create.mockResolvedValue({} as any);
  });

  it('blocks create() when a pending request already exists', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenantId: 'tenant-1' } as any);
    prisma.enterprisePlanRequest.findFirst.mockResolvedValue({
      requestId: 'req-1',
      status: EnterprisePlanRequestStatusEnum.PENDING,
    } as any);

    await expect(
      service.create({
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: {
          title: 'Need enterprise',
          description: 'Need more limits',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a new request when no open request exists', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenantId: 'tenant-1' } as any);
    prisma.enterprisePlanRequest.findFirst.mockResolvedValue(null);
    prisma.enterprisePlanRequest.create.mockResolvedValue({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      title: 'Need enterprise',
      description: 'Need more limits',
      status: EnterprisePlanRequestStatusEnum.PENDING,
    } as any);

    const result = await service.create({
      userId: 'user-1',
      tenantId: 'tenant-1',
      payload: {
        title: 'Need enterprise',
        description: 'Need more limits',
      },
    });

    expect(result.requestId).toBe('req-1');
    expect(prisma.enterprisePlanRequestEvent.create).toHaveBeenCalled();
  });

  it('blocks reviewRequest() on an approved request', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue({
      requestId: 'req-1',
      status: EnterprisePlanRequestStatusEnum.APPROVED,
    } as any);

    await expect(
      service.reviewRequest({
        requestId: 'req-1',
        adminUserId: 'admin-1',
        payload: { status: EnterprisePlanRequestStatusEnum.CONTACTED },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates reviewRequest() to contacted and writes an event', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue({
      requestId: 'req-1',
      status: EnterprisePlanRequestStatusEnum.PENDING,
    } as any);
    prisma.enterprisePlanRequest.update.mockResolvedValue({
      requestId: 'req-1',
      status: EnterprisePlanRequestStatusEnum.CONTACTED,
    } as any);

    const result = await service.reviewRequest({
      requestId: 'req-1',
      adminUserId: 'admin-1',
      payload: {
        status: EnterprisePlanRequestStatusEnum.CONTACTED,
        adminNotes: 'Reached out',
      },
    });

    expect(result.status).toBe(EnterprisePlanRequestStatusEnum.CONTACTED);
    expect(prisma.enterprisePlanRequestEvent.create).toHaveBeenCalled();
  });

  it('blocks approveAndCreatePlan() on a rejected request', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      status: EnterprisePlanRequestStatusEnum.REJECTED,
    } as any);

    await expect(
      service.approveAndCreatePlan({
        requestId: 'req-1',
        adminUserId: 'admin-1',
        payload: {
          name: 'Enterprise A',
          description: 'Custom',
          monthlyPrice: 100,
          yearlyPrice: 1000,
          currency: 'USD',
          maxProjects: 100,
          maxUsers: 100,
          maxSessions: 100,
          maxRequests: 100,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks approveAndCreatePlan() when the plan name already exists', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      status: EnterprisePlanRequestStatusEnum.PENDING,
    } as any);
    prisma.tenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      subscription: { subscriptionId: 'sub-1' },
    } as any);
    prisma.plan.findFirst.mockResolvedValue({ planId: 'plan-1' } as any);

    await expect(
      service.approveAndCreatePlan({
        requestId: 'req-1',
        adminUserId: 'admin-1',
        payload: {
          name: 'Enterprise A',
          description: 'Custom',
          monthlyPrice: 100,
          yearlyPrice: 1000,
          currency: 'USD',
          maxProjects: 100,
          maxUsers: 100,
          maxSessions: 100,
          maxRequests: 100,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an enterprise_custom plan and approves the request', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      status: EnterprisePlanRequestStatusEnum.PENDING,
      adminNotes: null,
    } as any);
    prisma.tenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      subscription: { subscriptionId: 'sub-1' },
    } as any);
    prisma.plan.findFirst.mockResolvedValue(null);
    prisma.plan.create.mockResolvedValue({
      planId: 'plan-1',
      kind: PlanKindEnum.ENTERPRISE_CUSTOM,
      tenantId: 'tenant-1',
      monthlyPrice: decimal(100),
      yearlyPrice: decimal(1000),
      currency: 'USD',
    } as any);
    prisma.enterprisePlanRequest.update.mockResolvedValue({
      requestId: 'req-1',
      status: EnterprisePlanRequestStatusEnum.APPROVED,
    } as any);

    const result = await service.approveAndCreatePlan({
      requestId: 'req-1',
      adminUserId: 'admin-1',
      payload: {
        name: 'Enterprise A',
        description: 'Custom',
        monthlyPrice: 100,
        yearlyPrice: 1000,
        currency: 'USD',
        maxProjects: 100,
        maxUsers: 100,
        maxSessions: 100,
        maxRequests: 100,
      },
    });

    expect(result.plan.kind).toBe(PlanKindEnum.ENTERPRISE_CUSTOM);
    expect(result.request.status).toBe(EnterprisePlanRequestStatusEnum.APPROVED);
    expect(prisma.subscriptionEvent.create).toHaveBeenCalled();
  });

  it('silently ignores best-effort subscription event write failures', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      status: EnterprisePlanRequestStatusEnum.PENDING,
      adminNotes: null,
    } as any);
    prisma.tenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      subscription: { subscriptionId: 'sub-1' },
    } as any);
    prisma.plan.findFirst.mockResolvedValue(null);
    prisma.plan.create.mockResolvedValue({
      planId: 'plan-1',
      kind: PlanKindEnum.ENTERPRISE_CUSTOM,
      tenantId: 'tenant-1',
      monthlyPrice: decimal(100),
      yearlyPrice: decimal(1000),
      currency: 'USD',
    } as any);
    prisma.enterprisePlanRequest.update.mockResolvedValue({
      requestId: 'req-1',
      status: EnterprisePlanRequestStatusEnum.APPROVED,
    } as any);
    prisma.subscriptionEvent.create.mockRejectedValue(
      new Error('best effort failure'),
    );

    await expect(
      service.approveAndCreatePlan({
        requestId: 'req-1',
        adminUserId: 'admin-1',
        payload: {
          name: 'Enterprise A',
          description: 'Custom',
          monthlyPrice: 100,
          yearlyPrice: 1000,
          currency: 'USD',
          maxProjects: 100,
          maxUsers: 100,
          maxSessions: 100,
          maxRequests: 100,
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        plan: expect.objectContaining({ planId: 'plan-1' }),
      }),
    );
  });

  it('throws when getById() misses', async () => {
    prisma.enterprisePlanRequest.findUnique.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
