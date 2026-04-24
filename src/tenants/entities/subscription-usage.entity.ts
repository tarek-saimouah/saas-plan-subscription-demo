import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionUsageEntity {
  @ApiProperty()
  readonly usageId: string;

  @ApiProperty()
  readonly tenantId: string;

  @ApiProperty({ type: Number })
  readonly projectsCount: number;

  @ApiProperty({ type: Number })
  readonly usersCount: number;

  @ApiProperty({ type: Number })
  readonly sessionsCount: number;

  @ApiProperty({ type: Number })
  readonly requestsCount: number;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<SubscriptionUsageEntity>) {
    Object.assign(this, props);
  }
}
