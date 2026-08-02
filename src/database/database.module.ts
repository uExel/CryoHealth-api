import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './all-entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('database.host'),
        port: cfg.get('database.port'),
        username: cfg.get('database.username'),
        password: cfg.get('database.password'),
        database: cfg.get('database.name'),
        entities,
        // Schema changes go through migrations only — never synchronize.
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
