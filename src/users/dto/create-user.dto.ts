import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Role } from '../../common/types/role.type';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEnum(['cryohealth_admin', 'facility_admin', 'chw', 'viewer'], {
    message:
      'Role must be one of: cryohealth_admin, facility_admin, chw, viewer',
  })
  role: Role;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lhwId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsString()
  @MinLength(4, { message: 'PIN must be at least 4 characters' })
  @MaxLength(72, { message: 'PIN is too long' })
  pin: string;
}
