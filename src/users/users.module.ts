import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

/** Owns the identity/user domain. auth/ imports this for login; future admin endpoints
 *  for user/role management (PRD R1) land here, not in auth/. */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
