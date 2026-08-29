import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from '../districts/entities/district.entity';
import { GlaciersController } from './glaciers.controller';
import { GlaciersService } from './glaciers.service';
import { Glacier } from './entities/glacier.entity';
import { GlacierObservation } from './entities/glacier-observation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Glacier, GlacierObservation, District])],
  controllers: [GlaciersController],
  providers: [GlaciersService],
})
export class GlaciersModule {}
