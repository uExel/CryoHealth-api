import type { Tier } from '../../common/types/tier.type';
import { Lake } from '../../lakes/entities/lake.entity';
export declare class HazardScore {
    id: string;
    lake: Lake;
    lakeId: string;
    runId: string;
    score: string;
    tier: Tier;
    components: Record<string, unknown>;
    computedAt: Date;
    createdAt: Date;
}
