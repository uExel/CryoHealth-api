import { Repository } from 'typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';
export declare class LakesService {
    private readonly lakes;
    private readonly observations;
    constructor(lakes: Repository<Lake>, observations: Repository<Observation>);
    list(page?: number, pageSize?: number): Promise<{
        items: Lake[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    byId(id: string): Promise<Lake>;
    observations_(lakeId: string, page?: number, pageSize?: number): Promise<{
        items: Observation[];
        total: number;
        page: number;
        pageSize: number;
    }>;
}
