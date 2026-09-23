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
        // Static, not env-configurable: this pool shares the Postgres instance with
        // CryoHealth-geo, so these are deliberate constants rather than something
        // each deploy can silently drift via an unset env var.
        extra: {
          max: 20,
          // Fail fast instead of pg-pool's default of waiting forever for a free
          // client when the pool is exhausted.
          connectionTimeoutMillis: 5000,
          // Release idle clients back after 30s instead of holding them open.
          idleTimeoutMillis: 30000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
