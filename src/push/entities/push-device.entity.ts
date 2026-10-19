import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PushPlatform = 'android' | 'ios';

@Entity('push_devices')
@Index('uq_push_devices_token', ['token'], { unique: true })
@Index('idx_push_devices_active_last_seen', ['active', 'lastSeenAt'])
export class PushDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  token: string;

  @Column()
  platform: PushPlatform;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
