import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { District } from './entities/district.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class DistrictsService {
  constructor(
    @InjectRepository(District)
    private readonly districts: Repository<District>,
    private readonly dataSource: DataSource,
  ) {}

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === POSTGRES_UNIQUE_VIOLATION
    );
  }

  private async audit(
    manager: EntityManager,
    actorId: string,
    action: string,
    entityId: string,
    reason?: string,
    meta?: Record<string, unknown>,
  ) {
    await manager.getRepository(AuditEntry).insert({
      actorId,
      action,
      entityType: 'District',
      entityId,
      reason,
      meta,
    } as any);
  }

  async findAll() {
    return this.districts.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const district = await this.districts.findOne({ where: { id } });
    if (!district) {
      throw new NotFoundException('District not found');
    }
    return district;
  }

  async create(dto: CreateDistrictDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(District);
      const district = repo.create({
        name: dto.name,
        province: dto.province,
        population: dto.population,
        centroidLat: dto.centroidLat,
        centroidLng: dto.centroidLng,
      });

      let saved: District;
      try {
        saved = await repo.save(district);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException('A district with this name already exists.');
        }
        throw err;
      }

      await this.audit(manager, actorId, 'district.create', saved.id, undefined, {
        created: { name: saved.name, province: saved.province },
      });

      return saved;
    });
  }

  async update(id: string, dto: UpdateDistrictDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(District);
      const district = await repo.findOne({ where: { id } });
      if (!district) {
        throw new NotFoundException('District not found');
      }

      const beforeName = district.name;
      const beforeProvince = district.province;

      if (dto.name !== undefined) district.name = dto.name;
      if (dto.province !== undefined) district.province = dto.province;
      if (dto.population !== undefined) district.population = dto.population;
      if (dto.centroidLat !== undefined) district.centroidLat = dto.centroidLat;
      if (dto.centroidLng !== undefined) district.centroidLng = dto.centroidLng;

      let saved: District;
      try {
        saved = await repo.save(district);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException('A district with this name already exists.');
        }
        throw err;
      }

      const changed: Record<string, any> = {};
      if (beforeName !== saved.name) changed.name = { from: beforeName, to: saved.name };
      if (beforeProvince !== saved.province) changed.province = { from: beforeProvince, to: saved.province };

      await this.audit(manager, actorId, 'district.update', saved.id, undefined, {
        changed,
      });

      return saved;
    });
  }

  async remove(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(District);
      const district = await repo.findOne({ where: { id } });
      if (!district) {
        throw new NotFoundException('District not found');
      }

      await repo.remove(district);

      await this.audit(manager, actorId, 'district.delete', id, reason, {
        deleted: { name: district.name },
      });

      return { success: true };
    });
  }
}
