/**
 * Structured GS1 validation error codes.
 * Returned in the `details` array of a 400 response body so API consumers
 * can programmatically distinguish error types without parsing message strings.
 */
export type Gs1ErrorCode =
  | 'AI_NOT_SUPPORTED'
  | 'AI_INVALID_VALUE'
  | 'AI_INVALID_DATE'
  | 'AI_CHECK_DIGIT_INVALID'
  | 'AI_REQUIRES_COMPANION'
  | 'AI_MUTUALLY_EXCLUSIVE'
  | 'AI_DUPLICATE'
  | 'RENDER_FAILED';

export interface Gs1ErrorDetail {
  code: Gs1ErrorCode;
  ai?: string;
  message: string;
}

/**
 * Maps a raw validation error message (thrown by gs1-validate / gs1-ai-registry)
 * to a structured Gs1ErrorDetail.  Falls back to AI_INVALID_VALUE for anything
 * that doesn't match a known pattern.
 */
export function classifyGs1Error(err: unknown, fallbackAi?: string): Gs1ErrorDetail {
  const msg = err instanceof Error ? err.message : String(err);

  // AI not in registry
  const notSupported = msg.match(/^AI (\S+) not supported/);
  if (notSupported) {
    return { code: 'AI_NOT_SUPPORTED', ai: notSupported[1], message: msg };
  }

  // Check digit errors (01 GTIN, 00 SSCC)
  if (/check digit/.test(msg)) {
    const ai = msg.match(/^AI (\S+)/)?.[1] ?? fallbackAi;
    return { code: 'AI_CHECK_DIGIT_INVALID', ai, message: msg };
  }

  // Semantic date validation
  const invalidDate = msg.match(/^AI (\S+): .* is not a valid YYMMDD/);
  if (invalidDate) {
    return { code: 'AI_INVALID_DATE', ai: invalidDate[1], message: msg };
  }

  // Combination: requires companion
  const requires = msg.match(/^AI (\S+) requires one of/);
  if (requires) {
    return { code: 'AI_REQUIRES_COMPANION', ai: requires[1], message: msg };
  }

  // Combination: mutually exclusive
  const exclusive = msg.match(/^AIs \[([^\]]+)\] are mutually exclusive/);
  if (exclusive) {
    return { code: 'AI_MUTUALLY_EXCLUSIVE', message: msg };
  }

  // Combination: duplicate
  const duplicate = msg.match(/^AI (\S+) must appear at most once/);
  if (duplicate) {
    return { code: 'AI_DUPLICATE', ai: duplicate[1], message: msg };
  }

  // Regex / pattern mismatch
  const patternFail = msg.match(/^AI (\S+) value does not match/);
  if (patternFail) {
    return { code: 'AI_INVALID_VALUE', ai: patternFail[1], message: msg };
  }

  // Render-level error from bwip-js
  if (/rendering failed/i.test(msg)) {
    return { code: 'RENDER_FAILED', message: msg };
  }

  return { code: 'AI_INVALID_VALUE', ai: fallbackAi, message: msg };
}

/**
 * Wraps a structured validation error payload for NestJS BadRequestException.
 */
export function gs1ErrorBody(details: Gs1ErrorDetail[]): {
  error: string;
  details: Gs1ErrorDetail[];
} {
  return { error: 'GS1_VALIDATION_FAILED', details };
}
