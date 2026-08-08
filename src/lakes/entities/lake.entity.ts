import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Tier } from '../../common/types/tier.type';
import { Observation } from './observation.entity';

@Entity('lakes')
export class Lake {
  @PrimaryGeneratedColumn('uuid') id: string;
  /** Stable key for idempotent seeding, independent of a real ICIMOD ID (which most
   *  lakes here don't have yet — see source/sourceUrl). */
  @Column({ unique: true }) slug: string;
  @Column() name: string;
  @Column({ nullable: true }) nameUr?: string;
  @Column() valley: string;
  @Column() district: string;
  @Column({
    type: 'enum',
    enum: ['moraine', 'bedrock', 'ice', 'unknown'],
    enumName: 'dam_type',
    default: 'unknown',
  })
  damType: string;
  @Column({ default: false }) glacierContact: boolean;
  @Column({ nullable: true, unique: true }) icimodId?: string;
  /** Required, never a placeholder: where this row's coordinates and classification
   *  came from. A lake with no citable source does not get a row (see docs/ai/decisions/0002). */
  @Column({ type: 'text' }) source: string;
  @Column({ nullable: true }) sourceUrl?: string;
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  geom: object;
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  boundary?: object;
  @Column({ type: 'int', nullable: true }) elevationM?: number;
  @Column({ default: false }) historicalGlof: boolean;
  @Column({
    type: 'enum',
    enum: ['normal', 'watch', 'high', 'critical'],
    enumName: 'tier',
    default: 'normal',
  })
  currentTier: Tier;
  @Column({ default: false }) stale: boolean;
  /** Web-frontend columns added by WebSchema migration. */
  @Column({ nullable: true }) districtId?: string;
  @Column({ type: 'numeric', nullable: true }) currentRiskScore?: number;
  @Column({ type: 'int', nullable: true }) downstreamPopulation?: number;
  @Column({ type: 'numeric', nullable: true }) areaKm2?: number;
  @OneToMany(() => Observation, (o) => o.lake) observations: Observation[];
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
