import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from 'src/common';
import { TenantEntity } from 'src/tenants/entities';

export class UserEntity {
  @ApiProperty()
  readonly userId: string;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly fullName: string;

  readonly password: string;

  @ApiProperty({ enum: UserRoleEnum })
  readonly role: string;

  @ApiProperty({ type: Boolean })
  readonly isVerified: boolean;

  @ApiProperty({ type: Boolean })
  readonly isActive: boolean;

  @ApiProperty({ nullable: true })
  readonly verificationCode?: string | null;

  @ApiProperty({ type: TenantEntity, nullable: true })
  readonly tenant?: TenantEntity | null;

  @ApiProperty({ type: Date })
  readonly createdAt: Date;

  @ApiProperty({ type: Date })
  readonly updatedAt: Date;

  constructor(props: Partial<UserEntity>) {
    Object.assign(this, props);
  }
}
