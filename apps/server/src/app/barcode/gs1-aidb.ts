export type AiSpec = {
  ai: string;
  label: string;
  fixed?: number; // fixed length of value (digits for numeric)
  min?: number;
  max?: number;
  numeric?: boolean;
  dateYYMMDD?: boolean; // value must be YYMMDD
  printableAscii?: boolean; // printable ASCII only
  hint?: string;
};

// Minimal AI database to support requested validations
// Extendable for future AIs
export const AI_DB: Record<string, AiSpec> = {
  // SSCC
  '00': {
    ai: '00',
    label: 'SSCC',
    fixed: 18, // includes check digit
    numeric: true,
    hint: 'SSCC must be 18 digits (Mod10 check).',
  },
  // GTIN
  '01': {
    ai: '01',
    label: 'GTIN',
    fixed: 14, // includes check digit
    numeric: true,
    hint: 'GTIN must be 14 digits (Mod10 check).',
  },
  // Production date
  '11': { ai: '11', label: 'Production date', fixed: 6, numeric: true, dateYYMMDD: true },
  // Best before
  '15': { ai: '15', label: 'Best before date', fixed: 6, numeric: true, dateYYMMDD: true },
  // Expiration date
  '17': { ai: '17', label: 'Expiration date', fixed: 6, numeric: true, dateYYMMDD: true },
  // Batch/Lot
  '10': { ai: '10', label: 'Batch/Lot', min: 1, max: 20, printableAscii: true },
  // Serial
  '21': { ai: '21', label: 'Serial', min: 1, max: 20, printableAscii: true },
  // Additional product identification
  '240': { ai: '240', label: 'Additional ID', min: 1, max: 30, printableAscii: true },
  // Customer part number
  '241': { ai: '241', label: 'Customer Part', min: 1, max: 30, printableAscii: true },
  // Price (variation of 392x). Here: numeric 1..15 as requested.
  '3922': { ai: '3922', label: 'Price', min: 1, max: 15, numeric: true },
};

