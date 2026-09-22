import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProtocolStepsDto } from './protocol-steps.dto';

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

  @IsOptional()
  @ValidateNested()
  @Type(() => ProtocolStepsDto)
  steps?: ProtocolStepsDto;
}
