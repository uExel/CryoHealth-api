import { Lake } from './lake.entity';
export declare class Observation {
    id: string;
    lake: Lake;
    lakeId: string;
    capturedAt: Date;
    source: string;
    areaKm2: string;
    cloudFraction?: string;
    sceneId?: string;
    runId: string;
    createdAt: Date;
}
