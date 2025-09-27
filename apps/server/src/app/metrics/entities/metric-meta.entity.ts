import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

const numberTransformer = {
  to: (value?: number | null) => (typeof value === 'number' ? value : value ?? 0),
  from: (value: unknown) => (typeof value === 'number' ? value : Number(value ?? 0)),
};

@Entity({ name: 'metric_meta' })
export class MetricMetaEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'bigint', default: 0, transformer: numberTransformer })
  totalCount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
