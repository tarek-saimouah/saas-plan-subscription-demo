import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlanMapper } from './mappers';
import { createPrismaMock } from '../../test/mock-helpers';
import { decimal } from '../../test/test-utils';
import { PlanKindEnum } from 'src/common';

describe('PlansService', () => {
  const planMapper = new PlanMapper();
  const prisma = createPrismaMock();
  const service = new PlansService(prisma, planMapper);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 409 when creating a plan with a duplicate name', async () => {
    prisma.plan.findUnique.mockResolvedValue({ planId: 'plan-1' } as any);

    await expect(
      service.create({
        name: 'Pro',
        description: 'Pro plan',
        sortOrder: 1,
        monthlyPrice: 20,
        yearlyPrice: 200,
        currency: 'USD',
        maxProjects: 10,
        maxUsers: 10,
        maxSessions: 10,
        maxRequests: 10,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a plan when the name is unique', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);
    prisma.plan.create.mockResolvedValue({
      planId: 'plan-1',
      name: 'Pro',
      description: 'Pro plan',
      isActive: true,
      sortOrder: 1,
      kind: PlanKindEnum.STANDARD,
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
      currency: 'USD',
      tenantId: null,
      maxProjects: 10,
      maxUsers: 10,
      maxSessions: 10,
      maxRequests: 10,
      trialDays: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.create({
      name: 'Pro',
      description: 'Pro plan',
      sortOrder: 1,
      monthlyPrice: 20,
      yearlyPrice: 200,
      currency: 'USD',
      maxProjects: 10,
      maxUsers: 10,
      maxSessions: 10,
      maxRequests: 10,
    });

    expect(result.name).toBe('Pro');
    expect(result.monthlyPrice).toBe(20);
  });

  it('blocks free plan price changes', async () => {
    prisma.plan.findUnique.mockResolvedValue({
      planId: 'free-plan',
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
    } as any);

    await expect(
      service.update('free-plan', { monthlyPrice: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows non-price updates on a free plan', async () => {
    prisma.plan.findUnique.mockResolvedValueOnce({
      planId: 'free-plan',
      name: 'Free',
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
    } as any);
    prisma.plan.findFirst.mockResolvedValue(null);
    prisma.plan.update.mockResolvedValue({
      planId: 'free-plan',
      name: 'Free Plus',
      description: 'Updated',
      isActive: true,
      sortOrder: 1,
      kind: PlanKindEnum.STANDARD,
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
      currency: 'USD',
      tenantId: null,
      maxProjects: 2,
      maxUsers: 2,
      maxSessions: 2,
      maxRequests: 2,
      trialDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.update('free-plan', {
      name: 'Free Plus',
      description: 'Updated',
    });

    expect(result.name).toBe('Free Plus');
    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { planId: 'free-plan' },
      data: { name: 'Free Plus', description: 'Updated' },
    });
  });

  it('throws when deleting a free plan', async () => {
    prisma.plan.findUnique.mockResolvedValue({
      _count: { subscriptions: 0 },
      tenantId: null,
      monthlyPrice: decimal(0),
      yearlyPrice: decimal(0),
    } as any);

    await expect(service.remove('free-plan')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when deleting a plan with subscriptions', async () => {
    prisma.plan.findUnique.mockResolvedValue({
      _count: { subscriptions: 2 },
      tenantId: null,
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
    } as any);

    await expect(service.remove('plan-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when deleting an enterprise-bound plan', async () => {
    prisma.plan.findUnique.mockResolvedValue({
      _count: { subscriptions: 0 },
      tenantId: 'tenant-1',
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
    } as any);

    await expect(service.remove('plan-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes a standard plan with no subscriptions', async () => {
    prisma.plan.findUnique.mockResolvedValue({
      _count: { subscriptions: 0 },
      tenantId: null,
      monthlyPrice: decimal(20),
      yearlyPrice: decimal(200),
    } as any);
    prisma.plan.delete.mockResolvedValue({ planId: 'plan-1' } as any);

    const result = await service.remove('plan-1');

    expect(prisma.plan.delete).toHaveBeenCalledWith({
      where: { planId: 'plan-1' },
    });
    expect(result.message).toBe('Deleted successfully');
  });

  it('findAllForLanding applies the public plan filter and sort order', async () => {
    prisma.plan.findMany.mockResolvedValue([]);

    await service.findAllForLanding();

    expect(prisma.plan.findMany).toHaveBeenCalledWith({
      where: {
        kind: PlanKindEnum.STANDARD,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  });

  it('throws when updating an unknown plan', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);

    await expect(service.update('missing', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
