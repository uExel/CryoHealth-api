import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { District } from '../../districts/entities/district.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chw_profiles')
export class ChwProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'district_id', type: String, nullable: true })
  districtId?: string | null;

  @ManyToOne(() => District, { nullable: true, eager: false })
  @JoinColumn({ name: 'district_id' })
  district?: District;

  // `type: String` keeps the column type TypeORM inferred before `| null` was added
  // (a union hides it from reflect-metadata).
  @Column({ type: String, nullable: true })
  phone?: string | null;

  @Column()
  language: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
