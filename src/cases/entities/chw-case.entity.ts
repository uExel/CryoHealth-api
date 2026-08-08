import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type SyncState = 'queued' | 'synced';

@Entity('chw_cases')
@Index(['chw', 'capturedAt'])
export class ChwCase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'chwId' })
  chw: User;
  @Column() chwId: string;
  @Column({ type: 'timestamptz' }) capturedAt: Date;
  /** Full triage payload as captured on-device; shape owned by the app's IMCI engine. */
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ nullable: true }) outcome?: string;
  @Column({
    type: 'enum',
    enum: ['queued', 'synced'],
    enumName: 'sync_state',
    default: 'synced',
  })
  syncState: SyncState;
  @Column() deviceId: string;
  /** Idempotency key for conflict-safe upsert from offline devices. */
  @Column({ unique: true }) clientCaseId: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
