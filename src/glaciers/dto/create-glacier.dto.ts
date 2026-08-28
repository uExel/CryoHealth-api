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

export class CreateGlacierDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsOptional()
  @IsString()
  rgiId?: string;

  @IsOptional()
  @IsString()
  glimsId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

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

  @IsString()
  @IsEnum(['stable', 'retreating', 'advancing', 'surging', 'unknown'])
  status: string;

  @IsOptional()
  @IsString()
  terminusType?: string;

  @IsString()
  @IsNotEmpty({ message: 'Source is required' })
  source: string;

  @IsOptional()
  @IsString()
  lastObserved?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
