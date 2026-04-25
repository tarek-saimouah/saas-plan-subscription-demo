import { ApiProperty } from '@nestjs/swagger';

export class TenantEntity {
  @ApiProperty()
  readonly tenantId: string;

  @ApiProperty()
  readonly ownerId: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<TenantEntity>) {
    Object.assign(this, props);
  }
}
