import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantMapper } from './mappers';
import { PrismaService } from 'src/database';
import {
  SubscriptionUsageResponseDto,
  TenantResponseDto,
  UpdateTenantDto,
} from './dto';
import { MessageResponseDto, SuccessResponseDto } from 'src/common';
import {
  SubscriptionUsageLimitsService,
  UsageQuotakey,
} from 'src/subscriptions';

@Injectable()
export class TenantProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantMapper: TenantMapper,
    private readonly usageLimitsService: SubscriptionUsageLimitsService,
  ) {}

  async update(
    userId: string,
    tenantId: string,
    payload: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    // check if exists
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        ownerId: userId,
        tenantId,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // check if name exists
    const exists = await this.prisma.tenant.findFirst({
      where: { name: payload.name, tenantId: { not: tenantId } },
      select: { tenantId: true },
    });

    if (exists) {
      throw new ConflictException('Tenant name already exists');
    }

    // update tenant
    const updated = await this.prisma.tenant.update({
      where: { tenantId },
      data: {
        name: payload.name,
      },
    });

    return this.tenantMapper.entityToResponseDto(
      this.tenantMapper.modelToEntity(updated),
    );
  }

  async getEnterpriseMessage(
    userId: string,
    tenantId: string,
  ): Promise<MessageResponseDto> {
    // check if exists
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        ownerId: userId,
        tenantId,
      },
      select: { tenantId: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return new SuccessResponseDto('Enterprise plan is active');
  }

  // increment usage
  async tenantSubscriptionUse(params: {
    tenantId: string;
    usageQuotaKey: UsageQuotakey;
  }): Promise<SubscriptionUsageResponseDto> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: params.tenantId },
      select: { plan: true, tenant: { select: { usage: true } } },
    });

    if (!subscription || !subscription.tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const usage = subscription.tenant.usage;
    if (!usage) {
      throw new ForbiddenException('Usage record is missing');
    }

    // Check limit on service-level
    // Don't rely on guard middleware only
    // That protects from:
    //  - parallel requests
    //  - background jobs
    //  - internal service calls

    this.usageLimitsService.isLimitExceeded({
      plan: subscription.plan,
      usage,
      usageKey: params.usageQuotaKey,
    });

    // increment projects
    const updatedUsage = await this.prisma.tenantUsage.update({
      where: { tenantId: params.tenantId },
      data: {
        [params.usageQuotaKey]: { increment: 1 },
      },
    });

    return updatedUsage;
  }
}
