import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateGlacierDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  rgiId?: string;

  @IsOptional()
  @IsString()
  glimsId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsNumber()
  areaKm2?: number;

  @IsOptional()
  @IsNumber()
  lengthKm?: number;

  @IsOptional()
  @IsInt()
  elevationMinM?: number;

  @IsOptional()
  @IsInt()
  elevationMaxM?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['stable', 'retreating', 'advancing', 'surging', 'unknown'])
  status?: string;

  @IsOptional()
  @IsString()
  terminusType?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  source?: string;

  @IsOptional()
  @IsString()
  lastObserved?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
