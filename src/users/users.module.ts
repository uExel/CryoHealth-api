import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Facility } from '../database/entities/facility.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/** Owns the identity/user domain. auth/ imports this for login; future admin endpoints
 *  for user/role management (PRD R1) land here, not in auth/. */
@Module({
  imports: [TypeOrmModule.forFeature([User, Facility, AuditEntry])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
