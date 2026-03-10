export type StandardBarcodeType =
  | 'code128'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'code39'
  | 'itf14'
  | 'pdf417'
  | 'datamatrix';

export interface BarcodeRequest {
  type: StandardBarcodeType;
  text: string;
  includetext?: boolean;
  scale?: number;
  height?: number;
}

export type Gs1Symbology = 'gs1-128' | 'gs1datamatrix';

export interface Gs1Item { ai: string; value: string }

export interface Gs1Request {
  symbology: Gs1Symbology;
  items: Gs1Item[];
  includetext?: boolean;
  scale?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

export interface Gs1BatchEntry {
  ref?: string;
  items: Gs1Item[];
}

export interface Gs1BatchRequest {
  symbology: Gs1Symbology;
  format: 'png' | 'svg';
  barcodes: Gs1BatchEntry[];
  includetext?: boolean;
  scale?: number;
  height?: number;
}

export interface Gs1BatchResultItem {
  index: number;
  ref?: string;
  /** Base64-encoded PNG or raw SVG string. Present on success. */
  data?: string;
  mimeType?: string;
  /** Present on per-item failure. */
  error?: string;
  errorCode?: string;
}

// ---------------------------------------------------------------------------
// GS1 Digital Link
// ---------------------------------------------------------------------------

export interface DigitalLinkEncodeRequest {
  items: Gs1Item[];
  baseUrl?: string;
}

export interface DigitalLinkEncodeResult {
  url: string;
  primaryAi: string;
  primaryValue: string;
  qualifiers: Gs1Item[];
}

export interface DigitalLinkDecodeRequest {
  url: string;
}

// ---------------------------------------------------------------------------
// Structured error (mirrors backend gs1-error.ts)
// ---------------------------------------------------------------------------

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

export interface Gs1ErrorResponse {
  error: 'GS1_VALIDATION_FAILED';
  details: Gs1ErrorDetail[];
}

/** Extract a human-readable message from a backend error response. */
export function extractGs1ErrorMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const b = body as any;
    if (b.error === 'GS1_VALIDATION_FAILED' && Array.isArray(b.details) && b.details.length) {
      return b.details.map((d: Gs1ErrorDetail) => d.message).join(' · ');
    }
    if (b.message) return String(b.message);
  }
  return 'Unknown error';
}

// ---------------------------------------------------------------------------
// AI registry types (aligned with backend gs1-ai-registry.ts serialization)
// ---------------------------------------------------------------------------

export type AiSpecJson = {
  ai: string;
  label: string;
  pattern: { source: string; flags?: string };
  maxOccurrences?: number;
  requiresOneOf?: string[];
  requiresGroups?: string[][];
  notTogetherWith?: string[];
  hint?: string;
};

export type AiSpec = {
  ai: string;
  label: string;
  pattern: RegExp;
  maxOccurrences: number;
  requiresOneOf: string[];
  requiresGroups: string[][];
  notTogetherWith: string[];
  hint?: string;
};

export function compileAiDb(json: Record<string, AiSpecJson>): Record<string, AiSpec> {
  const out: Record<string, AiSpec> = {};
  for (const [k, v] of Object.entries(json)) {
    const rx = new RegExp(v.pattern.source, v.pattern.flags || undefined);
    out[k] = {
      ai: v.ai,
      label: v.label,
      pattern: rx,
      maxOccurrences: v.maxOccurrences ?? 1,
      requiresOneOf: v.requiresOneOf ?? [],
      requiresGroups: v.requiresGroups ?? [],
      notTogetherWith: v.notTogetherWith ?? [],
      hint: v.hint,
    };
  }
  return out;
}

