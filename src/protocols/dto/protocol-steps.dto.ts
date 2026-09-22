import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
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
  // class-validator skips undefined properties by default -- @IsDefined() is what
  // actually makes `chw`/`pub` mandatory once `steps` is provided at all.
  @IsDefined({ message: 'steps.chw is required' })
  @IsArray()
  @ArrayMinSize(1, { message: 'steps.chw must have at least one step' })
  @ValidateNested({ each: true })
  @Type(() => ProtocolStepDto)
  chw: ProtocolStepDto[];

  @IsDefined({ message: 'steps.pub is required' })
  @IsArray()
  @ArrayMinSize(1, { message: 'steps.pub must have at least one step' })
  @ValidateNested({ each: true })
  @Type(() => ProtocolStepDto)
  pub: ProtocolStepDto[];
}
