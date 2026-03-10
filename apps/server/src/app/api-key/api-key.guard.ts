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
import { REQUIRES_TIER_KEY } from './api-key.decorator';

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
    // Resolve the minimum required tier from metadata (class or method)
    const minTier = this.reflector.getAllAndOverride<ApiKeyTier | undefined>(
      REQUIRES_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequiresTier → route is public, skip enforcement
    if (!minTier) return true;

    const req = context.switchToHttp().getRequest<any>();
    const rawKey: string | undefined = req.headers['x-api-key'];

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
      // DB error during lookup — fail closed
      throw new UnauthorizedException({ message: 'API key validation failed' });
    }

    if (!resolved) {
      throw new UnauthorizedException({
        message: 'Invalid or expired API key',
        hint: 'Check your key or request a new one at simon@abler.tirol',
      });
    }

    if (!tierAtLeast(resolved.tier, minTier)) {
      throw new ForbiddenException({
        message: `This endpoint requires a '${minTier}' key — your key is '${resolved.tier}'`,
        hint: `Upgrade at simon@abler.tirol`,
        yourTier: resolved.tier,
        requiredTier: minTier,
      });
    }

    // Attach resolved key info to request so interceptors/controllers can read it
    req[RESOLVED_KEY_PROP] = resolved;
    return true;
  }
}
