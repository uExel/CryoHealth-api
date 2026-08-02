import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { Tier } from '../../common/types/tier.type';

const TIERS: Tier[] = ['normal', 'watch', 'high', 'critical'];

/** Exactly one of tier / clear should be set — validated in the service, not here,
 *  since class-validator doesn't express "exactly one of" cleanly without a custom
 *  validator that would be more code than the check it replaces. */
export class OverrideAlertDto {
  @IsOptional() @IsIn(TIERS) tier?: Tier;
  @IsOptional() clear?: boolean;
  @IsString() @IsNotEmpty() reason: string;
}
