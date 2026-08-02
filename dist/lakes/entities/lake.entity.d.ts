import type { Tier } from '../../common/types/tier.type';
import { Observation } from './observation.entity';
export declare class Lake {
    id: string;
    name: string;
    nameUr?: string;
    valley: string;
    district: string;
    damType: string;
    glacierContact: boolean;
    icimodId?: string;
    geom: object;
    boundary?: object;
    elevationM?: number;
    historicalGlof: boolean;
    currentTier: Tier;
    stale: boolean;
    observations: Observation[];
    createdAt: Date;
    updatedAt: Date;
}
