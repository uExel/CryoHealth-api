import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sync_log')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column() userId: string;
  @Column() deviceId: string;
  @Column({ type: 'timestamptz' }) startedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) finishedAt?: Date;
  @Column({ type: 'int', default: 0 }) itemCount: number;
  @Column({ default: 'ok' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) detail?: any;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
