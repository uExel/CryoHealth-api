import { LakesService } from './lakes.service';
export declare class LakesController {
    private readonly lakes;
    constructor(lakes: LakesService);
    list(page?: number, pageSize?: number): Promise<{
        items: import("./entities/lake.entity").Lake[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    byId(id: string): Promise<import("./entities/lake.entity").Lake>;
    observations(id: string, page?: number, pageSize?: number): Promise<{
        items: import("./entities/observation.entity").Observation[];
        total: number;
        page: number;
        pageSize: number;
    }>;
}
