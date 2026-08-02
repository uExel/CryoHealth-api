import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Tier } from '../../common/types/tier.type';
import { Lake } from '../../lakes/entities/lake.entity';
import { User } from '../../users/entities/user.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Lake, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lakeId' })
  lake?: Lake;
  @Column({ nullable: true }) lakeId?: string;
  @Column({
    type: 'enum',
    enum: ['normal', 'watch', 'high', 'critical'],
    enumName: 'tier',
  })
  tier: Tier;
  @Column() title: string;
  @Column({ type: 'text' }) body: string;
  @Column({ type: 'timestamptz', nullable: true }) windowStart?: Date;
  @Column({ type: 'timestamptz', nullable: true }) windowEnd?: Date;
  @Column({ type: 'text', nullable: true }) downstreamSummary?: string;
  @Column({
    type: 'enum',
    enum: ['active', 'cleared'],
    enumName: 'alert_status',
    default: 'active',
  })
  status: string;
  /** Null = created by the tiering pipeline; set = manual issue/override (audited). */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'issuedById' })
  issuedBy?: User;
  @Column({ nullable: true }) issuedById?: string;
  @Column({ unique: true }) dedupeKey: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) clearedAt?: Date;
}
