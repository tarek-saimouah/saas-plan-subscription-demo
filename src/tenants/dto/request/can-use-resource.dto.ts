import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionResources } from 'src/subscriptions';

export class CanUseResourceDto {
  @ApiProperty({ enum: SubscriptionResources })
  @IsEnum(SubscriptionResources)
  resource: string;
}
