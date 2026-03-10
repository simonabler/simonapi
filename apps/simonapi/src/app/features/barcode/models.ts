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
// Fix #2 — Human-readable format hints derived from the GS1 regex patterns
// ---------------------------------------------------------------------------

/**
 * Translates a compiled GS1 regex into a short, user-friendly description.
 *
 * Examples:
 *   /^(\d{14})$/              → "Exactly 14 digits"
 *   /^(\d{1,20})$/            → "1–20 digits"
 *   /^(\d{2}(?:0\d|1[0-2])…)$/ → "Date: YYMMDD  (e.g. 251231 = 31 Dec 2025)"
 *   /^([!%-?A-Z_a-z\x22]{1,20})$/ → "1–20 characters (A–Z, a–z, 0–9 + GS1 special chars)"
 */
export function patternToFormatHint(pattern: RegExp): string {
  const src = pattern.source
    .replace(/^\^/, '').replace(/\$$/, '')
    .replace(/^\(/, '').replace(/\)$/, '');

  // Date: YYMMDD
  if (src.includes('0\\d|1[0-2]') || src.includes('(?:0\\d|1[0-2])')) {
    return 'Date: YYMMDD  (e.g. 251231 = 31 Dec 2025)';
  }
  // Fixed-length digits
  const fixedD = src.match(/^\\d\{(\d+)\}$/);
  if (fixedD) return `Exactly ${fixedD[1]} digit${+fixedD[1] !== 1 ? 's' : ''}`;

  // Variable-length digits
  const varD = src.match(/^\\d\{(\d+),(\d+)\}$/);
  if (varD) return `${varD[1]}–${varD[2]} digits`;

  // Optional digits (min 0)
  const optD = src.match(/^\\d\{0,(\d+)\}$/);
  if (optD) return `Up to ${optD[1]} digits`;

  // GS1 alphanumeric charset  [!%-?A-Z_a-z\x22]
  if (src.includes('[!%-?A-Z_a-z') || src.includes('[!%-?A-Z')) {
    const len = src.match(/\{(\d+),(\d+)\}/) ?? src.match(/\{(\d+)\}/);
    const lenStr = len ? (len[2] ? `${len[1]}–${len[2]}` : `${len[1]}`) : '?';
    return `${lenStr} characters (A–Z, a–z, 0–9 + GS1 special chars: ! # $ % & ' ( ) * + , - . / : ; < = > ? _)`;
  }

  // Fallback — show simplified source
  return `Format: ${src.replace(/\\/g, '').replace(/[()]/g, '').substring(0, 48)}`;
}

/**
 * Returns a representative example value for a given AI code.
 * Used as the input placeholder so the user immediately sees what's expected.
 */
export function aiPlaceholder(ai: string): string {
  const ex: Record<string, string> = {
    '00': '340123456789012345',
    '01': '09506000134370',
    '02': '09506000134370',
    '10': 'BATCH42',
    '11': '251231', '12': '251231', '13': '251231',
    '15': '260630', '16': '260630', '17': '260630',
    '20': '01',
    '21': 'SN-0042',
    '22': 'CPV-A1',
    '30': '100',
    '37': '6',
    '400': 'PO-2025-001',
    '401': 'CONSIGNMENT-001',
    '410': '4012345000009',
    '414': '4012345000009',
    '415': '4012345000009',
    '420': '1234',
    '8006': '09506000134370012',
    '8012': 'SFWV1.0',
    '8020': 'PAYREF-001',
  };
  return ex[ai] ?? '';
}

// ---------------------------------------------------------------------------
// Fix #2 — validateAiValue: replace opaque "required pattern" with a
//           human-readable description of what the field actually expects.
// ---------------------------------------------------------------------------

