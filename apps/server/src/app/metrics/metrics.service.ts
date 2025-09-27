import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricMetaEntity } from './entities/metric-meta.entity';
import { MetricRouteEntity } from './entities/metric-route.entity';
import { MetricDailyEntity } from './entities/metric-daily.entity';

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
export class MetricsService implements OnModuleInit {
  private readonly log = new Logger(MetricsService.name);
  private metaCache: MetricMetaEntity | null = null;

  constructor(
    @InjectRepository(MetricMetaEntity)
    private readonly metaRepo: Repository<MetricMetaEntity>,
    @InjectRepository(MetricRouteEntity)
    private readonly routeRepo: Repository<MetricRouteEntity>,
    @InjectRepository(MetricDailyEntity)
    private readonly dailyRepo: Repository<MetricDailyEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureMeta();
  }

  async record(route: string, method: string, status: number, durationMs: number): Promise<void> {
    const normalizedRoute = route || 'unknown';
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);

    const meta = await this.ensureMeta();
    meta.totalCount += 1;
    try {
      const savedMeta = await this.metaRepo.save(meta);
      this.metaCache = savedMeta;
    } catch (err) {
      this.log.error('Failed to persist metric meta', err instanceof Error ? err.stack : String(err));
    }

    let routeEntity = await this.routeRepo.findOne({ where: { route: normalizedRoute } });
    if (!routeEntity) {
      routeEntity = this.routeRepo.create({
        route: normalizedRoute,
        count: 0,
        methods: {},
        statuses: {},
        sumMs: 0,
        minMs: durationMs,
        maxMs: durationMs,
        lastCallAt: now,
      });
    }

    routeEntity.count += 1;
    routeEntity.sumMs = (routeEntity.sumMs ?? 0) + durationMs;
    routeEntity.minMs = routeEntity.count > 1
      ? Math.min(routeEntity.minMs ?? durationMs, durationMs)
      : durationMs;
    routeEntity.maxMs = Math.max(routeEntity.maxMs ?? durationMs, durationMs);
    routeEntity.lastCallAt = now;
    const methods = { ...(routeEntity.methods ?? {}) };
    methods[method] = (methods[method] ?? 0) + 1;
    routeEntity.methods = methods;
    const statusKey = String(status);
    const statuses = { ...(routeEntity.statuses ?? {}) };
    statuses[statusKey] = (statuses[statusKey] ?? 0) + 1;
    routeEntity.statuses = statuses;

    await this.routeRepo.save(routeEntity).catch((err) => {
      this.log.error(`Failed to persist route metric for ${normalizedRoute}`, err instanceof Error ? err.stack : String(err));
    });

    let dailyEntity = await this.dailyRepo.findOne({ where: { day: dayKey } });
    if (!dailyEntity) {
      dailyEntity = this.dailyRepo.create({ day: dayKey, count: 0 });
    }
    dailyEntity.count += 1;
    await this.dailyRepo.save(dailyEntity).catch((err) => {
      this.log.error(`Failed to persist daily metric for ${dayKey}`, err instanceof Error ? err.stack : String(err));
    });
  }

  async snapshot(): Promise<MetricsSnapshot> {
    const meta = await this.ensureMeta();
    const [routes, dailyRows] = await Promise.all([
      this.routeRepo.find(),
      this.dailyRepo.find(),
    ]);

    const byRoute = routes.map<RouteStats & { avgMs: number }>((entry) => {
      const count = entry.count || 0;
      const sumMs = entry.sumMs ?? 0;
      const avgMs = count ? Math.round((sumMs / count) * 100) / 100 : 0;
      return {
        route: entry.route,
        count,
        methods: entry.methods ?? {},
        statuses: entry.statuses ?? {},
        sumMs,
        minMs: entry.minMs ?? 0,
        maxMs: entry.maxMs ?? 0,
        lastCallIso: entry.lastCallAt ? entry.lastCallAt.toISOString() : undefined,
        avgMs,
      };
    });

    const daily: Record<string, number> = {};
    for (const row of dailyRows) {
      daily[String(row.day)] = row.count;
    }

    return {
      startedAtIso: meta.startedAt.toISOString(),
      totalCount: meta.totalCount ?? 0,
      byRoute,
      daily,
    };
  }

  async reset(): Promise<void> {
    const meta = await this.ensureMeta();
    meta.totalCount = 0;
    meta.startedAt = new Date();
    const savedMeta = await this.metaRepo.save(meta);
    this.metaCache = savedMeta;
    await this.routeRepo.clear();
    await this.dailyRepo.clear();
  }

  private async ensureMeta(): Promise<MetricMetaEntity> {
    if (this.metaCache) {
      return this.metaCache;
    }
    let meta = await this.metaRepo.findOne({ where: { id: 'global' } });
    if (!meta) {
      meta = this.metaRepo.create({ id: 'global', startedAt: new Date(), totalCount: 0 });
      meta = await this.metaRepo.save(meta);
    }
    this.metaCache = meta;
    return meta;
  }
}
