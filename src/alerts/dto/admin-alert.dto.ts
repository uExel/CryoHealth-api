import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { Tier } from '../../common/types/tier.type';

const TIERS: Tier[] = ['normal', 'watch', 'high', 'critical'];

/** Web dashboard's alert edit form (PUT /admin/alerts/:id) — body/tier/window only.
 *  Status and clearedAt belong to the clear action, not an edit. */
export class UpdateAlertDto {
  @IsOptional() @IsString() @IsNotEmpty() body?: string;
  @IsOptional() @IsIn(TIERS) tier?: Tier;
  @IsOptional() @IsString() estimatedWindow?: string | null;
}

/** Clear (PATCH /admin/alerts/:id) — a human-auditable reason is mandatory. */
export class ClearAlertDto {
  @IsString() @IsNotEmpty() reason: string;
}
