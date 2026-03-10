import { SetMetadata } from '@nestjs/common';
import { ApiKeyTier } from './entities/api-key.entity';

export const REQUIRES_TIER_KEY = 'requiresTier';
export const TIER_RATE_LIMIT_KEY = 'tierRateLimit';
export const RESOLVED_KEY_META = 'resolvedApiKey';

/**
 * Hard gate: the caller MUST supply a key of at least `minTier`.
 * Requests with no key or a lower tier receive 401/403.
 *
 * Use for endpoints where the feature itself must be restricted
 * (e.g. batch processing that is too expensive to expose for free).
 *
 * @example
 *   \@RequiresTier('pro')
 *   \@Post('gs1/batch')
 */
export const RequiresTier = (minTier: ApiKeyTier) =>
  SetMetadata(REQUIRES_TIER_KEY, minTier);

/**
 * Soft gate: the endpoint is open to all tiers (and to anonymous callers),
 * but a valid API key is resolved so UsageInterceptor can apply the correct
 * tier-specific rate limits.
 *
 * Requests without a key fall back to anonymous / IP-based limits.
 * Requests with an invalid key receive 401.
 *
 * Use for endpoints that should be accessible to everyone but where paying
 * customers deserve higher throughput (e.g. sscc/build, digital-link).
 *
 * @example
 *   \@TierRateLimit()
 *   \@Post('sscc/build')
 */
export const TierRateLimit = () => SetMetadata(TIER_RATE_LIMIT_KEY, true);
