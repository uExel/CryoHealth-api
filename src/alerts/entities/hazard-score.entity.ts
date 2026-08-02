import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Tier } from '../../common/types/tier.type';
import { Lake } from '../../lakes/entities/lake.entity';

@Entity('hazard_scores')
@Index(['lake', 'computedAt'])
export class HazardScore {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Lake, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lakeId' })
  lake: Lake;
  @Column() lakeId: string;
  @Column() runId: string;
  @Column({ type: 'numeric', precision: 8, scale: 4 }) score: string;
  @Column({
    type: 'enum',
    enum: ['normal', 'watch', 'high', 'critical'],
    enumName: 'tier',
  })
  tier: Tier;
  /** Per-signal inputs, kept whole so every score is reproducible from stored inputs. */
  @Column({ type: 'jsonb' }) components: Record<string, unknown>;
  @Column({ type: 'timestamptz' }) computedAt: Date;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
