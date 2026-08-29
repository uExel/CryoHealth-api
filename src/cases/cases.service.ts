import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { ChwCase } from './entities/chw-case.entity';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseAdminDto } from './dto/update-case-admin.dto';

const MAX_PAGE = 100;

export interface CaseAdminRow {
  id: string;
  chw_id: string;
  district_id: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  outcome: string | null;
  is_disaster_related: boolean | null;
  created_at: Date;
  chw_name: string | null;
  chw_lhw_id: string | null;
  district_name: string | null;
}

export interface CountRow {
  count: number;
}

export interface CaseDetailRow {
  id: string;
  chw_id: string;
  district_id: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  outcome: string | null;
  is_disaster_related: boolean | null;
  created_at: Date;
  deleted_at: Date | null;
}

export interface CaseUpdateAfterRow {
  id: string;
  chw_id: string;
  district_id: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  outcome: string | null;
  is_disaster_related: boolean | null;
  created_at: Date;
  deleted_at: Date | null;
}

export interface CaseDeleteRow {
  id: string;
}

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(ChwCase) private readonly cases: Repository<ChwCase>,
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
      entityType: 'Case',
      entityId,
      reason,
      meta,
    } as Partial<AuditEntry>);
  }

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

  async listAdmin(limit = 200) {
    const rows = await this.dataSource.query(
      `
      SELECT c.id, c.chw_id, c.district_id, c.patient_age, c.patient_sex,
             c.symptoms, c.diagnosis, c.treatment, c.outcome,
             c.is_disaster_related, c.created_at,
             u.name AS chw_name, u."lhwId" AS chw_lhw_id,
             d.name AS district_name
      FROM cases c
      LEFT JOIN users u     ON u.id = c.chw_id
      LEFT JOIN districts d ON d.id = c.district_id
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT $1
      `,
      [limit],
    );

    const countRes = await this.dataSource.query(
      `SELECT count(*)::int AS count FROM cases WHERE deleted_at IS NULL`,
    );

    const total = countRes[0]?.count ?? 0;

    return {
      rows,
      total,
      hasMore: total > rows.length,
    };
  }

  async updateAdmin(id: string, dto: UpdateCaseAdminDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const beforeRows = await manager.query(
        `SELECT id, chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis, treatment, outcome, is_disaster_related, created_at, deleted_at FROM cases WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      const before = beforeRows[0];
      if (!before)
        throw new NotFoundException('Case not found or soft-deleted');

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const writableKeys: (keyof UpdateCaseAdminDto)[] = [
        'district_id',
        'patient_age',
        'patient_sex',
        'symptoms',
        'diagnosis',
        'treatment',
        'outcome',
        'is_disaster_related',
      ];

      for (const key of writableKeys) {
        if (dto[key] !== undefined) {
          updates.push(`${key} = $${idx++}`);
          values.push(dto[key]);
        }
      }

      if (updates.length === 0) return before;

      values.push(id);
      const afterRows = await manager.query(
        `UPDATE cases SET ${updates.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING id, chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis, treatment, outcome, is_disaster_related, created_at, deleted_at`,
        values,
      );
      const after = afterRows[0];

      const changed = writableKeys.filter(
        (key) => dto[key] !== undefined && before[key] !== after[key],
      );

      await this.audit(manager, actorId, 'case.update', id, undefined, {
        meta: changed.length ? { changed_fields: changed.sort() } : null,
      });

      return after;
    });
  }

  async removeAdmin(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = await this.dataSource.query(
        `UPDATE cases SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [id],
      );
      if (!rows[0])
        throw new NotFoundException('Case not found or already deleted');

      await this.audit(manager, actorId, 'case.delete', id, reason, {
        meta: { soft: true },
      });

      return { id: rows[0].id };
    });
  }
}
