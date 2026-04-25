import { ApiProperty } from '@nestjs/swagger';
import { EnterprisePlanRequestEventTypeEnum } from 'src/common';

export class EnterprisePlanRequestEventEntity {
  @ApiProperty()
  readonly eventId: string;

  @ApiProperty()
  readonly requestId: string;

  @ApiProperty({ type: String, nullable: true })
  readonly fromPlanId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly toPlanId?: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly actorUserId?: string | null;

  @ApiProperty({ enum: EnterprisePlanRequestEventTypeEnum })
  readonly type: string; // created, reviewed

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  readonly meta?: any;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  constructor(props: Partial<EnterprisePlanRequestEventEntity>) {
    Object.assign(this, props);
  }
}
