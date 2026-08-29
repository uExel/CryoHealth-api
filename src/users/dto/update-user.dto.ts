import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import type { Role } from '../../common/types/role.type';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(['cryohealth_admin', 'facility_admin', 'chw', 'viewer'], {
    message:
      'Role must be one of: cryohealth_admin, facility_admin, chw, viewer',
  })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
