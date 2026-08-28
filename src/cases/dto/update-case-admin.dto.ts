import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdateCaseAdminDto {
  @IsOptional()
  @IsUUID()
  district_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  patient_age?: number;

  @IsOptional()
  @IsString()
  patient_sex?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsBoolean()
  is_disaster_related?: boolean;
}
