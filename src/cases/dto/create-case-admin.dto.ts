import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** A case logged by an admin on a CHW's behalf (the admin portal's "Log a case" form).
 *  The on-device sync path for CHWs is `CreateCaseDto`. */
export class CreateCaseAdminDto {
  @IsUUID()
  chw_id: string;

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

  @IsString()
  @IsNotEmpty({ message: 'Symptoms are required' })
  symptoms: string;

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
