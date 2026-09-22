import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { Tier } from '../../common/types/tier.type';

const TIERS: Tier[] = ['normal', 'watch', 'high', 'critical'];

export class ProtocolStepDto {
  @IsString()
  @IsNotEmpty({ message: 'Step label is required' })
  label: string;

  @IsString()
  @IsNotEmpty({ message: 'Step head is required' })
  head: string;

  @IsString()
  @IsNotEmpty({ message: 'Step why is required' })
  why: string;

  @IsIn(TIERS, { message: `tier must be one of: ${TIERS.join(', ')}` })
  tier: Tier;

  @IsOptional()
  @IsBoolean()
  numbered?: boolean;
}

export class ProtocolStepsDto {
  @ValidateNested({ each: true })
  @Type(() => ProtocolStepDto)
  chw: ProtocolStepDto[];

  @ValidateNested({ each: true })
  @Type(() => ProtocolStepDto)
  pub: ProtocolStepDto[];
}
