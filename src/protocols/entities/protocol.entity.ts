import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tier } from '../../common/types/tier.type';

export type ProtocolStep = {
  label: string;
  head: string;
  why: string;
  tier: Tier;
  numbered?: boolean;
};

export type ProtocolSteps = {
  chw: ProtocolStep[];
  pub: ProtocolStep[];
};

@Entity('protocols')
export class Protocol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable key for the CHW app lookup – create-only (never editable after creation). */
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column()
  category: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text' })
  source: string;

  @Column({ name: 'is_disaster', default: false })
  isDisaster: boolean;

  /** Structured per-tier steps for cryohealth-app's Guidance screen (CHW + public
   *  audiences, separately authored — see cryohealth-app#5). Nullable: existing rows
   *  keep working, rendered from `body` by the app when this is absent. */
  @Column({ type: 'jsonb', nullable: true })
  steps?: ProtocolSteps;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
