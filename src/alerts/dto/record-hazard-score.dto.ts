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

/** The contract the geo service reports against. Auth: @Roles('cryohealth_admin') +
 *  @AllowServiceKey() — a human admin JWT or the GEO_SERVICE_API_KEY header both work;
 *  see JwtAuthGuard and allow-service-key.decorator.ts. */
export class RecordHazardScoreDto {
  @IsUUID() lakeId: string;
  @IsString() @IsNotEmpty() runId: string;
  @IsNumber() score: number;
  @IsIn(TIERS) tier: Tier;
  @IsObject() components: Record<string, unknown>;
  @IsOptional() @IsString() computedAt?: string;
}
