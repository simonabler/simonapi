import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import * as geoip from 'geoip-lite';
import { VisitorDailyEntity } from './entities/visitor-daily.entity';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often to flush in-memory counters to the DB (ms). Default: 60 s */
const FLUSH_INTERVAL_MS = 60_000;

/** How often to evict stale in-memory entries (ms). Default: 10 min */
const SWEEP_INTERVAL_MS = 10 * 60_000;

/** Maximum age for in-memory entries before sweep removes them (ms). 25 h covers today + yesterday */
const STALE_AFTER_MS = 25 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisitorKey {
  day: string;
  ipHash: string;
  routeGroup: string;
  tier: string;
  apiKeyPrefix: string | null;
}

interface VisitorBucket {
  key: VisitorKey;
  countryCode: string;
  requestCount: number;
  errorCount: number;
  lastSeenMs: number;
  dirty: boolean;
}

// ---------------------------------------------------------------------------
// Route-group resolver
// ---------------------------------------------------------------------------

export function resolveRouteGroup(path: string): string {
  const p = (path || '').replace(/^\/api\//, '').toLowerCase();
  if (p.startsWith('qr'))        return 'qr';
  if (p.startsWith('barcode'))   return 'barcode';
  if (p.startsWith('watermark')) return 'watermark';
  if (p.startsWith('crypto'))    return 'crypto';
  if (p.startsWith('signpack'))  return 'signpack';
  if (p.startsWith('utils'))     return 'utils';
  if (p.startsWith('lock'))      return 'lock';
  if (p.startsWith('admin'))     return 'admin';
  return 'other';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class VisitorService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(VisitorService.name);

  /** In-memory write-buffer keyed by "day|ipHash|routeGroup|tier|apiKeyPrefix" */
  private readonly buckets = new Map<string, VisitorBucket>();

  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(VisitorDailyEntity)
    private readonly repo: Repository<VisitorDailyEntity>,
  ) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    if (this.flushTimer.unref) this.flushTimer.unref();
    if (this.sweepTimer.unref) this.sweepTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    await this.flush();
  }

  // ---------------------------------------------------------------------------
  // Public API — called by MetricsInterceptor
  // ---------------------------------------------------------------------------

  record(opts: {
    rawIp: string;
    route: string;
    status: number;
    tier: string;
    apiKeyPrefix: string | null;
  }): void {
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const ipHash = this.hashIp(opts.rawIp, day);
    const countryCode = this.resolveCountry(opts.rawIp);
    const routeGroup = resolveRouteGroup(opts.route);
    const isError = opts.status >= 400;

    const bucketKey = `${day}|${ipHash}|${routeGroup}|${opts.tier}|${opts.apiKeyPrefix ?? ''}`;

    const existing = this.buckets.get(bucketKey);
    if (existing) {
      existing.requestCount += 1;
      if (isError) existing.errorCount += 1;
      existing.lastSeenMs = now;
      existing.dirty = true;
    } else {
      this.buckets.set(bucketKey, {
        key: { day, ipHash, routeGroup, tier: opts.tier, apiKeyPrefix: opts.apiKeyPrefix },
        countryCode,
        requestCount: 1,
        errorCount: isError ? 1 : 0,
        lastSeenMs: now,
        dirty: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Stats queries — used by admin controller
  // ---------------------------------------------------------------------------

  async getSummary(): Promise<{
    today: { uniqueIps: number; totalRequests: number; totalErrors: number; byTier: Record<string, number> };
    last7d: { uniqueIps: number; totalRequests: number };
    last30d: { uniqueIps: number; totalRequests: number };
  }> {
    await this.flush();

    const today = new Date().toISOString().slice(0, 10);
    const day7 = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const day30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

    const [todayRows, week7Rows, month30Rows] = await Promise.all([
      this.repo.find({ where: { day: today } }),
      this.repo.createQueryBuilder('v')
        .select('COUNT(DISTINCT v.ip_hash)', 'uniqueIps')
        .addSelect('SUM(v.request_count)', 'totalRequests')
        .where('v.day >= :day', { day: day7 })
        .getRawOne<{ uniqueIps: string; totalRequests: string }>(),
      this.repo.createQueryBuilder('v')
        .select('COUNT(DISTINCT v.ip_hash)', 'uniqueIps')
        .addSelect('SUM(v.request_count)', 'totalRequests')
        .where('v.day >= :day', { day: day30 })
        .getRawOne<{ uniqueIps: string; totalRequests: string }>(),
    ]);

    // Today aggregations
    const todayUniqueIps = new Set(todayRows.map(r => r.ipHash)).size;
    const todayTotalRequests = todayRows.reduce((s, r) => s + r.requestCount, 0);
    const todayTotalErrors = todayRows.reduce((s, r) => s + r.errorCount, 0);
    const byTier: Record<string, number> = {};
    for (const row of todayRows) {
      byTier[row.tier] = (byTier[row.tier] ?? 0) + 1;
    }

    return {
      today: {
        uniqueIps: todayUniqueIps,
        totalRequests: todayTotalRequests,
        totalErrors: todayTotalErrors,
        byTier,
      },
      last7d: {
        uniqueIps: parseInt(week7Rows?.uniqueIps ?? '0', 10),
        totalRequests: parseInt(week7Rows?.totalRequests ?? '0', 10),
      },
      last30d: {
        uniqueIps: parseInt(month30Rows?.uniqueIps ?? '0', 10),
        totalRequests: parseInt(month30Rows?.totalRequests ?? '0', 10),
      },
    };
  }

  async getDailyUnique(days = 30): Promise<Array<{ day: string; uniqueIps: number; totalRequests: number }>> {
    await this.flush();

    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const rows = await this.repo.createQueryBuilder('v')
      .select('v.day', 'day')
      .addSelect('COUNT(DISTINCT v.ip_hash)', 'uniqueIps')
      .addSelect('SUM(v.request_count)', 'totalRequests')
      .where('v.day >= :since', { since })
      .groupBy('v.day')
      .orderBy('v.day', 'ASC')
      .getRawMany<{ day: string; uniqueIps: string; totalRequests: string }>();

    return rows.map(r => ({
      day: r.day,
      uniqueIps: parseInt(r.uniqueIps, 10),
      totalRequests: parseInt(r.totalRequests, 10),
    }));
  }

  async getByApi(day?: string): Promise<Array<{ routeGroup: string; uniqueIps: number; totalRequests: number; errorRate: number }>> {
    await this.flush();

    const targetDay = day ?? new Date().toISOString().slice(0, 10);
    const rows = await this.repo.createQueryBuilder('v')
      .select('v.route_group', 'routeGroup')
      .addSelect('COUNT(DISTINCT v.ip_hash)', 'uniqueIps')
      .addSelect('SUM(v.request_count)', 'totalRequests')
      .addSelect('SUM(v.error_count)', 'totalErrors')
      .where('v.day = :day', { day: targetDay })
      .groupBy('v.route_group')
      .orderBy('SUM(v.request_count)', 'DESC')
      .getRawMany<{ routeGroup: string; uniqueIps: string; totalRequests: string; totalErrors: string }>();

    return rows.map(r => {
      const req = parseInt(r.totalRequests, 10);
      const err = parseInt(r.totalErrors, 10);
      return {
        routeGroup: r.routeGroup,
        uniqueIps: parseInt(r.uniqueIps, 10),
        totalRequests: req,
        errorRate: req > 0 ? Math.round((err / req) * 1000) / 10 : 0,
      };
    });
  }

  async getByCountry(day?: string): Promise<Array<{ countryCode: string; uniqueIps: number; totalRequests: number }>> {
    await this.flush();

    const targetDay = day ?? new Date().toISOString().slice(0, 10);
    const rows = await this.repo.createQueryBuilder('v')
      .select('v.country_code', 'countryCode')
      .addSelect('COUNT(DISTINCT v.ip_hash)', 'uniqueIps')
      .addSelect('SUM(v.request_count)', 'totalRequests')
      .where('v.day = :day', { day: targetDay })
      .groupBy('v.country_code')
      .orderBy('COUNT(DISTINCT v.ip_hash)', 'DESC')
      .getRawMany<{ countryCode: string; uniqueIps: string; totalRequests: string }>();

    return rows.map(r => ({
      countryCode: r.countryCode,
      uniqueIps: parseInt(r.uniqueIps, 10),
      totalRequests: parseInt(r.totalRequests, 10),
    }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private hashIp(ip: string, day: string): string {
    const secret = process.env['IP_HASH_SECRET'] ?? 'default-change-me';
    return createHash('sha256').update(`${ip}|${day}|${secret}`).digest('hex');
  }

  private resolveCountry(ip: string): string {
    try {
      const result = geoip.lookup(ip);
      return result?.country ?? 'XX';
    } catch {
      return 'XX';
    }
  }

  /** Flush all dirty buckets to the DB via upsert. */
  async flush(): Promise<void> {
    const dirty = [...this.buckets.values()].filter(b => b.dirty);
    if (!dirty.length) return;

    for (const bucket of dirty) {
      try {
        await this.repo
          .createQueryBuilder()
          .insert()
          .into(VisitorDailyEntity)
          .values({
            day: bucket.key.day,
            ipHash: bucket.key.ipHash,
            countryCode: bucket.countryCode,
            routeGroup: bucket.key.routeGroup,
            tier: bucket.key.tier,
            apiKeyPrefix: bucket.key.apiKeyPrefix,
            requestCount: bucket.requestCount,
            errorCount: bucket.errorCount,
          })
          .orUpdate(
            ['request_count', 'error_count', 'updated_at'],
            ['day', 'ip_hash', 'route_group', 'tier', 'api_key_prefix'],
            { skipUpdateIfNoValuesChanged: true },
          )
          .execute();
        bucket.dirty = false;
      } catch (err) {
        this.log.error('Failed to flush visitor bucket', err instanceof Error ? err.stack : String(err));
      }
    }
  }

  /** Remove in-memory entries that haven't been updated recently. */
  private sweep(): void {
    const cutoff = Date.now() - STALE_AFTER_MS;
    let evicted = 0;
    for (const [k, b] of this.buckets) {
      if (b.lastSeenMs < cutoff) {
        this.buckets.delete(k);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.log.debug(`Visitor bucket sweep: evicted ${evicted} stale entries`);
    }
  }
}
