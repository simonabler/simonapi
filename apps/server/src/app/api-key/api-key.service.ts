import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { randomToken } from '../common/token.util';
import { ApiKeyEntity, ApiKeyTier } from './entities/api-key.entity';

export interface ResolvedKey {
  id: string;
  label: string;
  tier: ApiKeyTier;
}

/** Rate-limit config per tier (mirrors README tier table) */
export const TIER_LIMITS: Record<ApiKeyTier, { perMinute: number; perDay: number | null }> = {
  free:       { perMinute: 10,   perDay: null    },
  pro:        { perMinute: 100,  perDay: 10_000  },
  industrial: { perMinute: 1000, perDay: null    },
};

/** Key format: sk_{tier}_{32 random chars}  e.g. sk_pro_A3x… */
const TIER_PREFIX: Record<ApiKeyTier, string> = {
  free:       'sk_free_',
  pro:        'sk_pro_',
  industrial: 'sk_ind_',
};

@Injectable()
export class ApiKeyService implements OnModuleInit {
  private readonly log = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repo: Repository<ApiKeyEntity>,
  ) {}

  async onModuleInit() {
    // Seed a default Industrial key from ENV on first boot (useful for deployment)
    const seedKey = process.env.SEED_API_KEY;
    if (seedKey && seedKey.startsWith('sk_')) {
      const prefix = seedKey.slice(0, 12);
      const existing = await this.repo.findOneBy({ prefix });
      if (!existing) {
        const tier = this.tierFromRawKey(seedKey);
        await this.repo.save(
          this.repo.create({
            label: 'seed-key',
            prefix,
            keyHash: this.hash(seedKey),
            tier,
            active: true,
            expiresAt: null,
          }),
        );
        this.log.log(`Seeded API key [${tier}] from SEED_API_KEY env`);
      }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Validate a raw API key string.
   * Returns the resolved key info, or null if invalid / revoked / expired.
   */
  async validate(rawKey: string): Promise<ResolvedKey | null> {
    if (!rawKey || !rawKey.startsWith('sk_')) return null;

    const prefix = rawKey.slice(0, 12);
    const record = await this.repo.findOneBy({ prefix, active: true });
    if (!record) return null;

    if (record.expiresAt && record.expiresAt < new Date()) {
      this.log.warn(`API key expired: ${prefix}…`);
      return null;
    }

    const hash = this.hash(rawKey);
    if (hash !== record.keyHash) return null;

    return { id: record.id, label: record.label, tier: record.tier };
  }

  /**
   * Generate a new API key, persist it, and return the raw key ONCE.
   * The raw key is never stored — caller must record it immediately.
   */
  async create(label: string, tier: ApiKeyTier, expiresAt?: Date): Promise<{ rawKey: string; entity: ApiKeyEntity }> {
    const raw = TIER_PREFIX[tier] + randomToken(32);
    const prefix = raw.slice(0, 12);
    const entity = this.repo.create({
      label,
      prefix,
      keyHash: this.hash(raw),
      tier,
      active: true,
      expiresAt: expiresAt ?? null,
    });
    await this.repo.save(entity);
    this.log.log(`Created API key [${tier}] label="${label}" prefix=${prefix}…`);
    return { rawKey: raw, entity };
  }

  /** Revoke a key by its DB id */
  async revoke(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  /** List all active keys (without hashes) */
  async list(): Promise<Omit<ApiKeyEntity, 'keyHash'>[]> {
    const keys = await this.repo.find({ order: { createdAt: 'DESC' } });
    return keys.map(({ keyHash: _, ...rest }) => rest);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private tierFromRawKey(raw: string): ApiKeyTier {
    if (raw.startsWith('sk_pro_'))  return 'pro';
    if (raw.startsWith('sk_ind_'))  return 'industrial';
    return 'free';
  }
}
