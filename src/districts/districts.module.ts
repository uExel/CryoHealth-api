import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from './entities/district.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';

@Module({
  imports: [TypeOrmModule.forFeature([District, AuditEntry])],
  controllers: [DistrictsController],
  providers: [DistrictsService],
  exports: [TypeOrmModule, DistrictsService],
})
export class DistrictsModule {}
