import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { UsageService } from './usage.service';
import { RESOLVED_KEY_PROP } from '../api-key/api-key.guard';
import { ApiKeyTier } from '../api-key/entities/api-key.entity';
import { TIER_LIMITS } from '../api-key/api-key.service';
import { PathRule } from './usage.types';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = context.switchToHttp().getRequest();
    const res: any = context.switchToHttp().getResponse();

    const path = req.originalUrl || req.url;

    // Prefer the resolved key attached by ApiKeyGuard (validated, tier known).
    // Fall back to the raw header string, then real client IP, then 'anonymous'.
    //
    // IP resolution: behind nginx the real client IP is in X-Forwarded-For or
    // X-Real-IP. Express's req.ip only reflects those headers when trust proxy
    // is configured correctly — but to be safe we read the headers directly,
    // consistent with how anomaly.guard and lock.controller handle it.
    const resolved = req[RESOLVED_KEY_PROP] as { id: string; tier: ApiKeyTier } | undefined;
    const rawHeader = req.headers['x-api-key'];
    const clientIp =
      (req.headers['x-real-ip'] as string | undefined)?.trim() ||
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      'anonymous';
    const key = resolved?.id
      ?? (typeof rawHeader === 'string' && rawHeader.trim() ? rawHeader.trim() : null)
      ?? clientIp;

    // Build a per-request override rule from the resolved tier.
    // This is passed directly into checkAndCount() so we never mutate the
    // shared UsageService.options singleton — which would race under concurrent
    // requests from different tiers.
    const overrideRule: PathRule | undefined = resolved
      ? {
          perMinute: TIER_LIMITS[resolved.tier].perMinute,
          ...(TIER_LIMITS[resolved.tier].perDay != null
            ? { perDay: TIER_LIMITS[resolved.tier].perDay! }
            : {}),
        }
      : undefined;

    const check = this.usage.checkAndCount(key, path, overrideRule);
    if (!check.allowed) {
      const retryAfter = 60;
      // Standard header — lets clients / browsers know when to retry
      res.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          reason: check.reason,
          retryAfter,
        },
        429,
      );
    }

    // Expose current tier and key prefix via response headers
    res.setHeader('X-RateLimit-Key', key.slice(0, 8) + '...');
    res.setHeader('X-RateLimit-Tier', resolved?.tier ?? 'anonymous');

    const started = Date.now();

    return next.handle().pipe(
      catchError((err) => {
        this.usage.recordOutcome(path, false, Date.now() - started);
        return throwError(() => err);
      }),
      finalize(() => {
        const ok = res.statusCode < 400;
        this.usage.recordOutcome(path, ok, Date.now() - started);
      }),
    );
  }
}
