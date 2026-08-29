import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** slug is omitted – create-only (never editable after creation). */
export class UpdateProtocolDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  is_disaster?: boolean;
}
