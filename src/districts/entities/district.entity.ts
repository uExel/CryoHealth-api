import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: 'Gilgit Baltistan' })
  province: string;

  @Column({ type: 'integer', nullable: true })
  population?: number;

  @Column({ name: 'centroid_lat', type: 'double precision', nullable: true })
  centroidLat?: number;

  @Column({ name: 'centroid_lng', type: 'double precision', nullable: true })
  centroidLng?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
