import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
