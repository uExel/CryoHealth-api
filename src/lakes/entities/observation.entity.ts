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

@Entity('observations')
@Index(['lake', 'capturedAt'])
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
