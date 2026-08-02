import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lake } from './lake.entity';

/** capturedAt is stored at midnight UTC of the scene's capture date — the writer's
 *  responsibility, not enforced by the column type (timestamptz). One scene per lake
 *  per day is the real-world constraint (Sentinel-2 revisit), so the unique index
 *  below only holds if every writer normalizes to midnight; documented here because
 *  it's the one thing that makes the constraint mean what it's supposed to mean. */
@Entity('observations')
@Index(['lake', 'capturedAt'])
@Index('idx_observation_dedupe', ['lakeId', 'capturedAt', 'source'], {
  unique: true,
})
export class Observation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Lake, (l) => l.observations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lakeId' })
  lake: Lake;
  @Column() lakeId: string;
  @Column({ type: 'timestamptz' }) capturedAt: Date;
  @Column({ default: 'sentinel2' }) source: string;
  @Column({ type: 'numeric', precision: 12, scale: 6 }) areaKm2: string;
  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  cloudFraction?: string;
  @Column({ nullable: true }) sceneId?: string;
  @Column() runId: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
