import { Injectable } from '@nestjs/common';

export interface RouteStats {
  route: string;
  count: number;
  methods: Record<string, number>;
  statuses: Record<string, number>;
  sumMs: number;
  minMs: number;
  maxMs: number;
  lastCallIso?: string;
}

export interface MetricsSnapshot {
  startedAtIso: string;
  totalCount: number;
  byRoute: (RouteStats & { avgMs: number })[];
  daily: Record<string, number>;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = new Date();
  private totalCount = 0;
  private readonly byRoute = new Map<string, RouteStats>();
  private readonly daily = new Map<string, number>();

  record(route: string, method: string, status: number, durationMs: number) {
    this.totalCount++;

    const dKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    this.daily.set(dKey, (this.daily.get(dKey) ?? 0) + 1);

    const key = route || 'unknown';
    const stats =
      this.byRoute.get(key) ??
      {
        route: key,
        count: 0,
        methods: {},
        statuses: {},
        sumMs: 0,
        minMs: Number.POSITIVE_INFINITY,
        maxMs: 0,
      };

    stats.count++;
    stats.methods[method] = (stats.methods[method] ?? 0) + 1;
    stats.statuses[String(status)] = (stats.statuses[String(status)] ?? 0) + 1;
    stats.sumMs += durationMs;
    stats.minMs = Math.min(stats.minMs, durationMs);
    stats.maxMs = Math.max(stats.maxMs, durationMs);
    stats.lastCallIso = new Date().toISOString();

    this.byRoute.set(key, stats);
  }

  snapshot(): MetricsSnapshot {
    const byRoute = Array.from(this.byRoute.values()).map((s) => ({
      ...s,
      avgMs: s.count ? Math.round((s.sumMs / s.count) * 100) / 100 : 0,
    }));

    const daily: Record<string, number> = {};
    for (const [k, v] of this.daily.entries()) daily[k] = v;

    return {
      startedAtIso: this.startedAt.toISOString(),
      totalCount: this.totalCount,
      byRoute,
      daily,
    };
  }

  reset() {
    this.totalCount = 0;
    this.byRoute.clear();
    this.daily.clear();
  }
}
