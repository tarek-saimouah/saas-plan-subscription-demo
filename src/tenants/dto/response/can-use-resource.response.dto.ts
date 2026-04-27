import { ApiProperty } from '@nestjs/swagger';

export class CanUseResourceResponseDto {
  @ApiProperty({ type: Boolean })
  canUseResource: boolean;
}
