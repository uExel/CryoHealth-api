import { Role } from './role.type';

export type JwtPayload = { sub: string; role: Role; name: string };
