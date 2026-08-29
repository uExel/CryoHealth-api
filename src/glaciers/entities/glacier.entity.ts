import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GlacierObservation } from './glacier-observation.entity';
import { District } from '../../districts/entities/district.entity';

@Entity('glaciers')
export class Glacier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'rgi_id', nullable: true })
  rgiId?: string;

  @Column({ name: 'glims_id', nullable: true })
  glimsId?: string;

  @Column({ name: 'district_id', nullable: true })
  districtId?: string;

  @ManyToOne(() => District, { nullable: true, eager: false })
  @JoinColumn({ name: 'district_id' })
  district?: District;

  @Column('double precision')
  lat: number;

  @Column('double precision')
  lng: number;

  @Column({ name: 'area_km2', type: 'double precision', nullable: true })
  areaKm2?: number;

  @Column({ name: 'length_km', type: 'double precision', nullable: true })
  lengthKm?: number;

  @Column({ name: 'elevation_min_m', type: 'double precision', nullable: true })
  elevationMinM?: number;

  @Column({ name: 'elevation_max_m', type: 'double precision', nullable: true })
  elevationMaxM?: number;

  @Column()
  status: string;

  @Column({ name: 'terminus_type', nullable: true })
  terminusType?: string;

  @Column()
  source: string;

  @Column({ name: 'last_observed', type: 'timestamptz', nullable: true })
  lastObserved?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => GlacierObservation, (obs) => obs.glacier, { cascade: true })
  observations: GlacierObservation[];
}
