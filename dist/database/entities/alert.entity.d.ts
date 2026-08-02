import type { Tier } from '../../common/types/tier.type';
import { Lake } from '../../lakes/entities/lake.entity';
import { User } from '../../users/entities/user.entity';
export declare class Alert {
    id: string;
    lake?: Lake;
    lakeId?: string;
    tier: Tier;
    title: string;
    body: string;
    windowStart?: Date;
    windowEnd?: Date;
    downstreamSummary?: string;
    status: string;
    issuedBy?: User;
    issuedById?: string;
    dedupeKey: string;
    createdAt: Date;
    clearedAt?: Date;
}
