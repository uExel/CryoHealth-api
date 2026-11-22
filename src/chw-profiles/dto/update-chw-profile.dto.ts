import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateChwProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsUUID()
  district_id?: string;

  // @IsOptional lets null through: null (or blank) clears the phone, omitted keeps it.
  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  language?: string;
}
