import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import type { Tier } from '../../common/types/tier.type';

const TIERS: Tier[] = ['normal', 'watch', 'high', 'critical'];

export class IssueAlertDto {
  @IsOptional() @IsUUID() lakeId?: string;
  @IsIn(TIERS) tier: Tier;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() body: string;
  @IsOptional() @IsString() windowStart?: string;
  @IsOptional() @IsString() windowEnd?: string;
  @IsOptional() @IsString() downstreamSummary?: string;
  /** Never optional for a human-issued alert (api-design/audit rule) — a human overriding
   *  the model must say why. */
  @IsString() @IsNotEmpty() reason: string;
}
