import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { District } from '../districts/entities/district.entity';
import { ChwProfile } from './entities/chw-profile.entity';
import { CreateChwProfileDto } from './dto/create-chw-profile.dto';
import { UpdateChwProfileDto } from './dto/update-chw-profile.dto';

@Injectable()
export class ChwProfilesService {
  constructor(
    @InjectRepository(ChwProfile)
    private readonly profiles: Repository<ChwProfile>,
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
      entityType: 'ChwProfile',
      entityId,
      reason,
      meta,
    } as any);
  }

  async findAllPublic() {
    const list = await this.profiles
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.district', 'd')
      .leftJoinAndSelect('p.user', 'u')
      .orderBy('p.full_name', 'ASC')
      .getMany();

    return list.map((p) => ({
      id: p.id,
      user_id: p.userId ?? null,
      full_name: p.fullName,
      district_id: p.districtId ?? null,
      phone: p.phone ?? null,
      language: p.language,
      created_at: p.createdAt,
      district_name: p.district?.name ?? null,
      user_name: p.user?.name ?? null,
      user_lhw_id: p.user?.lhwId ?? null,
      active: p.user?.active ?? null,
    }));
  }

  async listAdmin(limit = 200) {
    const [rows, total] = await Promise.all([
      this.profiles
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.district', 'd')
        .leftJoinAndSelect('p.user', 'u')
        .orderBy('p.full_name', 'ASC')
        .take(limit)
        .getMany(),
      this.profiles.count(),
    ]);

    const formattedRows = rows.map((p) => ({
      id: p.id,
      user_id: p.userId ?? null,
      full_name: p.fullName,
      district_id: p.districtId ?? null,
      phone: p.phone ?? null,
      language: p.language,
      created_at: p.createdAt,
      district_name: p.district?.name ?? null,
      user_name: p.user?.name ?? null,
      user_lhw_id: p.user?.lhwId ?? null,
      active: p.user?.active ?? null,
    }));

    return {
      rows: formattedRows,
      total,
      hasMore: total > formattedRows.length,
    };
  }

  async findOne(id: string) {
    const p = await this.profiles
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.district', 'd')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.id = :id', { id })
      .getOne();

    if (!p) throw new NotFoundException('CHW profile not found');

    return {
      id: p.id,
      user_id: p.userId ?? null,
      full_name: p.fullName,
      district_id: p.districtId ?? null,
      phone: p.phone ?? null,
      language: p.language,
      created_at: p.createdAt,
      district_name: p.district?.name ?? null,
      user_name: p.user?.name ?? null,
      user_lhw_id: p.user?.lhwId ?? null,
      active: p.user?.active ?? null,
    };
  }

  async create(dto: CreateChwProfileDto, actorId: string) {
    if (dto.district_id) {
      const d = await this.districts.findOne({ where: { id: dto.district_id } });
      if (!d) throw new BadRequestException('district_id does not reference an existing district');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ChwProfile);
      const profile = repo.create({
        fullName: dto.full_name,
        districtId: dto.district_id || undefined,
        phone: dto.phone || undefined,
        language: dto.language,
      });

      const saved = await repo.save(profile);

      await this.audit(manager, actorId, 'chw_profile.create', saved.id, undefined, {
        created: { full_name: saved.fullName },
      });

      return {
        id: saved.id,
        user_id: saved.userId ?? null,
        full_name: saved.fullName,
        district_id: saved.districtId ?? null,
        phone: saved.phone ?? null,
        language: saved.language,
        created_at: saved.createdAt,
      };
    });
  }

  async update(id: string, dto: UpdateChwProfileDto, actorId: string) {
    if (dto.district_id) {
      const d = await this.districts.findOne({ where: { id: dto.district_id } });
      if (!d) throw new BadRequestException('district_id does not reference an existing district');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ChwProfile);
      const profile = await repo.findOne({ where: { id } });
      if (!profile) throw new NotFoundException('CHW profile not found');

      const before = { ...profile };

      if (dto.full_name !== undefined) profile.fullName = dto.full_name;
      if (dto.district_id !== undefined) profile.districtId = dto.district_id || undefined;
      if (dto.phone !== undefined) profile.phone = dto.phone || undefined;
      if (dto.language !== undefined) profile.language = dto.language;

      const saved = await repo.save(profile);

      const changed: Record<string, any> = {};
      if (before.fullName !== saved.fullName) changed.full_name = { from: before.fullName, to: saved.fullName };
      if (before.districtId !== saved.districtId) changed.district_id = { from: before.districtId, to: saved.districtId };
      if (before.phone !== saved.phone) changed.phone = { from: before.phone, to: saved.phone };
      if (before.language !== saved.language) changed.language = { from: before.language, to: saved.language };

      await this.audit(manager, actorId, 'chw_profile.update', saved.id, undefined, {
        meta: Object.keys(changed).length ? { changed } : null,
      });

      return {
        id: saved.id,
        user_id: saved.userId ?? null,
        full_name: saved.fullName,
        district_id: saved.districtId ?? null,
        phone: saved.phone ?? null,
        language: saved.language,
        created_at: saved.createdAt,
      };
    });
  }

  async remove(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ChwProfile);
      const profile = await repo.findOne({ where: { id } });
      if (!profile) throw new NotFoundException('CHW profile not found');

      await repo.remove(profile);

      await this.audit(manager, actorId, 'chw_profile.delete', id, reason);

      return { id };
    });
  }
}
