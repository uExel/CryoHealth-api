import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role.type';

export const ROLES_KEY = 'roles';
/** Every non-public route names its roles explicitly — public by omission is not a thing
 *  here; routes without @Roles still require a valid JWT via JwtAuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
