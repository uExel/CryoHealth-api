import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import type { Tier } from '../../common/types/tier.type';

const TIERS: Tier[] = ['normal', 'watch', 'high', 'critical'];

/** The contract the geo service reports against. Auth: gated behind the existing JWT
 *  role system for now (cryohealth_admin) — real service-to-service auth (an API key
 *  or mTLS) is a documented gap, not this task's scope. */
export class RecordHazardScoreDto {
  @IsUUID() lakeId: string;
  @IsString() @IsNotEmpty() runId: string;
  @IsNumber() score: number;
  @IsIn(TIERS) tier: Tier;
  @IsObject() components: Record<string, unknown>;
  @IsOptional() @IsString() computedAt?: string;
}
