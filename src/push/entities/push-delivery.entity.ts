import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Alert } from '../../alerts/entities/alert.entity';
import { PushDevice } from './push-device.entity';

export type PushDeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed';

@Entity('push_deliveries')
@Index('uq_push_deliveries_alert_device', ['alertId', 'deviceId'], {
  unique: true,
})
@Index('idx_push_deliveries_pending', ['status', 'nextAttemptAt'])
export class PushDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Alert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert: Alert;

  @Column({ name: 'alert_id', type: 'uuid' })
  alertId: string;

  @ManyToOne(() => PushDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: PushDevice;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ nullable: true })
  tier?: string;

  @Column({ default: 'pending' })
  status: PushDeliveryStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({
    name: 'next_attempt_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  nextAttemptAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
