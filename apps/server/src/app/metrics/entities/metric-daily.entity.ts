import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'metric_daily' })
export class MetricDailyEntity {
  @PrimaryColumn({ type: 'date' })
  day!: string;

  @Column({ type: 'integer', default: 0 })
  count!: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