export function validateAiValue(db: Record<string, AiSpec>, ai: string, value: string): string | null {
  const spec = db[ai];
  if (!spec) return null; // unknown AI → let backend decide

  if (ai === '01') {
    if (!/^\d{13,14}$/.test(value)) return '13–14 digits required — check digit is auto-computed';
    return null;
  }
  if (ai === '00') {
    if (!/^\d{17,18}$/.test(value)) return '17–18 digits required — check digit is auto-computed';
    return null;
  }
  if (!spec.pattern.test(value)) {
    return `Invalid value — expected: ${patternToFormatHint(spec.pattern)}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fix #1 & #3 — validateCombination: self-reference bug + structured errors
//
// Root cause of "AI 3332 cannot be used together with 3332":
//   GS1 registry data lists an AI inside its own notTogetherWith because the
//   whole sibling group (e.g. 3330–3335) is enumerated, including itself.
//   This means "use exactly one from this group" but was read as a conflict
//   with itself.  Fix: exclude self (a !== ai) before conflict check.
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

/** Structured error returned by validateCombinationDetailed(). */
export interface CombinationError {
  /** Category — drives the icon shown in the UI. */
  type: 'duplicate' | 'conflict' | 'missingRequired' | 'mutuallyExclusive';
  /** Human-readable sentence (shown as the main error text). */
  message: string;
  /** AI codes involved — used to highlight the affected row(s). */
  affectedAis: string[];
  /** Optional one-liner that tells the user how to fix it. */
  suggestion?: string;
}

/** Thin wrapper kept for backward-compat (returns string | null). */
export function validateCombination(
  db: Record<string, AiSpec>,
  items: Array<{ ai: string; value: string }>,
): string | null {
  const err = validateCombinationDetailed(db, items);
  return err ? err.message : null;
}

/** Full validation — returns a structured CombinationError or null. */
export function validateCombinationDetailed(
  db: Record<string, AiSpec>,
  items: Array<{ ai: string; value: string }>,
): CombinationError | null {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.ai, (counts.get(it.ai) || 0) + 1);

  // ── Per-AI registry constraints ──────────────────────────────────────────

  // Duplicate check
  for (const [ai, cnt] of counts) {
    const spec = db[ai];
    if (!spec) continue;
    if (cnt > (spec.maxOccurrences ?? 1)) {
      return {
        type: 'duplicate',
        message: `AI ${ai} (${spec.label}) appears ${cnt}× — max ${spec.maxOccurrences ?? 1} allowed`,
        affectedAis: [ai],
        suggestion: `Remove the duplicate "${ai}" row`,
      };
    }
  }

  // notTogetherWith — FIX #1: skip self (a !== ai) to avoid the false-positive
  //   "AI 3332 cannot be used together with 3332" caused by registry data that
  //   lists the AI's own code inside its notTogetherWith sibling group.
  for (const [ai] of counts) {
    const spec = db[ai];
    if (!spec) continue;

    if (spec.notTogetherWith?.length) {
      const conflict = spec.notTogetherWith.filter(a => a !== ai && (counts.get(a) ?? 0) > 0);
      if (conflict.length) {
        const conflictLabels = conflict.map(a => `${a}${db[a] ? ` (${db[a].label})` : ''}`).join(', ');
        return {
          type: 'conflict',
          message: `AI ${ai} (${spec.label}) cannot be combined with ${conflictLabels}`,
          affectedAis: [ai, ...conflict],
          suggestion: 'These AIs represent the same measurement with different decimal places — keep only one',
        };
      }
    }

    if (spec.requiresOneOf?.length) {
      const ok = spec.requiresOneOf.some(a => (counts.get(a) ?? 0) > 0);
      if (!ok) {
        const opts = spec.requiresOneOf.map(a => `${a}${db[a] ? ` (${db[a].label})` : ''}`).join(', ');
        return {
          type: 'missingRequired',
          message: `AI ${ai} (${spec.label}) requires one of: ${opts}`,
          affectedAis: [ai],
          suggestion: `Add one of the required AIs: ${spec.requiresOneOf.slice(0, 3).join(', ')}${spec.requiresOneOf.length > 3 ? '…' : ''}`,
        };
      }
    }
  }

  // ── Global structural rules ───────────────────────────────────────────────
  for (const rule of GLOBAL_RULES) {
    if (rule.type === 'mutuallyExclusive') {
      const present = rule.aiList.filter(a => (counts.get(a) ?? 0) > 0);
      if (present.length > 1) {
        const labels = present.map(a => `${a}${db[a] ? ` (${db[a].label})` : ''}`).join(' and ');
        return {
          type: 'mutuallyExclusive',
          message: `${labels} are mutually exclusive — use only one`,
          affectedAis: present,
          suggestion: 'Remove all but one of these AIs',
        };
      }
    }
    if (rule.type === 'unique') {
      if ((counts.get(rule.ai) ?? 0) > 1) {
        return {
          type: 'duplicate',
          message: `AI ${rule.ai}${db[rule.ai] ? ` (${db[rule.ai].label})` : ''} may only appear once`,
          affectedAis: [rule.ai],
          suggestion: `Remove the duplicate "${rule.ai}" row`,
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
