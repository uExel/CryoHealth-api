import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AlertEmailDeliveryStatus =
  'pending' | 'sending' | 'sent' | 'failed';

@Entity('alert_email_deliveries')
@Index('uq_alert_email_deliveries_alert_user', ['alertId', 'userId'], {
  unique: true,
})
@Index('idx_alert_email_deliveries_pending', [
  'status',
  'nextAttemptAt',
  'createdAt',
])
export class AlertEmailDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alert_id', type: 'uuid' })
  alertId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  email: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: 'pending' })
  status: AlertEmailDeliveryStatus;

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