export function validateAiValue(db: Record<string, AiSpec>, ai: string, value: string): string | null {
  const spec = db[ai];
  if (!spec) return null; // unknown AI → no client-side validation, let backend decide
  if (ai === '01') {
    if (!/^\d{13,14}$/.test(value)) return '13–14 digits expected (check digit auto-computed)';
    return null;
  }
  if (ai === '00') {
    if (!/^\d{17,18}$/.test(value)) return '17–18 digits expected (check digit auto-computed)';
    return null;
  }
  if (!spec.pattern.test(value)) return 'Value does not match the required pattern';
  return null;
}

// ---------------------------------------------------------------------------
// Client-side combination validation
// Mirrors backend validateCombination() including the COMBINATION_RULES that
// were added in the backend fix (mutual exclusion of 01/02/03, unique 00/01,
// GSRN pair exclusion).
// ---------------------------------------------------------------------------

/** Global rules mirroring backend COMBINATION_RULES. */
const GLOBAL_RULES: Array<
  | { type: 'mutuallyExclusive'; aiList: string[] }
  | { type: 'unique'; ai: string }
> = [
  { type: 'mutuallyExclusive', aiList: ['01', '02', '03'] },
  { type: 'mutuallyExclusive', aiList: ['8017', '8018'] },
  { type: 'unique', ai: '00' },
  { type: 'unique', ai: '01' },
];

export function validateCombination(
  db: Record<string, AiSpec>,
  items: Array<{ ai: string; value: string }>,
): string | null {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.ai, (counts.get(it.ai) || 0) + 1);

  // Per-AI registry constraints
  for (const [ai, cnt] of counts) {
    const spec = db[ai];
    if (!spec) continue;
    if (cnt > (spec.maxOccurrences ?? 1)) {
      return `AI ${ai} occurs ${cnt}× (max ${spec.maxOccurrences ?? 1})`;
    }
  }
  for (const [ai] of counts) {
    const spec = db[ai];
    if (!spec) continue;
    if (spec.notTogetherWith?.length) {
      const conflict = spec.notTogetherWith.filter(a => (counts.get(a) || 0) > 0);
      if (conflict.length) return `AI ${ai} cannot be used together with ${conflict.join(', ')}`;
    }
    if (spec.requiresOneOf?.length) {
      const ok = spec.requiresOneOf.some(a => (counts.get(a) || 0) > 0);
      if (!ok) return `AI ${ai} requires one of [${spec.requiresOneOf.join(', ')}]`;
    }
    if (spec.requiresGroups?.length) {
      for (const group of spec.requiresGroups) {
        const ok = group.some(a => (counts.get(a) || 0) > 0);
        if (!ok) return `AI ${ai} requires one from group [${group.join(', ')}]`;
      }
    }
  }

  // Global structural rules (matches COMBINATION_RULES in backend)
  for (const rule of GLOBAL_RULES) {
    if (rule.type === 'mutuallyExclusive') {
      const present = rule.aiList.filter(a => (counts.get(a) ?? 0) > 0);
      if (present.length > 1) {
        return `AIs ${present.join(' and ')} are mutually exclusive`;
      }
    }
    if (rule.type === 'unique') {
      if ((counts.get(rule.ai) ?? 0) > 1) {
        return `AI ${rule.ai} may only appear once`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// SSCC — Serial Shipping Container Code
// ---------------------------------------------------------------------------

export interface SsccBuildRequest {
  extensionDigit:  number;
  companyPrefix:   string;
  serialReference: string;
  format?:         'png' | 'svg';
  includetext?:    boolean;
  scale?:          number;
}

export interface SsccAutoRequest {
  extensionDigit: number;
  companyPrefix:  string;
  format?:        'png' | 'svg';
  includetext?:   boolean;
  scale?:         number;
}

export interface SsccValidateRequest  { sscc: string }
export interface SsccValidateResult   { valid: boolean; checkDigit: number; expected: number; error?: string }

export interface SsccPrefixInfo {
  valid:               boolean;
  memberOrganisation?: string;
  prefix3?:            string;
  error?:              string;
}

export interface SsccCounterState { prefixKey: string; lastSerial: number }
