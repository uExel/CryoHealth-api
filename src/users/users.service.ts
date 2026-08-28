import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { hash } from 'bcryptjs';
import { User } from './entities/user.entity';
import { Facility } from '../database/entities/facility.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
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
    meta?: Record<string, unknown>,
  ) {
    await manager.getRepository(AuditEntry).insert({
      actorId,
      action,
      entityType: 'User',
      entityId,
      meta,
    } as any);
  }

  private formatUser(user: User & { facility_name?: string }) {
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      lhw_id: user.lhwId ?? null,
      phone: user.phone ?? null,
      facility_id: user.facilityId ?? null,
      facility_name: user.facility_name ?? (user.facility?.name) ?? null,
      active: user.active,
      created_at: user.createdAt,
    };
  }

  async findAll() {
    const users = await this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.facility', 'f')
      .orderBy('u.active', 'DESC')
      .addOrderBy('u.name', 'ASC')
      .getMany();

    return users.map((u) => this.formatUser(u));
  }

  async create(dto: CreateUserDto, actorId: string) {
    if (!dto.lhwId && !dto.phone) {
      throw new BadRequestException(
        'An LHW ID or a phone number is required — sign-in looks up users by one of these',
      );
    }

    if (dto.facilityId) {
      const facilityExists = await this.facilities.findOne({
        where: { id: dto.facilityId },
      });
      if (!facilityExists) {
        throw new BadRequestException('Selected facility does not exist');
      }
    }

    const passwordHash = await hash(dto.pin, 10);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const user = repo.create({
        name: dto.name,
        role: dto.role,
        lhwId: dto.lhwId || undefined,
        phone: dto.phone || undefined,
        facilityId: dto.facilityId || undefined,
        passwordHash,
        active: true,
      });

      let savedUser: User;
      try {
        savedUser = await repo.save(user);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException(
            'A user with this LHW ID or phone number already exists.',
          );
        }
        throw err;
      }

      await this.audit(manager, actorId, 'user.create', savedUser.id, {
        created: {
          name: dto.name,
          role: dto.role,
          lhwId: dto.lhwId || null,
        },
      });

      return this.formatUser(savedUser);
    });
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    if (dto.role === undefined && dto.active === undefined) {
      throw new BadRequestException('No fields to update');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      
      const before = await repo
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id })
        .getOne();

      if (!before) {
        throw new NotFoundException('User not found');
      }

      const nextRole = dto.role ?? before.role;
      const nextActive = dto.active ?? before.active;

      const dropsAnAdmin =
        before.role === 'cryohealth_admin' &&
        before.active &&
        (nextRole !== 'cryohealth_admin' || !nextActive);

      if (dropsAnAdmin) {
        const countOtherAdmins = await repo
          .createQueryBuilder('user')
          .where('user.role = :role', { role: 'cryohealth_admin' })
          .andWhere('user.active = :active', { active: true })
          .andWhere('user.id != :id', { id })
          .getCount();

        if (countOtherAdmins === 0) {
          throw new ConflictException(
            'This is the last active cryohealth_admin. Promote another admin first — no one could restore access otherwise.',
          );
        }
      }

      if (dto.role !== undefined) before.role = dto.role;
      if (dto.active !== undefined) before.active = dto.active;

      let after: User;
      try {
        after = await repo.save(before);
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException(
            'A user with this LHW ID or phone number already exists.',
          );
        }
        throw err;
      }

      if (before.role !== after.role) {
        await this.audit(manager, actorId, 'user.role_change', id, {
          changed: { role: { from: before.role, to: after.role } },
        });
      }

      if (before.active !== after.active) {
        await this.audit(
          manager,
          actorId,
          after.active ? 'user.reactivate' : 'user.deactivate',
          id,
          { changed: { active: { from: before.active, to: after.active } } },
        );
      }

      return this.formatUser(after);
    });
  }
}
