import { UserRoleEnum } from '../enums';

export class JwtDecodedEntity {
  userId: string;
  tenantId?: string;
  email?: string | null;
  role: `${UserRoleEnum}` | null;
}
