/**
 * GS1 Digital Link (ISO/IEC 18975) utilities.
 *
 * Converts a set of GS1 AI items into a canonical Digital Link URL of the form:
 *   https://id.gs1.org/{primaryAI}/{primaryValue}/{qualifierAI}/{qualifierValue}/...
 *
 * Spec reference: https://ref.gs1.org/standards/digital-link/
 */

/** AIs that can serve as the primary identification key in a Digital Link. */
const PRIMARY_AI_ORDER = [
  '01',   // GTIN
  '00',   // SSCC
  '253',  // GDTI
  '255',  // GCN
  '401',  // GINC
  '402',  // GSIN
  '414',  // GLN
  '417',  // PARTY GLN
  '8003', // GRAI
  '8004', // GIAI
  '8006', // ITIP
  '8010', // CPID
  '8013', // GMN
  '8017', // GSRN – PROVIDER
  '8018', // GSRN – RECIPIENT
];

export interface DigitalLinkResult {
  /** Full canonical URL. */
  url: string;
  /** The primary identification AI used (e.g. "01"). */
  primaryAi: string;
  /** Value of the primary AI. */
  primaryValue: string;
  /** Qualifier AI/value pairs appended after the primary key. */
  qualifiers: Array<{ ai: string; value: string }>;
}

/**
 * Convert an array of GS1 AI items to a GS1 Digital Link URL.
 *
 * @param items   Validated AI items (values must already be normalised, e.g. GTIN with check digit).
 * @param baseUrl Base URL for the resolver — defaults to the canonical GS1 resolver.
 * @throws        When no recognised primary key AI is present in the items.
 */
export function toDigitalLink(
  items: Array<{ ai: string; value: string }>,
  baseUrl = 'https://id.gs1.org',
): DigitalLinkResult {
  // Find the highest-priority primary AI present in the item list.
  const primaryAi = PRIMARY_AI_ORDER.find(a => items.some(i => i.ai === a));
  if (!primaryAi) {
    throw new Error(
      `No primary identification AI found. ` +
      `Expected one of: ${PRIMARY_AI_ORDER.slice(0, 6).join(', ')} … ` +
      `(see GS1 Digital Link spec for full list)`,
    );
  }

  const primaryItem = items.find(i => i.ai === primaryAi)!;
  const qualifiers = items.filter(i => i.ai !== primaryAi);

  // Build path segments: /primaryAI/primaryValue[/qualifierAI/qualifierValue ...]
  const segments = [`/${primaryAi}/${encodeURIComponent(primaryItem.value)}`];
  for (const q of qualifiers) {
    segments.push(`/${q.ai}/${encodeURIComponent(q.value)}`);
  }

  const url = baseUrl.replace(/\/$/, '') + segments.join('');

  return {
    url,
    primaryAi,
    primaryValue: primaryItem.value,
    qualifiers,
  };
}

/**
 * Parse a GS1 Digital Link URL back into AI items.
 * Handles both path-only links and full URLs.
 *
 * @throws  When the URL structure cannot be parsed as a Digital Link.
 */
export function fromDigitalLink(input: string): Array<{ ai: string; value: string }> {
  // Strip scheme + host if present, keep the path
  let path: string;
  try {
    path = new URL(input).pathname;
  } catch {
    // Not a full URL — assume it's already a path
    path = input;
  }

  // Remove leading slash and split on remaining slashes
  const parts = path.replace(/^\//, '').split('/');
  if (parts.length < 2 || parts.length % 2 !== 0) {
    throw new Error(
      `Invalid GS1 Digital Link path "${path}": ` +
      `expected alternating AI/value pairs (even number of segments)`,
    );
  }

  const items: Array<{ ai: string; value: string }> = [];
  for (let i = 0; i < parts.length; i += 2) {
    items.push({ ai: parts[i], value: decodeURIComponent(parts[i + 1]) });
  }
  return items;
}
