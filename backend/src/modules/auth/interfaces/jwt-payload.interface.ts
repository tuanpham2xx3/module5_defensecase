import { Role } from '../../../common/constants/role.enum.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
