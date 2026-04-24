import { ApiProperty } from '@nestjs/swagger';

export class UpgradePlanResponseDto {
  @ApiProperty()
  transactionUrl: string;
}
