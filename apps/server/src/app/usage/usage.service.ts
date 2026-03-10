import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  DayBucket,
  MinuteBucket,
  PathRule,
  RouteStats,
  TallyKey,
  UsageModuleOptions,
  UsageSnapshot,
} from './usage.types';
import { matchRule, normalizePath, nowMinuteWindow, todayStr } from './usage.util';

export const USAGE_OPTS = 'USAGE_OPTS';

/** How often to run the stale-entry sweep (ms). Default: every 5 minutes. */
const SWEEP_INTERVAL_MS = 5 * 60 * 1_000;
/** Evict minute-buckets older than this (ms). 2 full windows = safe margin. */
const MINUTE_BUCKET_TTL_MS = 2 * 60 * 1_000;
/** Evict day-buckets older than this many days. */
const DAY_BUCKET_KEEP_DAYS = 2;

@Injectable()
export class UsageService {
  private options: UsageModuleOptions = {};
  private minuteCounters = new Map<string, MinuteBucket>(); // key: `${key}|${path}`
  private dayCounters = new Map<string, DayBucket>(); // key: `${day}|${key}|${path}`
  private routeStats = new Map<string, RouteStats>(); // key: path
  private keys = new Set<string>();
  private startedAt = new Date();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(@Optional() @Inject(USAGE_OPTS) opts?: UsageModuleOptions) {
    this.configure(opts || {});
    this.startSweep();
  }

  /** Start the periodic stale-entry sweep. Safe to call multiple times. */
  private startSweep(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweepStale(), SWEEP_INTERVAL_MS);
    // Don't keep Node process alive just for the sweep
    if (this.sweepTimer.unref) this.sweepTimer.unref();
  }

  /**
   * Remove stale map entries to prevent unbounded heap growth.
   *
   * minuteCounters: evict any bucket whose windowStart is older than
   *   MINUTE_BUCKET_TTL_MS (2 minutes). These entries will never be used
   *   again — new requests start a fresh bucket for the current window.
   *
   * dayCounters: evict entries for days older than DAY_BUCKET_KEEP_DAYS.
   *   Only today's and yesterday's buckets are ever read.
   */
  sweepStale(now = Date.now()): { minuteEvicted: number; dayEvicted: number } {
    const cutoffMinute = now - MINUTE_BUCKET_TTL_MS;
    const cutoffDay = todayStr(new Date(now - DAY_BUCKET_KEEP_DAYS * 86_400_000));

    let minuteEvicted = 0;
    for (const [k, bucket] of this.minuteCounters) {
      if (bucket.windowStart < cutoffMinute) {
        this.minuteCounters.delete(k);
        minuteEvicted++;
      }
    }

    let dayEvicted = 0;
    for (const [k, bucket] of this.dayCounters) {
      if (bucket.day < cutoffDay) {
        this.dayCounters.delete(k);
        dayEvicted++;
      }
    }

    return { minuteEvicted, dayEvicted };
  }

  /** Stop the sweep timer (called in tests / on shutdown). */
  stopSweep(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  configure(opts: UsageModuleOptions) {
    this.options = opts || {};
  }

  getRuleForPath(path: string): PathRule | undefined {
    return matchRule(path, this.options.pathRules || {}) || this.options.defaultRule;
  }

  getAdminToken(): string | undefined {
    return this.options.adminToken;
  }

  /** Check limits and increment counters for current request */
  /**
   * Check limits and increment counters for the current request.
   *
   * @param overrideRule  Per-request rule that takes precedence over the
   *   globally configured pathRules / defaultRule.  Pass the tier-specific
   *   limits resolved from the validated API key here — this avoids mutating
   *   the shared singleton options (which causes race conditions).
   */
  checkAndCount(
    key: string,
    rawPath: string,
    overrideRule?: PathRule,
    now = Date.now(),
  ): { allowed: boolean; reason?: string } {
    const path = normalizePath(rawPath);
    // Per-request override wins; fall back to path/default rule from config
    const rule = overrideRule ?? this.getRuleForPath(path);

    // Record unique key
    this.keys.add(key);

    // Minute window
    const minuteKey = `${key}|${path}`;
    const currentWindow = nowMinuteWindow(now);
    const mb = this.minuteCounters.get(minuteKey);
    if (!mb || mb.windowStart !== currentWindow) {
      this.minuteCounters.set(minuteKey, { windowStart: currentWindow, count: 0 });
    }

    // Day window
    const day = todayStr(new Date(now));
    const dayKey = `${day}|${key}|${path}`;
    const db = this.dayCounters.get(dayKey) || { day, count: 0 };
    this.dayCounters.set(dayKey, db);

    // Evaluate rule
    if (rule?.perMinute != null) {
      const cur = this.minuteCounters.get(minuteKey)!;
      if (cur.count >= rule.perMinute) {
        return { allowed: false, reason: `per-minute limit ${rule.perMinute} exceeded` };
      }
    }
    if (rule?.perDay != null) {
      if (db.count >= rule.perDay) {
        return { allowed: false, reason: `per-day limit ${rule.perDay} exceeded` };
      }
    }

    // Increment counters
    this.minuteCounters.get(minuteKey)!.count++;
    db.count++;

    // Route stats: provisional hit; outcome recorded later
    const rs = this.routeStats.get(path) || { hits: 0, ok: 0, errors: 0, totalLatencyMs: 0, maxLatencyMs: 0 };
    rs.hits++;
    this.routeStats.set(path, rs);

    return { allowed: true };
  }

  recordOutcome(pathRaw: string, ok: boolean, latencyMs: number) {
    const path = normalizePath(pathRaw);
    const rs = this.routeStats.get(path) || { hits: 0, ok: 0, errors: 0, totalLatencyMs: 0, maxLatencyMs: 0 };
    if (ok) rs.ok++;
    else rs.errors++;
    rs.totalLatencyMs += latencyMs;
    if (latencyMs > rs.maxLatencyMs) rs.maxLatencyMs = latencyMs;
    this.routeStats.set(path, rs);
  }

  snapshot(): UsageSnapshot {
    const perRoute: Record<string, RouteStats> = {};
    for (const [path, stats] of this.routeStats.entries()) {
      perRoute[path] = { ...stats };
    }
    let hits = 0,
      ok = 0,
      errors = 0;
    for (const s of Object.values(perRoute)) {
      hits += s.hits;
      ok += s.ok;
      errors += s.errors;
    }

    return {
      since: this.startedAt.toISOString(),
      totals: { hits, ok, errors, uniqueKeys: this.keys.size },
      perRoute,
      rules: { defaultRule: this.options.defaultRule, pathRules: this.options.pathRules },
    };
  }

  resetAll() {
    this.minuteCounters.clear();
    this.dayCounters.clear();
    this.routeStats.clear();
    this.keys.clear();
    this.startedAt = new Date();
  }
}

