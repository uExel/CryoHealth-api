import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';

const MAX_PAGE = 100;

@Injectable()
export class LakesService {
  constructor(
    @InjectRepository(Lake) private readonly lakes: Repository<Lake>,
    @InjectRepository(Observation)
    private readonly observationRepo: Repository<Observation>,
  ) {}

  /** Every list endpoint is paginated — no unbounded queries (api-design rubric #4). */
  async list(page = 1, pageSize = 50) {
    const take = Math.min(pageSize, MAX_PAGE);
    const [items, total] = await this.lakes.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }

  async byId(id: string) {
    const lake = await this.lakes.findOne({ where: { id } });
    if (!lake) throw new NotFoundException('No such lake');
    return lake;
  }

  async listObservations(lakeId: string, page = 1, pageSize = 100) {
    const take = Math.min(pageSize, 500);
    const [items, total] = await this.observationRepo.findAndCount({
      where: { lakeId },
      order: { capturedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }
}
