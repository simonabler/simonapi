import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

const doubleTransformer = {
  to: (value?: number | null) => (typeof value === 'number' ? value : value ?? 0),
  from: (value: unknown) => (typeof value === 'number' ? value : Number(value ?? 0)),
};

@Entity({ name: 'metric_route' })
export class MetricRouteEntity {
  @PrimaryColumn({ type: 'varchar', length: 256 })
  route!: string;

  @Column({ type: 'integer', default: 0 })
  count!: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  methods!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  statuses!: Record<string, number>;

  @Column({ type: 'double precision', default: 0, transformer: doubleTransformer })
  sumMs!: number;

  @Column({ type: 'double precision', default: 0, transformer: doubleTransformer })
  minMs!: number;

  @Column({ type: 'double precision', default: 0, transformer: doubleTransformer })
  maxMs!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastCallAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
