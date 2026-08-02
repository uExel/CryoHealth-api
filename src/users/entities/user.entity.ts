import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Role } from '../../common/types/role.type';
import { Facility } from '../../database/entities/facility.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({
    type: 'enum',
    enum: ['cryohealth_admin', 'facility_admin', 'chw', 'viewer'],
    enumName: 'role',
  })
  role: Role;
  @Column() name: string;
  @Column({ nullable: true, unique: true }) phone?: string;
  @Column({ nullable: true, unique: true }) lhwId?: string;
  @Column() passwordHash: string;
  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facilityId' })
  facility?: Facility;
  @Column({ nullable: true }) facilityId?: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
