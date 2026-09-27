import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Lake } from '../lakes/entities/lake.entity';
import { User } from '../users/entities/user.entity';
import { Alert } from './entities/alert.entity';
import { AuditEntry } from './entities/audit-entry.entity';
import { HazardScore } from './entities/hazard-score.entity';
import { IssueAlertDto } from './dto/issue-alert.dto';
import { OverrideAlertDto } from './dto/override-alert.dto';
import { UpdateAlertDto } from './dto/admin-alert.dto';
import { RecordHazardScoreDto } from './dto/record-hazard-score.dto';
import {
  AlertRecipient,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from './notifications/notification-channel';

const MAX_PAGE = 100;
const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface AlertAckRow {
  alert_id: string;
  chw_id: string;
  acknowledged_at: Date;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private readonly alerts: Repository<Alert>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[],
  ) {}

  async recipientsFor(lakeId: string): Promise<AlertRecipient[]> {
    const recipients = await this.users.find({
      where: {
        active: true,
        role: In(['chw', 'facility_admin']),
        facility: { lakeId },
      },
      relations: ['facility'],
    });
    return recipients
      .filter((u) => u.phone || u.lhwId)
      .map((u) => ({
        userId: u.id,
        name: u.name,
        address: u.phone ?? u.lhwId ?? '',
      }));
  }

  private async notify(alert: Alert, lakeId?: string) {
    const recipients = lakeId ? await this.recipientsFor(lakeId) : [];
    await Promise.all(this.channels.map((c) => c.send(alert, recipients)));
  }

  async recordHazardScore(
    dto: RecordHazardScoreDto,
  ): Promise<{ alert: Alert | null; deduped: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const lakeRepo = manager.getRepository(Lake);
      const lake = await lakeRepo.findOne({ where: { id: dto.lakeId } });
      if (!lake) throw new NotFoundException('No such lake');

      await manager.getRepository(HazardScore).insert({
        lakeId: dto.lakeId,
        runId: dto.runId,
        score: String(dto.score),
        tier: dto.tier,
        components: dto.components,
        computedAt: dto.computedAt ? new Date(dto.computedAt) : new Date(),
      } as Partial<HazardScore>);

      if (dto.tier === lake.currentTier) {
        return { alert: null, deduped: false };
      }

      const { alert, deduped } = await this.insertAlert(manager, {
        lakeId: dto.lakeId,
        tier: dto.tier,
        title: `${lake.name}: tier now ${dto.tier.toUpperCase()}`,
        body: `Hazard score run ${dto.runId} moved ${lake.name} from ${lake.currentTier} to ${dto.tier}.`,
        downstreamSummary: `Monitored lake in ${lake.valley}, ${lake.district}.`,
      });

      if (!deduped) {
        await lakeRepo.update(lake.id, { currentTier: dto.tier });
        await this.notify(alert!, lake.id);
      }
      return { alert, deduped };
    });
  }

  async issueManual(dto: IssueAlertDto, actorId: string): Promise<Alert> {
    return this.dataSource.transaction(async (manager) => {
      const { alert, deduped, conflictWith } = await this.insertAlert(manager, {
        lakeId: dto.lakeId,
        tier: dto.tier,
        title: dto.title,
        body: dto.body,
        windowStart: dto.windowStart ? new Date(dto.windowStart) : undefined,
        windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : undefined,
        estimatedWindow: dto.estimatedWindow,
        downstreamSummary: dto.downstreamSummary,
        chips: dto.chips,
        checklist: dto.checklist,
        issuedById: actorId,
      });

      if (deduped) {
        throw new ConflictException(
          `An active ${dto.tier} alert already exists for this lake (${conflictWith}). Use PATCH /alerts/${conflictWith} to override it.`,
        );
      }

      if (dto.lakeId) {
        await manager
          .getRepository(Lake)
          .update(dto.lakeId, { currentTier: dto.tier });
      }
      await this.audit(manager, actorId, 'alert.issue', alert!.id, dto.reason);
      await this.notify(alert!, dto.lakeId);
      return alert!;
    });
  }

  async override(
    id: string,
    dto: OverrideAlertDto,
    actorId: string,
  ): Promise<Alert> {
    if (!dto.clear && !dto.tier) {
      throw new BadRequestException(
        'Provide either tier (upgrade/downgrade) or clear: true',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Alert);
      const alert = await repo.findOne({ where: { id } });
      if (!alert) throw new NotFoundException('No such alert');

      if (dto.clear) {
        await repo.update(id, { status: 'cleared', clearedAt: new Date() });
        await this.audit(manager, actorId, 'alert.clear', id, dto.reason);
      } else {
        try {
          await repo.update(id, { tier: dto.tier });
        } catch (err) {
          if (this.isUniqueViolation(err)) {
            throw new ConflictException(
              `Another active alert already exists for this lake at ${dto.tier}.`,
            );
          }
          throw err;
        }
        if (alert.lakeId) {
          await manager
            .getRepository(Lake)
            .update(alert.lakeId, { currentTier: dto.tier });
        }
        await this.audit(manager, actorId, 'alert.override', id, dto.reason, {
          fromTier: alert.tier,
          toTier: dto.tier,
        });
      }

      const updated = await repo.findOneOrFail({ where: { id } });
      await this.notify(updated, alert.lakeId);
      return updated;
    });
  }

  async feed(page = 1, pageSize = 50, includeCleared = false) {
    const take = Math.min(pageSize, MAX_PAGE);
    const [items, total] = await this.alerts.findAndCount({
      where: includeCleared ? {} : { status: 'active' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }

  async byId(id: string): Promise<Alert> {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('No such alert');
    return alert;
  }

  async listAlertAcks(): Promise<AlertAckRow[]> {
    return await this.dataSource.query(
      `SELECT alert_id, chw_id, acknowledged_at FROM alert_acknowledgements`,
    );
  }

  async insertAlertAck(alertId: string, chwId: string) {
    await this.dataSource.query(
      `
      INSERT INTO alert_acknowledgements (alert_id, chw_id)
      VALUES ($1, $2)
      ON CONFLICT (alert_id, chw_id) DO NOTHING
      `,
      [alertId, chwId],
    );
    return { success: true };
  }

  async updateAdmin(
    id: string,
    dto: UpdateAlertDto,
    actorId: string,
  ): Promise<Alert> {
    // Record rather than Partial<Alert>: estimatedWindow may be null (clear the
    // window), and TypeORM skips undefined keys on update.
    const patch: Record<string, unknown> = {};
    if (dto.body !== undefined) {
      // body_en mirrors body (same as the web dashboard's original insert path).
      patch.body = dto.body;
      patch.bodyEn = dto.body;
    }
    if (dto.tier !== undefined) patch.tier = dto.tier;
    if (dto.estimatedWindow !== undefined) {
      patch.estimatedWindow = dto.estimatedWindow;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Alert);
      const before = await repo.findOne({ where: { id } });
      if (!before) throw new NotFoundException('Alert not found');
      try {
        await repo.update(id, patch);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException(
            'An active alert already exists for that lake and tier.',
          );
        }
        throw err;
      }
      const changed: Record<string, { from: unknown; to: unknown }> = {};
      const prior = before as unknown as Record<string, unknown>;
      for (const key of Object.keys(patch)) {
        if (prior[key] !== patch[key]) {
          changed[key] = { from: prior[key] ?? null, to: patch[key] ?? null };
        }
      }
      await manager.getRepository(AuditEntry).insert({
        actorId,
        action: 'alert.update',
        entityType: 'Alert',
        entityId: id,
        meta: Object.keys(changed).length ? { changed } : undefined,
      } as Partial<AuditEntry>);
      return repo.findOneOrFail({ where: { id } });
    });
  }

  async clearAdmin(
    id: string,
    reason: string,
    actorId: string,
  ): Promise<Alert> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Alert);
      const result = await repo.update(
        { id, status: 'active' },
        { status: 'cleared', clearedAt: new Date() },
      );
      if (!result.affected) {
        throw new NotFoundException('No active alert with that id');
      }
      await this.audit(manager, actorId, 'alert.clear', id, reason);
      return repo.findOneOrFail({ where: { id } });
    });
  }

  async deleteAdmin(
    id: string,
    reason: string,
    actorId: string,
  ): Promise<{ ok: true }> {
    return this.dataSource.transaction(async (manager) => {
      const [{ n: acks }] = (await manager.query(
        `SELECT count(*)::int AS n FROM alert_acknowledgements WHERE alert_id = $1`,
        [id],
      )) as { n: number }[];
      if (acks > 0) {
        throw new ConflictException({
          error: 'Cannot delete: dependent rows exist',
          dependents: { alert_acknowledgements: acks },
        });
      }
      const result = await manager.getRepository(Alert).delete(id);
      if (!result.affected) throw new NotFoundException('Alert not found');
      await this.audit(manager, actorId, 'alert.delete', id, reason);
      return { ok: true };
    });
  }

  /** ON CONFLICT DO NOTHING rather than catching the unique violation: a failed INSERT
   *  aborts the surrounding Postgres transaction, so the follow-up lookup of the
   *  conflicting alert would itself fail (25P02) and surface as a 500 instead of a 409. */
  private async insertAlert(
    manager: EntityManager,
    fields: Partial<Alert>,
  ): Promise<{ alert: Alert | null; deduped: boolean; conflictWith?: string }> {
    const result = await manager
      .getRepository(Alert)
      .createQueryBuilder()
      .insert()
      .into(Alert)
      .values({ ...fields, status: 'active' })
      .orIgnore()
      .execute();
    // A skipped row still yields one (undefined) entry in `identifiers` — TypeORM pushes
    // one per value set whether or not RETURNING produced a row — so check the id itself.
    const insertedId = result.identifiers[0]?.id as string | undefined;
    if (!insertedId) {
      const existing = await this.activeAlertFor(
        manager,
        fields.lakeId,
        fields.tier,
      );
      return { alert: existing, deduped: true, conflictWith: existing?.id };
    }
    const alert = await manager
      .getRepository(Alert)
      .findOneOrFail({ where: { id: insertedId } });
    return { alert, deduped: false };
  }

  private activeAlertFor(
    manager: EntityManager,
    lakeId?: string,
    tier?: Alert['tier'],
  ) {
    return manager
      .getRepository(Alert)
      .findOne({ where: { lakeId, tier, status: 'active' } });
  }

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
    reason: string,
    meta?: Record<string, unknown>,
  ) {
    await manager.getRepository(AuditEntry).insert({
      actorId,
      action,
      entityType: 'Alert',
      entityId,
      reason,
      meta,
    } as Partial<AuditEntry>);
  }
}
