import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';
import { LakesController } from './lakes.controller';
import { LakesService } from './lakes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lake, Observation])],
  controllers: [LakesController],
  providers: [LakesService],
})
export class LakesModule {}
