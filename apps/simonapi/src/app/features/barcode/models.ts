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

// ---------------------------------------------------------------------------
// Human-readable format descriptions derived from regex patterns
// ---------------------------------------------------------------------------

/**
 * Translates a GS1 regex pattern into a short, user-friendly format string.
 * Examples:
 *   (\d{14})              → "14 digits"
 *   (\d{1,20})            → "1–20 digits"
 *   (\d{2}(?:0\d|1[0-2])…) → "Date: YYMMDD"
 *   ([!%-?A-Z_a-z\x22]{1,20}) → "1–20 alphanumeric characters (A–Z, a–z, 0–9, special)"
 */
export function patternToFormatHint(pattern: RegExp): string {
  const src = pattern.source
    .replace(/^\^/, '').replace(/\$$/, '')   // strip anchors
    .replace(/^\(/, '').replace(/\)$/, '');  // strip outer group

  // Date patterns (YYMMDD)
  if (src.includes('0\\d|1[0-2]') || src.includes('(?:0\\d|1[0-2])')) {
    return 'Date: YYMMDD (e.g. 251231 = 31 Dec 2025)';
  }
  // Fixed-length digit
  const fixedDigit = src.match(/^\\d\{(\d+)\}$/);
  if (fixedDigit) return `Exactly ${fixedDigit[1]} digit${+fixedDigit[1] !== 1 ? 's' : ''}`;

  // Variable-length digit
  const varDigit = src.match(/^\\d\{(\d+),(\d+)\}$/);
  if (varDigit) return `${varDigit[1]}–${varDigit[2]} digits`;

  // Variable with 0 min digits (optional)
  const optDigit = src.match(/^\\d\{0,(\d+)\}$/);
  if (optDigit) return `Up to ${optDigit[1]} digits`;

  // Alphanumeric GS1 charset
  if (src.includes('[!%-?A-Z_a-z') || src.includes('[!%-?A-Z')) {
    const lenMatch = src.match(/\{(\d+),(\d+)\}/) || src.match(/\{(\d+)\}/);
    if (lenMatch) {
      const len = lenMatch[2] ? `${lenMatch[1]}–${lenMatch[2]}` : `${lenMatch[1]}`;
      return `${len} characters (A–Z, a–z, 0–9, ! # $ % & ' ( ) * + , - . / : ; < = > ? _)`;
    }
    return 'Alphanumeric GS1 characters';
  }

  // Fallback: show simplified regex
  return `Format: ${src.replace(/\\/g, '').replace(/[()]/g, '').substring(0, 40)}`;
}

/**
 * Returns a placeholder / example value for a given AI.
 * Used to populate the input field's placeholder attribute.
 */
export function aiPlaceholder(ai: string): string {
  const examples: Record<string, string> = {
    '00': '340123456789012345',  // SSCC 18 digits
    '01': '09506000134370',       // GTIN-14
    '02': '09506000134370',
    '10': 'BATCH42',
    '11': '251231',               // YYMMDD
    '12': '251231',
    '13': '251231',
    '15': '260630',
    '16': '260630',
    '17': '260630',
    '20': '01',
    '21': 'SN-0042',
    '22': 'CPV-A1',
    '30': '100',
    '37': '6',
    '310': '000500',
    '311': '000500',
    '320': '000250',
    '330': '000100',
    '400': 'PO-2025-001',
    '401': 'CONSIGNMENT-001',
    '402': '12345678901234567',
    '403': 'ROUTE-42',
    '410': '4012345000009',
    '411': '4012345000009',
    '412': '4012345000009',
    '413': '4012345000009',
    '414': '4012345000009',
    '415': '4012345000009',
    '420': '1234',
    '421': 'AUT1234',
    '422': '040',
    '710': 'NHRN-001',
    '8001': '123412340123',
    '8002': 'CELLNO42',
    '8004': '0950600013437',
    '8005': '000199',
    '8006': '09506000134370012',
    '8007': 'AT12345678901234',
    '8008': '2512310001',
    '8009': 'AI8009',
    '8010': 'PPN12345',
    '8011': '123456',
    '8012': 'SFWV1.0',
    '8013': 'BUDI-AI-001',
    '8017': '123456789012345678',
    '8018': '123456789012345678',
    '8019': '42',
    '8020': 'PAYREF-001',
    '8026': '09506000134370012',
  };
  return examples[ai] ?? '';
}

