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
import { RecordHazardScoreDto } from './dto/record-hazard-score.dto';
import {
  AlertRecipient,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from './notifications/notification-channel';

const MAX_PAGE = 100;
const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private readonly alerts: Repository<Alert>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[],
  ) {}

  /** CHWs and facility_admins at facilities mapped downstream of this lake. Mapping is
   *  admin-curated (Facility.lakeId) — the PRD explicitly scopes computed flow-path
   *  routing out of the prototype. */
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

  /** The geo service's contract: report a new score, and if it implies a tier different
   *  from the lake's current one, exactly one active alert is created — the database's
   *  partial unique index (lakeId, tier) WHERE status='active' is what makes "exactly
   *  one" true even under concurrent/duplicate reports, not an application-level check. */
  async recordHazardScore(
    dto: RecordHazardScoreDto,
  ): Promise<{ alert: Alert | null; deduped: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const lakeRepo = manager.getRepository(Lake);
      const lake = await lakeRepo.findOne({ where: { id: dto.lakeId } });
      if (!lake) throw new NotFoundException('No such lake');

      // deep-partial type can't express a generic Record<string, unknown> jsonb column;
      // the driver serializes it correctly regardless.
      await manager.getRepository(HazardScore).insert({
        lakeId: dto.lakeId,
        runId: dto.runId,
        score: String(dto.score),
        tier: dto.tier,
        components: dto.components,
        computedAt: dto.computedAt ? new Date(dto.computedAt) : new Date(),
      } as any);

      if (dto.tier === lake.currentTier) {
        return { alert: null, deduped: false };
      }

      const { alert, deduped } = await this.insertAlert(
        manager,
        {
          lakeId: dto.lakeId,
          tier: dto.tier,
          title: `${lake.name}: tier now ${dto.tier.toUpperCase()}`,
          body: `Hazard score run ${dto.runId} moved ${lake.name} from ${lake.currentTier} to ${dto.tier}.`,
          downstreamSummary: `Monitored lake in ${lake.valley}, ${lake.district}.`,
        },
        /* onConflict */ 'ignore',
      );

      if (!deduped) {
        await lakeRepo.update(lake.id, { currentTier: dto.tier });
        await this.notify(alert!, lake.id);
      }
      return { alert, deduped };
    });
  }

  /** A human issuing a new alert outright — distinct from override, which changes an
   *  existing one. Collides with the dedupe index -> 409 pointing at PATCH instead of
   *  silently ignoring, because a human issuing an alert expects a real response. */
  async issueManual(dto: IssueAlertDto, actorId: string): Promise<Alert> {
    return this.dataSource.transaction(async (manager) => {
      const { alert, deduped, conflictWith } = await this.insertAlert(
        manager,
        {
          lakeId: dto.lakeId,
          tier: dto.tier,
          title: dto.title,
          body: dto.body,
          windowStart: dto.windowStart ? new Date(dto.windowStart) : undefined,
          windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : undefined,
          downstreamSummary: dto.downstreamSummary,
          chips: dto.chips,
          checklist: dto.checklist,
          issuedById: actorId,
        },
        'conflict',
      );

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

  /** Upgrade, downgrade, or clear an existing alert. Reason is mandatory and audited —
   *  a human overriding the model must say why (ARCHITECTURE.md, non-negotiable). */
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

  private async insertAlert(
    manager: EntityManager,
    fields: Partial<Alert>,
    onConflict: 'ignore' | 'conflict',
  ): Promise<{ alert: Alert | null; deduped: boolean; conflictWith?: string }> {
    const qb = manager
      .getRepository(Alert)
      .createQueryBuilder()
      .insert()
      .into(Alert)
      .values({ ...fields, status: 'active' });
    if (onConflict === 'ignore') qb.orIgnore();

    try {
      const result = await qb.execute();
      if (result.identifiers.length === 0) {
        const existing = await this.activeAlertFor(
          manager,
          fields.lakeId,
          fields.tier,
        );
        return { alert: existing, deduped: true, conflictWith: existing?.id };
      }
      const insertedId = result.identifiers[0].id as string;
      const alert = await manager
        .getRepository(Alert)
        .findOneOrFail({ where: { id: insertedId } });
      return { alert, deduped: false };
    } catch (err) {
      if (onConflict === 'conflict' && this.isUniqueViolation(err)) {
        const existing = await this.activeAlertFor(
          manager,
          fields.lakeId,
          fields.tier,
        );
        return { alert: null, deduped: true, conflictWith: existing?.id };
      }
      throw err;
    }
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
    } as any);
  }
}
