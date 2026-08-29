import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit')
export class AuditEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor?: User;
  @Column({ nullable: true }) actorId?: string;
  @Column() action: string;
  @Column() entityType: string;
  @Column({ nullable: true }) entityId?: string;
  /** Mandatory for manual alert issue/upgrade/downgrade — enforced at service level. */
  @Column({ type: 'text', nullable: true }) reason?: string;
  @Column({ type: 'jsonb', nullable: true }) meta?: any;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
