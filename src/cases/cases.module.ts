import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { ChwCase } from './entities/chw-case.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChwCase])],
  controllers: [CasesController],
  providers: [CasesService],
})
export class CasesModule {}
