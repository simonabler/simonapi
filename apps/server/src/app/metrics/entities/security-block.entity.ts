import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'security_block' })
export class SecurityBlockEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  ip!: string;

  @Column({ type: 'timestamptz' })
  until!: Date;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'integer', default: 1 })
  strikes!: number;

  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
