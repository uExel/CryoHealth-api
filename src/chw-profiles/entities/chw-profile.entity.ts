import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
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

  @Column({ name: 'district_id', nullable: true })
  districtId?: string;

  @ManyToOne(() => District, { nullable: true, eager: false })
  @JoinColumn({ name: 'district_id' })
  district?: District;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  language: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
