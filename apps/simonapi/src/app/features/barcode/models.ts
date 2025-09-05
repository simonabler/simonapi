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

export type AiSpec = {
  ai: string;
  label: string;
  fixed?: number;
  min?: number;
  max?: number;
  numeric?: boolean;
  dateYYMMDD?: boolean;
  printableAscii?: boolean;
  hint?: string;
};

export const AI_DB: Record<string, AiSpec> = {
  '00': { ai: '00', label: 'SSCC', fixed: 18, numeric: true, hint: '18 digits (Mod10 check).' },
  '01': { ai: '01', label: 'GTIN', fixed: 14, numeric: true, hint: '13 digits allowed (check digit auto).' },
  '11': { ai: '11', label: 'Production date', fixed: 6, numeric: true, dateYYMMDD: true },
  '15': { ai: '15', label: 'Best before', fixed: 6, numeric: true, dateYYMMDD: true },
  '17': { ai: '17', label: 'Expiration', fixed: 6, numeric: true, dateYYMMDD: true },
  '10': { ai: '10', label: 'Batch/Lot', min: 1, max: 20, printableAscii: true },
  '21': { ai: '21', label: 'Serial', min: 1, max: 20, printableAscii: true },
  '240': { ai: '240', label: 'Additional ID', min: 1, max: 30, printableAscii: true },
  '241': { ai: '241', label: 'Customer Part', min: 1, max: 30, printableAscii: true },
  '3922': { ai: '3922', label: 'Price', min: 1, max: 15, numeric: true },
};

export function validateAiValue(ai: string, value: string): string | null {
  const spec = AI_DB[ai];
  if (!spec) return null; // unknown → no client-side validation
  if (spec.numeric) {
    if (!/^\d+$/.test(value)) return 'Nur Ziffern erlaubt';
  }
  if (spec.dateYYMMDD) {
    if (!/^\d{6}$/.test(value)) return 'Format YYMMDD erwartet';
    // simple calendar sanity check
    const yy = parseInt(value.slice(0, 2), 10);
    const mm = parseInt(value.slice(2, 4), 10);
    const dd = parseInt(value.slice(4, 6), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return 'Ungültiges Datum';
  }
  if (spec.printableAscii) {
    for (const ch of value) {
      const c = ch.charCodeAt(0);
      if (c < 32 || c > 126) return 'Nur druckbare ASCII-Zeichen erlaubt';
    }
  }
  // Special-case GTIN (01): allow 13..14
  if (ai === '01') {
    if (!/^\d{13,14}$/.test(value)) return '13–14 Ziffern erwartet (Prüfziffer automatisch)';
    return null;
  }
  if (spec.fixed && value.length !== spec.fixed) return `Genau ${spec.fixed} Zeichen erwartet`;
  if (spec.min && value.length < spec.min) return `Mindestens ${spec.min} Zeichen`;
  if (spec.max && value.length > spec.max) return `Maximal ${spec.max} Zeichen`;
  return null;
}