export function validateAiValue(db: Record<string, AiSpec>, ai: string, value: string): string | null {
  const spec = db[ai];
  if (!spec) return null; // unknown AI → no client-side validation, let backend decide

  // Special cases with richer messages
  if (ai === '01') {
    if (!/^\d{13,14}$/.test(value)) return '13–14 digits expected — check digit is auto-computed';
    return null;
  }
  if (ai === '00') {
    if (!/^\d{17,18}$/.test(value)) return '17–18 digits expected — check digit is auto-computed';
    return null;
  }

  if (!spec.pattern.test(value)) {
    const hint = patternToFormatHint(spec.pattern);
    return `Invalid value — expected: ${hint}`;
  }
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

export interface CombinationError {
  type: 'duplicate' | 'conflict' | 'missingRequired' | 'mutuallyExclusive';
  message: string;
  /** The AI code(s) involved, for highlighting the affected row(s) */
  affectedAis: string[];
  /** Optional fix suggestion shown in the UI */
  suggestion?: string;
}

export function validateCombination(
  db: Record<string, AiSpec>,
  items: Array<{ ai: string; value: string }>,
): string | null {
  const err = validateCombinationDetailed(db, items);
  return err ? err.message : null;
}

export function validateCombinationDetailed(
  db: Record<string, AiSpec>,
  items: Array<{ ai: string; value: string }>,
): CombinationError | null {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.ai, (counts.get(it.ai) || 0) + 1);

  // Per-AI registry constraints
  for (const [ai, cnt] of counts) {
    const spec = db[ai];
    if (!spec) continue;
    if (cnt > (spec.maxOccurrences ?? 1)) {
      return {
        type: 'duplicate',
        message: `AI ${ai} (${spec.label}) appears ${cnt}× — only ${spec.maxOccurrences ?? 1} allowed`,
        affectedAis: [ai],
        suggestion: `Remove the duplicate AI ${ai} row`,
      };
    }
  }

  for (const [ai] of counts) {
    const spec = db[ai];
    if (!spec) continue;

    if (spec.notTogetherWith?.length) {
      // Filter out self-references (registry data quirk: AIs in the same
      // "exactly one of this group" family list themselves as mutually exclusive)
      const conflict = spec.notTogetherWith.filter(a => a !== ai && (counts.get(a) || 0) > 0);
      if (conflict.length) {
        const conflictLabels = conflict.map(a => `${a} (${db[a]?.label ?? a})`).join(', ');
        return {
          type: 'conflict',
          message: `AI ${ai} (${spec.label}) cannot be combined with ${conflictLabels}`,
          affectedAis: [ai, ...conflict],
          suggestion: `Choose only one from this group — they represent the same measurement unit with different decimal positions`,
        };
      }
    }

    if (spec.requiresOneOf?.length) {
      const ok = spec.requiresOneOf.some(a => (counts.get(a) || 0) > 0);
      if (!ok) {
        const required = spec.requiresOneOf.map(a => `${a}${db[a] ? ` (${db[a].label})` : ''}`).join(', ');
        return {
          type: 'missingRequired',
          message: `AI ${ai} (${spec.label}) requires one of: ${required}`,
          affectedAis: [ai],
          suggestion: `Add one of the required AIs: ${spec.requiresOneOf.slice(0, 3).join(', ')}${spec.requiresOneOf.length > 3 ? '…' : ''}`,
        };
      }
    }
  }

  // Global structural rules
  for (const rule of GLOBAL_RULES) {
    if (rule.type === 'mutuallyExclusive') {
      const present = rule.aiList.filter(a => (counts.get(a) ?? 0) > 0);
      if (present.length > 1) {
        const labels = present.map(a => `${a}${db[a] ? ` (${db[a].label})` : ''}`).join(' and ');
        return {
          type: 'mutuallyExclusive',
          message: `${labels} are mutually exclusive — use only one`,
          affectedAis: present,
          suggestion: `Remove all but one of these AIs`,
        };
      }
    }
    if (rule.type === 'unique') {
      if ((counts.get(rule.ai) ?? 0) > 1) {
        return {
          type: 'duplicate',
          message: `AI ${rule.ai}${db[rule.ai] ? ` (${db[rule.ai].label})` : ''} may only appear once`,
          affectedAis: [rule.ai],
          suggestion: `Remove the duplicate AI ${rule.ai} row`,
        };
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
