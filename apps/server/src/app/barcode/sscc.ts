import { mod10CheckDigit } from './gs1-validate';
import { validateGs1Prefix, PrefixLookupResult } from './gs1-prefix-registry';

export interface SsccBuildRequest {
  extensionDigit:  number;   // 0–9
  companyPrefix:   string;   // 7–10 digits
  serialReference: string;   // numeric, auto-padded
}

export interface SsccBreakdown {
  extensionDigit:  string;
  companyPrefix:   string;
  serialReference: string;
  checkDigit:      string;
}

export interface SsccBuildResult {
  sscc:              string;
  checkDigit:        number;
  breakdown:         SsccBreakdown;
  prefixInfo:        PrefixLookupResult;
  serialLength:      number;
}

export interface SsccValidateResult {
  valid:       boolean;
  checkDigit:  number;
  expected:    number;
  breakdown?:  SsccBreakdown;
  error?:      string;
}

/** Builds an 18-digit SSCC from its components and computes the check digit. */
export function buildSscc(req: SsccBuildRequest): SsccBuildResult {
  const { extensionDigit, companyPrefix, serialReference } = req;

  if (!Number.isInteger(extensionDigit) || extensionDigit < 0 || extensionDigit > 9)
    throw new Error('extensionDigit must be a single integer digit (0–9)');

  const prefixInfo = validateGs1Prefix(companyPrefix);
  if (!prefixInfo.valid)
    throw new Error(prefixInfo.error ?? 'Invalid GS1 Company Prefix');

  // 17 payload digits = 1 extension + prefix + serial; last digit is check digit
  const serialLength = 16 - companyPrefix.length;
  if (serialLength < 1)
    throw new Error('companyPrefix too long — no room for serial reference');

  if (!/^\d+$/.test(serialReference))
    throw new Error('serialReference must be numeric');

  const serial = serialReference.padStart(serialLength, '0');
  if (serial.length > serialLength)
    throw new Error(`serialReference too long — max ${serialLength} digits for this prefix length`);

  const payload17 = `${extensionDigit}${companyPrefix}${serial}`;
  const cd = mod10CheckDigit(payload17);
  const sscc = payload17 + cd;

  return {
    sscc,
    checkDigit: cd,
    serialLength,
    prefixInfo,
    breakdown: {
      extensionDigit:  String(extensionDigit),
      companyPrefix,
      serialReference: serial,
      checkDigit:      String(cd),
    },
  };
}

/** Validates a complete 18-digit SSCC by verifying its check digit. */
export function validateSscc(sscc: string): SsccValidateResult {
  if (!/^\d{18}$/.test(sscc))
    return { valid: false, checkDigit: -1, expected: -1, error: 'SSCC must be exactly 18 digits' };

  const body     = sscc.slice(0, 17);
  const given    = Number(sscc[17]);
  const expected = mod10CheckDigit(body);

  return { valid: given === expected, checkDigit: given, expected };
}
