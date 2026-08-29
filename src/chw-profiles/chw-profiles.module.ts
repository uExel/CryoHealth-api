import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from '../districts/entities/district.entity';
import { ChwProfile } from './entities/chw-profile.entity';
import { ChwProfilesController } from './chw-profiles.controller';
import { ChwProfilesService } from './chw-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChwProfile, District])],
  controllers: [ChwProfilesController],
  providers: [ChwProfilesService],
  exports: [ChwProfilesService],
})
export class ChwProfilesModule {}
