import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lake } from '../../lakes/entities/lake.entity';

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ default: 'bhu' }) type: string;
  @Column() district: string;
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom?: object;
  @Column({ nullable: true }) contact?: string;
  /** Admin-curated "downstream of" mapping — not computed flow-path modeling, which
   *  the PRD explicitly scopes out of the prototype (P2 roadmap). Drives alert routing:
   *  a lake's tier transition notifies CHWs/facility_admins at facilities pointing here. */
  @ManyToOne(() => Lake, { nullable: true })
  @JoinColumn({ name: 'lakeId' })
  lake?: Lake;
  @Column({ nullable: true }) lakeId?: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
