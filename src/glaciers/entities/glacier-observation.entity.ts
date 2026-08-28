import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Glacier } from './glacier.entity';

@Entity('glacier_observations')
export class GlacierObservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'glacier_id' })
  glacierId: string;

  @ManyToOne(() => Glacier, (g) => g.observations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'glacier_id' })
  glacier: Glacier;

  @Column({ name: 'observed_at', type: 'timestamptz' })
  observedAt: Date;

  @Column({ name: 'area_km2', type: 'numeric', nullable: true })
  areaKm2?: number;

  @Column({ name: 'length_km', type: 'numeric', nullable: true })
  lengthKm?: number;

  @Column({ name: 'terminus_change_m', type: 'numeric', nullable: true })
  terminusChangeM?: number;

  @Column({ nullable: true })
  status?: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
