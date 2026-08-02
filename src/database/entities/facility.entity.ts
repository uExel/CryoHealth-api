import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
