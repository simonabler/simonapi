import { getAiSpec, validateAiByRegex, validateCombination } from './gs1-ai-registry';

export function isNumericString(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

export function isPrintableAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c > 126) return false;
  }
  return s.length > 0;
}

export function mod10CheckDigit(body: string): number {
  // GS1 Mod10: right-to-left, weights 3,1 alternating starting with 3
  let sum = 0;
  let weight = 3;
  for (let i = body.length - 1; i >= 0; i--) {
    const d = body.charCodeAt(i) - 48;
    sum += d * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const cd = (10 - (sum % 10)) % 10;
  return cd;
}

export function validateYYMMDD(value: string): boolean {
  if (!/^[0-9]{6}$/.test(value)) return false;
  const yy = parseInt(value.slice(0, 2), 10);
  const mm = parseInt(value.slice(2, 4), 10);
  const dd = parseInt(value.slice(4, 6), 10);
  if (mm < 1 || mm > 12) return false;
  const year = 2000 + yy;
  const daysInMonth = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return false;
  return true;
}

export function normalizeGtin(value: string): string {
  if (!isNumericString(value)) throw new Error('AI 01 only numeric characters allowed');
  if (value.length === 13) {
    const cd = mod10CheckDigit(value);
    return value + cd.toString();
  }
  if (value.length === 14) {
    const body = value.slice(0, 13);
    const cd = mod10CheckDigit(body);
    if (cd !== Number(value[13])) throw new Error('AI 01 check digit invalid');
    return value;
  }
  throw new Error('AI 01 must be 13 or 14 digits');
}

export function normalizeSscc(value: string): string {
  if (!isNumericString(value)) throw new Error('AI 00 only numeric characters allowed');
  if (value.length === 17) {
    const cd = mod10CheckDigit(value);
    return value + cd.toString();
  }
  if (value.length === 18) {
    const body = value.slice(0, 17);
    const cd = mod10CheckDigit(body);
    if (cd !== Number(value[17])) throw new Error('AI 00 check digit invalid');
    return value;
  }
  throw new Error('AI 00 must be 17 or 18 digits');
}

export function validateAndNormalizeGs1Item(ai: string, value: string): string {
  const spec = getAiSpec(ai);
  if (!spec) throw new Error(`AI ${ai} not supported`);

  // Special cases with check digits
  if (ai === '01') return normalizeGtin(value);
  if (ai === '00') return normalizeSscc(value);

  // Otherwise validate via regex spec registry (covers dates, numeric, ASCII etc.)
  validateAiByRegex(ai, value);
  return value;
}

export function buildGs1Text(items: Array<{ ai: string; value: string }>): string {
  // Validate and normalize each item, then build (AI)Value string for bwip-js parse=true
  const parts: string[] = [];
  for (const it of items) {
    const ai = String(it.ai);
    const val = String(it.value);
    const norm = validateAndNormalizeGs1Item(ai, val);
    parts.push(`(${ai})${norm}`);
  }
  // Combination validation after individual normalization
  validateCombination(items.map(x => ({ ai: String(x.ai), value: String(x.value) })));
  return parts.join('');
}
