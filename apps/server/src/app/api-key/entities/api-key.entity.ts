import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ApiKeyTier = 'free' | 'pro' | 'industrial';

/**
 * Persisted API key record.
 *
 * The raw key (sk_pro_…) is NEVER stored — only its SHA-256 hash.
 * The prefix ("sk_pro_", "sk_ind_", "sk_free_") is stored plain so we can
 * look up candidates by prefix before comparing the hash.
 */
// Composite index used by the hot validate() path: findOneBy({ prefix, active })
@Index('IDX_API_KEYS_PREFIX_ACTIVE', ['prefix', 'active'])
@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Human label: owner name, project, or email */
  @Column({ type: 'varchar', length: 255 })
  label!: string;

  /** Key prefix stored in plain text, e.g. "sk_pro_aBcDe" (first ~12 chars) */
  @Column({ type: 'varchar', length: 32, unique: true })
  prefix!: string;

  /** SHA-256(rawKey) — never the raw key itself */
  @Column({ type: 'varchar', length: 64 })
  keyHash!: string;

  /** Subscription tier */
  @Column({ type: 'varchar', length: 16, default: 'free' })
  tier!: ApiKeyTier;

  /** false = key is revoked but kept for audit */
  @Column({ type: 'boolean', default: true })
  active!: boolean;

  /** Optional hard expiry — null means no expiry */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
