import { ApiProperty } from '@nestjs/swagger';

export class RequestPlanSubscriptionResponseDto {
  @ApiProperty()
  transactionUrl: string;
}
