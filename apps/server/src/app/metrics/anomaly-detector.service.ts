import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

/** How often to sweep stale IP entries (ms). Default: 10 min */
const SWEEP_INTERVAL_MS = 10 * 60_000;
/** IP not seen for this long is evicted from in-memory Maps. */
const STALE_AFTER_MS = 20 * 60_000;
import { SlidingCounter, SlidingDistinct } from './sliding';
import { BlocklistService } from './blocklist.service';

export interface AnomalyConfig {
  burstPerMin: number;          // Requests/Minute/IP
  sustainedPer5Min: number;     // Requests/5min/IP
  uniqueRoutesPerMin: number;   // Distinct Routes/Minute/IP
  errorRatioThreshold: number;  // (4xx+5xx)/all over 5min
  minSamplesForErrorRatio: number;
}

const cfgFromEnv = (): AnomalyConfig => ({
  burstPerMin: parseInt(process.env.ANOMALY_BURST_PER_MIN ?? '120', 10),
  sustainedPer5Min: parseInt(process.env.ANOMALY_SUSTAINED_PER_5MIN ?? '300', 10),
  uniqueRoutesPerMin: parseInt(process.env.ANOMALY_UNIQUE_ROUTES_PER_MIN ?? '40', 10),
  errorRatioThreshold: parseFloat(process.env.ANOMALY_ERROR_RATIO ?? '0.6'),
  minSamplesForErrorRatio: parseInt(process.env.ANOMALY_MIN_ERR_SAMPLES ?? '50', 10),
});

@Injectable()
export class AnomalyDetectorService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AnomalyDetectorService.name);
  private readonly cfg = cfgFromEnv();

  private perIpMinute = new Map<string, SlidingCounter>();     // 60s
  private perIpFiveMin = new Map<string, SlidingCounter>();    // 5*60s
  private perIpRoutes = new Map<string, SlidingDistinct>();    // 60s distinct routes

  private perIpReq5m = new Map<string, SlidingCounter>();      // requests 5min
  private perIpErr5m = new Map<string, SlidingCounter>();      // errors   5min

  /** Tracks the last-seen timestamp per IP for stale-entry eviction. */
  private lastSeen = new Map<string, number>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly blocklist: BlocklistService) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => this.sweepStale(), SWEEP_INTERVAL_MS);
    if (this.sweepTimer.unref) this.sweepTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /** Remove in-memory counters for IPs that haven't been seen recently. */
  sweepStale(now = Date.now()): number {
    const cutoff = now - STALE_AFTER_MS;
    let evicted = 0;
    for (const [ip, ts] of this.lastSeen) {
      if (ts < cutoff) {
        this.perIpMinute.delete(ip);
        this.perIpFiveMin.delete(ip);
        this.perIpRoutes.delete(ip);
        this.perIpReq5m.delete(ip);
        this.perIpErr5m.delete(ip);
        this.lastSeen.delete(ip);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.log.debug(`AnomalyDetector sweep: evicted ${evicted} stale IP entries`);
    }
    return evicted;
  }

  private getIp(req: any): string {
    const xff = (req?.headers?.['x-forwarded-for'] as string) || '';
    const candidate = xff.split(',')[0]?.trim();
    return candidate || req?.ip || req?.socket?.remoteAddress || 'unknown';
  }

  observe(req: any, route: string, method: string, status: number) {
    const ip = this.getIp(req);
    const now = Date.now();

    this.lastSeen.set(ip, now);

    const minute = (this.perIpMinute.get(ip) ?? new SlidingCounter(60_000, 5_000));
    const five   = (this.perIpFiveMin.get(ip) ?? new SlidingCounter(300_000, 10_000));
    const routes = (this.perIpRoutes.get(ip) ?? new SlidingDistinct(60_000, 5_000));
    const r5     = (this.perIpReq5m.get(ip) ?? new SlidingCounter(300_000, 10_000));
    const e5     = (this.perIpErr5m.get(ip) ?? new SlidingCounter(300_000, 10_000));

    this.perIpMinute.set(ip, minute);
    this.perIpFiveMin.set(ip, five);
    this.perIpRoutes.set(ip, routes);
    this.perIpReq5m.set(ip, r5);
    this.perIpErr5m.set(ip, e5);

    minute.add(1, now);
    five.add(1, now);
    routes.add(`${method}:${route}`, now);
    r5.add(1, now);
    if (status >= 400) e5.add(1, now);

    const cMin = minute.count(now);
    if (cMin > this.cfg.burstPerMin) {
      const entry = this.blocklist.ban(ip, 'burst_per_minute', { cMin, route, method });
      this.log.warn(`IP ${ip} banned (Burst): ${cMin}/min – strikes=${entry.strikes}`);
      return;
    }

    const c5 = five.count(now);
    if (c5 > this.cfg.sustainedPer5Min) {
      const entry = this.blocklist.ban(ip, 'sustained_rate_5min', { c5 });
      this.log.warn(`IP ${ip} banned (Sustained): ${c5}/5min – strikes=${entry.strikes}`);
      return;
    }

    const distinct = routes.distinctCount(now);
    if (distinct > this.cfg.uniqueRoutesPerMin) {
      const entry = this.blocklist.ban(ip, 'route_scanning', { distinct });
      this.log.warn(`IP ${ip} banned (Route-Scan): ${distinct} routes/min – strikes=${entry.strikes}`);
      return;
    }

    const reqN = r5.count(now);
    const errN = e5.count(now);
    if (reqN >= this.cfg.minSamplesForErrorRatio) {
      const ratio = errN / Math.max(1, reqN);
      if (ratio >= this.cfg.errorRatioThreshold) {
        const entry = this.blocklist.ban(ip, 'error_storm', { reqN, errN, ratio });
        this.log.warn(`IP ${ip} banned (Error-Storm): ${(ratio*100).toFixed(0)}% errors – strikes=${entry.strikes}`);
        return;
      }
    }
  }
}
