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

@Injectable()
export class UsageService {
  private options: UsageModuleOptions = {};
  private minuteCounters = new Map<string, MinuteBucket>(); // key: `${key}|${path}`
  private dayCounters = new Map<string, DayBucket>(); // key: `${day}|${key}|${path}`
  private routeStats = new Map<string, RouteStats>(); // key: path
  private keys = new Set<string>();
  private startedAt = new Date();

  constructor(@Optional() @Inject(USAGE_OPTS) opts?: UsageModuleOptions) {
    this.configure(opts || {});
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
  checkAndCount(key: string, rawPath: string, now = Date.now()): { allowed: boolean; reason?: string } {
    const path = normalizePath(rawPath);
    const rule = this.getRuleForPath(path);

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

