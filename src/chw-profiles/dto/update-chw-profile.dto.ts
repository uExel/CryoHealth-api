import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateChwProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  // null clears the district, omitted keeps it (@IsOptional lets null through).
  @IsOptional()
  @IsUUID()
  district_id?: string | null;

  // @IsOptional lets null through: null (or blank) clears the phone, omitted keeps it.
  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  language?: string;
}
