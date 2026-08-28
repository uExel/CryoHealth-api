import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateChwProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsUUID()
  district_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
