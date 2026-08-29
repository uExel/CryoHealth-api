import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Facility } from '../database/entities/facility.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilities: Repository<Facility>,
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
      entityType: 'Facility',
      entityId,
      reason,
      meta,
    } as Partial<AuditEntry>);
  }

  private formatFacility(f: Facility) {
    return {
      id: f.id,
      name: f.name,
      type: f.type,
      district: f.district,
      vulnerability: f.vulnerability,
      contact: f.contact ?? null,
      lat: f.geom ? f.geom.coordinates[1] : null,
      lng: f.geom ? f.geom.coordinates[0] : null,
      has_geom: !!f.geom,
      lake_id: f.lakeId ?? null,
      created_at: f.createdAt,
    };
  }

  async findAllPublic() {
    const list = await this.facilities
      .createQueryBuilder('f')
      .where('f.geom IS NOT NULL')
      .getMany();
    return list.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      vulnerability: f.vulnerability,
      lat: f.geom ? f.geom.coordinates[1] : null,
      lng: f.geom ? f.geom.coordinates[0] : null,
    }));
  }

  async findAllAdmin(limit = 200) {
    const [rows, total] = await this.facilities.findAndCount({
      order: { name: 'ASC' },
      take: limit,
    });
    return {
      rows: rows.map((f) => this.formatFacility(f)),
      total,
      hasMore: total > rows.length,
    };
  }

  async findOne(id: string) {
    const f = await this.facilities.findOne({ where: { id } });
    if (!f) {
      throw new NotFoundException('Facility not found');
    }
    return this.formatFacility(f);
  }

  async create(dto: CreateFacilityDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Facility);
      const geom =
        dto.lat !== undefined && dto.lng !== undefined
          ? {
              type: 'Point' as const,
              coordinates: [dto.lng, dto.lat] as [number, number],
            }
          : undefined;

      const facility = repo.create({
        name: dto.name,
        type: dto.type,
        district: dto.district,
        vulnerability: dto.vulnerability,
        contact: dto.contact,
        lakeId: dto.lakeId || undefined,
        geom,
      });

      const saved = await repo.save(facility);

      await this.audit(
        manager,
        actorId,
        'facility.create',
        saved.id,
        undefined,
        {
          created: {
            name: saved.name,
            type: saved.type,
            district: saved.district,
          },
        },
      );

      return this.formatFacility(saved);
    });
  }

  async update(id: string, dto: UpdateFacilityDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Facility);
      const facility = await repo.findOne({ where: { id } });
      if (!facility) {
        throw new NotFoundException('Facility not found');
      }

      const before = { ...facility };

      if (dto.name !== undefined) facility.name = dto.name;
      if (dto.type !== undefined) facility.type = dto.type;
      if (dto.district !== undefined) facility.district = dto.district;
      if (dto.vulnerability !== undefined)
        facility.vulnerability = dto.vulnerability;
      if (dto.contact !== undefined) facility.contact = dto.contact;
      if (dto.lakeId !== undefined) facility.lakeId = dto.lakeId || undefined;

      if (dto.lat !== undefined || dto.lng !== undefined) {
        const currentLng = facility.geom ? facility.geom.coordinates[0] : 0;
        const currentLat = facility.geom ? facility.geom.coordinates[1] : 0;
        facility.geom = {
          type: 'Point' as const,
          coordinates: [
            dto.lng !== undefined ? dto.lng : currentLng,
            dto.lat !== undefined ? dto.lat : currentLat,
          ] as [number, number],
        };
      }

      const saved = await repo.save(facility);

      const changed: Record<string, any> = {};
      const fieldsToCheck: (keyof Facility)[] = [
        'name',
        'type',
        'district',
        'vulnerability',
        'contact',
        'lakeId',
      ];
      for (const field of fieldsToCheck) {
        if (before[field] !== saved[field]) {
          changed[field] = { from: before[field], to: saved[field] };
        }
      }

      await this.audit(
        manager,
        actorId,
        'facility.update',
        saved.id,
        undefined,
        {
          changed: Object.keys(changed).length ? changed : null,
        },
      );

      return this.formatFacility(saved);
    });
  }

  async remove(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Facility);
      const facility = await repo.findOne({ where: { id } });
      if (!facility) {
        throw new NotFoundException('Facility not found');
      }

      await repo.remove(facility);

      await this.audit(manager, actorId, 'facility.delete', id, reason, {
        deleted: { name: facility.name },
      });

      return { id };
    });
  }
}
