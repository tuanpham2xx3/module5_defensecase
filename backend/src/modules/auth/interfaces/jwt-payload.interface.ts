import { Role } from '../../../common/constants/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
