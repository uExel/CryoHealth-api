import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChwCase } from './entities/chw-case.entity';
import { CreateCaseDto } from './dto/create-case.dto';

const MAX_PAGE = 100;

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(ChwCase) private readonly cases: Repository<ChwCase>,
  ) {}

  /** Upsert on clientCaseId: an offline device retrying the same submission must get
   *  the same stored case back, never a duplicate or a conflict error. */
  async create(chwId: string, dto: CreateCaseDto): Promise<ChwCase> {
    const existing = await this.cases.findOne({
      where: { clientCaseId: dto.clientCaseId },
    });
    if (existing) return existing;

    return this.cases.save(
      this.cases.create({
        chwId,
        capturedAt: new Date(dto.capturedAt),
        payload: dto.payload,
        outcome: dto.outcome,
        deviceId: dto.deviceId,
        clientCaseId: dto.clientCaseId,
        syncState: 'synced',
      }),
    );
  }

  /** Every list endpoint is paginated \u2014 no unbounded queries (api-design rubric #4). */
  async listForUser(chwId: string, page = 1, pageSize = 50) {
    const take = Math.min(pageSize, MAX_PAGE);
    const [items, total] = await this.cases.findAndCount({
      where: { chwId },
      order: { capturedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }
}
