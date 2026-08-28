import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Glacier } from './entities/glacier.entity';
import { GlacierObservation } from './entities/glacier-observation.entity';
import { District } from '../districts/entities/district.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CreateGlacierDto } from './dto/create-glacier.dto';
import { UpdateGlacierDto } from './dto/update-glacier.dto';

@Injectable()
export class GlaciersService {
  constructor(
    @InjectRepository(Glacier)
    private readonly glaciers: Repository<Glacier>,
    @InjectRepository(GlacierObservation)
    private readonly observations: Repository<GlacierObservation>,
    @InjectRepository(District)
    private readonly districts: Repository<District>,
    private readonly dataSource: DataSource,
  ) {}

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
      entityType: 'Glacier',
      entityId,
      reason,
      meta,
    } as any);
  }

  async findAll() {
    const list = await this.glaciers
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.district', 'd')
      .orderBy('g.area_km2', 'DESC', 'NULLS LAST')
      .getMany();

    return list.map((g) => ({
      id: g.id,
      name: g.name,
      rgi_id: g.rgiId ?? null,
      glims_id: g.glimsId ?? null,
      district_id: g.districtId ?? null,
      lat: g.lat,
      lng: g.lng,
      area_km2: g.areaKm2 ? Number(g.areaKm2) : null,
      length_km: g.lengthKm ? Number(g.lengthKm) : null,
      elevation_min_m: g.elevationMinM ?? null,
      elevation_max_m: g.elevationMaxM ?? null,
      status: g.status,
      terminus_type: g.terminusType ?? null,
      source: g.source ?? null,
      last_observed: g.lastObserved ?? null,
      notes: g.notes ?? null,
      district_name: g.district?.name ?? null,
    }));
  }

  async findOne(id: string) {
    const g = await this.glaciers
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.district', 'd')
      .where('g.id = :id', { id })
      .getOne();

    if (!g) {
      throw new NotFoundException('Glacier not found');
    }

    return {
      id: g.id,
      name: g.name,
      rgi_id: g.rgiId ?? null,
      glims_id: g.glimsId ?? null,
      district_id: g.districtId ?? null,
      lat: g.lat,
      lng: g.lng,
      area_km2: g.areaKm2 ? Number(g.areaKm2) : null,
      length_km: g.lengthKm ? Number(g.lengthKm) : null,
      elevation_min_m: g.elevationMinM ?? null,
      elevation_max_m: g.elevationMaxM ?? null,
      status: g.status,
      terminus_type: g.terminusType ?? null,
      source: g.source ?? null,
      last_observed: g.lastObserved ?? null,
      notes: g.notes ?? null,
      district_name: g.district?.name ?? null,
      district_province: g.district?.province ?? null,
    };
  }

  async findObservations(glacierId: string) {
    const obs = await this.observations.find({
      where: { glacierId },
      order: { observedAt: 'ASC' },
    });
    return obs.map((o) => ({
      observed_at: o.observedAt,
      area_km2: o.areaKm2 ? Number(o.areaKm2) : null,
      length_km: o.lengthKm ? Number(o.lengthKm) : null,
      terminus_change_m: o.terminusChangeM ? Number(o.terminusChangeM) : null,
      status: o.status ?? null,
      source: o.source ?? null,
      notes: o.notes ?? null,
    }));
  }

  async create(dto: CreateGlacierDto, actorId: string) {
    if (dto.districtId) {
      const districtExists = await this.districts.findOne({
        where: { id: dto.districtId },
      });
      if (!districtExists) {
        throw new BadRequestException('district_id does not reference an existing district');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Glacier);
      const glacier = repo.create({
        name: dto.name,
        rgiId: dto.rgiId || undefined,
        glimsId: dto.glimsId || undefined,
        districtId: dto.districtId || undefined,
        lat: dto.lat,
        lng: dto.lng,
        areaKm2: dto.areaKm2 || undefined,
        lengthKm: dto.lengthKm || undefined,
        elevationMinM: dto.elevationMinM || undefined,
        elevationMaxM: dto.elevationMaxM || undefined,
        status: dto.status,
        terminusType: dto.terminusType || undefined,
        source: dto.source,
        lastObserved: dto.lastObserved ? new Date(dto.lastObserved) : undefined,
        notes: dto.notes || undefined,
      });

      const saved = await repo.save(glacier);

      await this.audit(manager, actorId, 'glacier.create', saved.id, undefined, {
        created: { name: saved.name, status: saved.status, source: saved.source },
      });

      return { id: saved.id };
    });
  }

  async update(id: string, dto: UpdateGlacierDto, actorId: string) {
    if (dto.districtId) {
      const districtExists = await this.districts.findOne({
        where: { id: dto.districtId },
      });
      if (!districtExists) {
        throw new BadRequestException('district_id does not reference an existing district');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Glacier);
      const glacier = await repo.findOne({ where: { id } });
      if (!glacier) {
        throw new NotFoundException('Glacier not found');
      }

      const before = { ...glacier };

      if (dto.name !== undefined) glacier.name = dto.name;
      if (dto.rgiId !== undefined) glacier.rgiId = dto.rgiId || undefined;
      if (dto.glimsId !== undefined) glacier.glimsId = dto.glimsId || undefined;
      if (dto.districtId !== undefined) glacier.districtId = dto.districtId || undefined;
      if (dto.lat !== undefined) glacier.lat = dto.lat;
      if (dto.lng !== undefined) glacier.lng = dto.lng;
      if (dto.areaKm2 !== undefined) glacier.areaKm2 = dto.areaKm2 || undefined;
      if (dto.lengthKm !== undefined) glacier.lengthKm = dto.lengthKm || undefined;
      if (dto.elevationMinM !== undefined) glacier.elevationMinM = dto.elevationMinM || undefined;
      if (dto.elevationMaxM !== undefined) glacier.elevationMaxM = dto.elevationMaxM || undefined;
      if (dto.status !== undefined) glacier.status = dto.status;
      if (dto.terminusType !== undefined) glacier.terminusType = dto.terminusType || undefined;
      if (dto.source !== undefined) glacier.source = dto.source;
      if (dto.lastObserved !== undefined) glacier.lastObserved = dto.lastObserved ? new Date(dto.lastObserved) : undefined;
      if (dto.notes !== undefined) glacier.notes = dto.notes || undefined;

      const saved = await repo.save(glacier);

      const changed: Record<string, any> = {};
      const fieldsToCheck: (keyof Glacier)[] = [
        'name',
        'rgiId',
        'glimsId',
        'districtId',
        'lat',
        'lng',
        'areaKm2',
        'lengthKm',
        'elevationMinM',
        'elevationMaxM',
        'status',
        'terminusType',
        'source',
        'lastObserved',
        'notes',
      ];
      for (const field of fieldsToCheck) {
        if (before[field] !== saved[field]) {
          changed[field] = { from: before[field], to: saved[field] };
        }
      }

      await this.audit(manager, actorId, 'glacier.update', saved.id, undefined, {
        changed: Object.keys(changed).length ? changed : null,
      });

      return {
        id: saved.id,
        name: saved.name,
        rgi_id: saved.rgiId ?? null,
        glims_id: saved.glimsId ?? null,
        district_id: saved.districtId ?? null,
        lat: saved.lat,
        lng: saved.lng,
        area_km2: saved.areaKm2 ? Number(saved.areaKm2) : null,
        length_km: saved.lengthKm ? Number(saved.lengthKm) : null,
        elevation_min_m: saved.elevationMinM ?? null,
        elevation_max_m: saved.elevationMaxM ?? null,
        status: saved.status,
        terminus_type: saved.terminusType ?? null,
        source: saved.source ?? null,
        last_observed: saved.lastObserved ?? null,
        notes: saved.notes ?? null,
      };
    });
  }

  async remove(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Glacier);
      const glacier = await repo.findOne({ where: { id } });
      if (!glacier) {
        throw new NotFoundException('Glacier not found');
      }

      // Check dependent glacier observations
      const obsRepo = manager.getRepository(GlacierObservation);
      const count = await obsRepo.count({ where: { glacierId: id } });
      if (count > 0) {
        throw new ConflictException({
          message: 'Cannot delete glacier because it has dependent observations',
          dependents: { glacier_observations: count },
        });
      }

      await repo.remove(glacier);

      await this.audit(manager, actorId, 'glacier.delete', id, reason, {
        deleted: { name: glacier.name },
      });

      return { id };
    });
  }
}
