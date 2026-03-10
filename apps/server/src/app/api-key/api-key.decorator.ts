import { SetMetadata } from '@nestjs/common';
import { ApiKeyTier } from './entities/api-key.entity';

export const REQUIRES_TIER_KEY = 'requiresTier';
export const RESOLVED_KEY_META = 'resolvedApiKey';

/**
 * Marks a controller or route handler as requiring a minimum API key tier.
 *
 * @example
 *   \@RequiresTier('pro')
 *   \@Post('gs1/batch')
 *   async batch(...) { ... }
 */
export const RequiresTier = (minTier: ApiKeyTier) =>
  SetMetadata(REQUIRES_TIER_KEY, minTier);
