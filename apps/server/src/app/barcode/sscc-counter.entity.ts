import { Column, Entity, PrimaryColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

/**
 * Persists per-prefix SSCC serial counters.
 * Primary key is `extensionDigit + companyPrefix` so each combination
 * has its own independent counter.
 */
@Entity('sscc_counters')
export class SsccCounterEntity {
  /** Composite natural key: extensionDigit (1) + companyPrefix (7–10) */
  @PrimaryColumn({ length: 11 })
  prefixKey!: string;   // e.g. "30350000"

  @Column({ type: 'int', default: 0 })
  lastSerial!: number;

  @UpdateDateColumn()
  updatedAt!: Date;

  /** Optimistic locking — prevents lost updates under concurrent requests */
  @VersionColumn()
  version!: number;
}
