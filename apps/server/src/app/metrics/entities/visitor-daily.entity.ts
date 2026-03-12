import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * One row = one (date, ip_hash, route_group, tier) combination.
 *
 * Privacy model:
 *   ip_hash = SHA-256(rawIp + daily-salt)
 *   daily-salt = YYYY-MM-DD + IP_HASH_SECRET env-var
 *   → same IP on different days produces different hashes (no long-term profile)
 *   → raw IP is NEVER stored
 */
@Entity({ name: 'visitor_daily' })
@Index('IDX_VD_DATE_HASH', ['day', 'ipHash'])
@Index('IDX_VD_DATE', ['day'])
export class VisitorDailyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /** ISO date string YYYY-MM-DD */
  @Column({ type: 'text' })
  day!: string;

  /** SHA-256(ip + daily-salt) — never raw IP */
  @Column({ name: 'ip_hash', type: 'text' })
  ipHash!: string;

  /** ISO 3166-1 alpha-2 country code from geoip-lite, or 'XX' if unknown */
  @Column({ name: 'country_code', type: 'text', default: 'XX' })
  countryCode!: string;

  /** API group derived from route prefix: qr / barcode / watermark / crypto / signpack / utils / lock / admin / other */
  @Column({ name: 'route_group', type: 'text', default: 'other' })
  routeGroup!: string;

  /** Tier of the resolved API key, or 'anonymous' */
  @Column({ type: 'text', default: 'anonymous' })
  tier!: string;

  /** First 8 characters of the API key prefix, nullable */
  @Column({ name: 'api_key_prefix', type: 'text', nullable: true })
  apiKeyPrefix!: string | null;

  @Column({ name: 'request_count', type: 'integer', default: 0 })
  requestCount!: number;

  @Column({ name: 'error_count', type: 'integer', default: 0 })
  errorCount!: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
