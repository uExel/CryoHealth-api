import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { Protocol } from './entities/protocol.entity';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ProtocolsService {
  constructor(
    @InjectRepository(Protocol)
    private readonly protocols: Repository<Protocol>,
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
      entityType: 'Protocol',
      entityId,
      reason,
      meta,
    } as any);
  }

  /** Public: list all protocols ordered by is_disaster DESC (disaster protocols first). */
  async findAll() {
    return this.protocols.find({ order: { isDisaster: 'DESC', title: 'ASC' } });
  }

  async findOne(id: string) {
    const p = await this.protocols.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Protocol not found');
    return p;
  }

  async create(dto: CreateProtocolDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Protocol);
      try {
        const protocol = repo.create({
          slug: dto.slug,
          title: dto.title,
          category: dto.category,
          body: dto.body,
          source: dto.source,
          isDisaster: dto.is_disaster ?? false,
        });
        const saved = await repo.save(protocol);
        await this.audit(manager, actorId, 'protocol.create', saved.id, undefined, {
          created: { slug: saved.slug, title: saved.title, source: saved.source },
        });
        return saved;
      } catch (err: any) {
        if (err?.code === POSTGRES_UNIQUE_VIOLATION) {
          throw new ConflictException('A protocol with that slug already exists');
        }
        throw err;
      }
    });
  }

  async update(id: string, dto: UpdateProtocolDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Protocol);
      const protocol = await repo.findOne({ where: { id } });
      if (!protocol) throw new NotFoundException('Protocol not found');

      const before = { ...protocol };
      if (dto.title !== undefined) protocol.title = dto.title;
      if (dto.category !== undefined) protocol.category = dto.category;
      if (dto.body !== undefined) protocol.body = dto.body;
      if (dto.source !== undefined) protocol.source = dto.source;
      if (dto.is_disaster !== undefined) protocol.isDisaster = dto.is_disaster;

      const saved = await repo.save(protocol);

      const changed: Record<string, any> = {};
      for (const field of ['title', 'category', 'body', 'source', 'isDisaster'] as const) {
        if (before[field] !== saved[field]) changed[field] = { from: before[field], to: saved[field] };
      }
      await this.audit(manager, actorId, 'protocol.update', saved.id, undefined, {
        changed: Object.keys(changed).length ? changed : null,
      });
      return saved;
    });
  }

  async remove(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Protocol);
      const protocol = await repo.findOne({ where: { id } });
      if (!protocol) throw new NotFoundException('Protocol not found');
      await repo.remove(protocol);
      await this.audit(manager, actorId, 'protocol.delete', id, reason, {
        deleted: { slug: protocol.slug, title: protocol.title },
      });
      return { id };
    });
  }
}
