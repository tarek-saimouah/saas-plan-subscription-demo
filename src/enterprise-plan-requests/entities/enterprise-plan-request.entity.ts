import { ApiProperty } from '@nestjs/swagger';
import { EnterprisePlanRequestStatusEnum } from 'src/common';

export class EnterprisePlanRequestEntity {
  @ApiProperty()
  readonly requestId: string;

  @ApiProperty()
  readonly tenantId: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ enum: EnterprisePlanRequestStatusEnum })
  readonly status: string;

  // quota columns
  @ApiProperty({ type: Number, nullable: true })
  readonly expectedProjects?: number | null;

  @ApiProperty({ type: Number, nullable: true })
  readonly expectedUsers?: number | null;

  @ApiProperty({ type: Number, nullable: true })
  readonly expectedSessions?: number | null;

  @ApiProperty({ type: Number, nullable: true })
  readonly expectedRequests?: number | null;

  @ApiProperty({ type: String, nullable: true })
  readonly adminNotes?: string | null;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<EnterprisePlanRequestEntity>) {
    Object.assign(this, props);
  }
}
