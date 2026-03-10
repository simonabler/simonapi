import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyTier } from './entities/api-key.entity';
import { ApiKeyService, ResolvedKey } from './api-key.service';
import { REQUIRES_TIER_KEY, TIER_RATE_LIMIT_KEY } from './api-key.decorator';

const TIER_ORDER: ApiKeyTier[] = ['free', 'pro', 'industrial'];

function tierAtLeast(actual: ApiKeyTier, required: ApiKeyTier): boolean {
  return TIER_ORDER.indexOf(actual) >= TIER_ORDER.indexOf(required);
}

export const RESOLVED_KEY_PROP = '__resolvedApiKey';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();

    // ── Determine mode from metadata ────────────────────────────────────────
    const minTier = this.reflector.getAllAndOverride<ApiKeyTier | undefined>(
      REQUIRES_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );
    const isTierRateLimit = this.reflector.getAllAndOverride<boolean | undefined>(
      TIER_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No decorator at all → fully public route, nothing to do
    if (!minTier && !isTierRateLimit) return true;

    const rawKey: string | undefined = req.headers['x-api-key'];

    // ── @TierRateLimit() — soft gate ────────────────────────────────────────
    // Key is optional. If present and valid → attach to request for the
    // UsageInterceptor to pick up the right tier limits.
    // If present but invalid → 401 (don't silently ignore bad keys).
    // If absent → allow through; UsageInterceptor uses IP/anonymous limits.
    if (isTierRateLimit && !minTier) {
      if (!rawKey) return true; // anonymous — allowed, throttled by IP

      let resolved: ResolvedKey | null = null;
      try {
        resolved = await this.apiKeyService.validate(rawKey);
      } catch {
        throw new UnauthorizedException({ message: 'API key validation failed' });
      }

      if (!resolved) {
        throw new UnauthorizedException({
          message: 'Invalid or expired API key',
          hint: 'Check your key or request a new one at simon@abler.tirol',
        });
      }

      req[RESOLVED_KEY_PROP] = resolved;
      return true;
    }

    // ── @RequiresTier(tier) — hard gate ─────────────────────────────────────
    // Key is mandatory and must meet the minimum tier.
    if (!rawKey) {
      throw new UnauthorizedException({
        message: 'API key required',
        hint: `This endpoint requires a ${minTier} API key. Send it as header: x-api-key: sk_${minTier}_…`,
        docsUrl: 'https://hub.abler.tirol#api-keys',
      });
    }

    let resolved: ResolvedKey | null = null;
    try {
      resolved = await this.apiKeyService.validate(rawKey);
    } catch {
      throw new UnauthorizedException({ message: 'API key validation failed' });
    }

    if (!resolved) {
      throw new UnauthorizedException({
        message: 'Invalid or expired API key',
        hint: 'Check your key or request a new one at simon@abler.tirol',
      });
    }

    if (!tierAtLeast(resolved.tier, minTier!)) {
      throw new ForbiddenException({
        message: `This endpoint requires a '${minTier}' key — your key is '${resolved.tier}'`,
        hint: 'Upgrade at simon@abler.tirol',
        yourTier: resolved.tier,
        requiredTier: minTier,
      });
    }

    req[RESOLVED_KEY_PROP] = resolved;
    return true;
  }
}
