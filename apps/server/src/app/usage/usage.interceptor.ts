import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { UsageService } from './usage.service';
import { RESOLVED_KEY_PROP } from '../api-key/api-key.guard';
import { ApiKeyTier } from '../api-key/entities/api-key.entity';
import { TIER_LIMITS } from '../api-key/api-key.service';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = context.switchToHttp().getRequest();
    const res: any = context.switchToHttp().getResponse();

    const path = req.originalUrl || req.url;

    // Prefer resolved key from ApiKeyGuard; fall back to raw header or IP
    const resolved = req[RESOLVED_KEY_PROP] as { id: string; tier: ApiKeyTier } | undefined;
    const rawHeader = req.headers['x-api-key'];
    const key = resolved?.id
      ?? (typeof rawHeader === 'string' && rawHeader.trim() ? rawHeader.trim() : null)
      ?? req.ip
      ?? 'anonymous';

    // Apply tier-specific limits when we have a resolved key
    if (resolved) {
      const limits = TIER_LIMITS[resolved.tier];
      this.usage.configure({
        defaultRule: {
          perMinute: limits.perMinute,
          ...(limits.perDay != null ? { perDay: limits.perDay } : {}),
        },
      });
    }

    const check = this.usage.checkAndCount(key, path);
    if (!check.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          reason: check.reason,
          retryAfter: 60,
        },
        429,
      );
    }

    // Expose remaining limits via response headers
    res.setHeader('X-RateLimit-Key', key.slice(0, 8) + '…');
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


