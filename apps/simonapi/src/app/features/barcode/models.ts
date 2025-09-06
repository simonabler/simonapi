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

// Types aligned with backend registry serialization
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
  if (!spec) return null; // unknown → no client-side validation
  // Special cases like backend normalization rules
  if (ai === '01') { // GTIN: allow 13 or 14 digits (check digit auto if 13)
    if (!/^\d{13,14}$/.test(value)) return '13–14 Ziffern erwartet (Prüfziffer automatisch)';
    return null;
  }
  if (ai === '00') { // SSCC: allow 17 or 18 digits
    if (!/^\d{17,18}$/.test(value)) return '17–18 Ziffern erwartet (Prüfziffer automatisch)';
    return null;
  }
  if (!spec.pattern.test(value)) return 'Wert entspricht nicht dem geforderten Muster';
  return null;
}

export function validateCombination(db: Record<string, AiSpec>, items: Array<{ ai: string; value: string }>): string | null {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.ai, (counts.get(it.ai) || 0) + 1);
  for (const [ai, cnt] of counts) {
    const spec = db[ai];
    if (!spec) continue;
    if (cnt > (spec.maxOccurrences ?? 1)) return `AI ${ai} kommt ${cnt}× vor (max ${(spec.maxOccurrences ?? 1)})`;
  }
  for (const [ai] of counts) {
    const spec = db[ai];
    if (!spec) continue;
    if (spec.notTogetherWith?.length) {
      const conflict = spec.notTogetherWith.filter(a => (counts.get(a) || 0) > 0);
      if (conflict.length) return `AI ${ai} darf nicht zusammen mit ${conflict.join(', ')} verwendet werden`;
    }
    if (spec.requiresOneOf?.length) {
      const ok = spec.requiresOneOf.some(a => (counts.get(a) || 0) > 0);
      if (!ok) return `AI ${ai} erfordert eines von [${spec.requiresOneOf.join(', ')}]`;
    }
    if (spec.requiresGroups?.length) {
      for (const group of spec.requiresGroups) {
        const ok = group.some(a => (counts.get(a) || 0) > 0);
        if (!ok) return `AI ${ai} erfordert eines aus der Gruppe [${group.join(', ')}]`;
      }
    }
  }
  return null;
}
