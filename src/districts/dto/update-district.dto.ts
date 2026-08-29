import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsInt()
  @IsPositive({ message: 'Population must be positive' })
  population?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  centroidLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  centroidLng?: number;
}
