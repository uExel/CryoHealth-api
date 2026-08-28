import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from '../database/entities/facility.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, AuditEntry])],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  exports: [TypeOrmModule, FacilitiesService],
})
export class FacilitiesModule {}
