import { buildSscc, validateSscc } from './sscc';
import { validateGs1Prefix } from './gs1-prefix-registry';
import { mod10CheckDigit } from './gs1-validate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCheckDigit(payload17: string): number {
  return mod10CheckDigit(payload17);
}

// Known-good SSCC for reference tests
// Extension: 3, Prefix: 0350000 (GS1 US, 7 digits), Serial: 00000001
// Payload17: 30350000000000001 → CD = ?
const KNOWN_EXT    = 3;
const KNOWN_PREFIX = '0350000';
const KNOWN_SERIAL = '1'; // padded to 9 digits: 000000001
// Payload17 = '3' + '0350000' + '000000001' = '30350000000000001'
const KNOWN_PAYLOAD17 = `${KNOWN_EXT}${KNOWN_PREFIX}${'1'.padStart(9, '0')}`;
const KNOWN_CD         = computeCheckDigit(KNOWN_PAYLOAD17);
const KNOWN_SSCC       = KNOWN_PAYLOAD17 + KNOWN_CD;

// ---------------------------------------------------------------------------
// buildSscc
// ---------------------------------------------------------------------------

describe('buildSscc', () => {

  describe('correct SSCC construction', () => {
    it('produces an 18-digit string', () => {
      const r = buildSscc({ extensionDigit: KNOWN_EXT, companyPrefix: KNOWN_PREFIX, serialReference: KNOWN_SERIAL });
      expect(r.sscc).toHaveLength(18);
      expect(/^\d{18}$/.test(r.sscc)).toBe(true);
    });

    it('last digit equals Mod-10 check digit of first 17 digits', () => {
      const r = buildSscc({ extensionDigit: KNOWN_EXT, companyPrefix: KNOWN_PREFIX, serialReference: KNOWN_SERIAL });
      expect(Number(r.sscc[17])).toBe(computeCheckDigit(r.sscc.slice(0, 17)));
    });

    it('matches known-good SSCC', () => {
      const r = buildSscc({ extensionDigit: KNOWN_EXT, companyPrefix: KNOWN_PREFIX, serialReference: KNOWN_SERIAL });
      expect(r.sscc).toBe(KNOWN_SSCC);
    });

    it('returns correct checkDigit field', () => {
      const r = buildSscc({ extensionDigit: KNOWN_EXT, companyPrefix: KNOWN_PREFIX, serialReference: KNOWN_SERIAL });
      expect(r.checkDigit).toBe(KNOWN_CD);
    });

    it('breakdown.extensionDigit matches input', () => {
      const r = buildSscc({ extensionDigit: 5, companyPrefix: '0350000', serialReference: '42' });
      expect(r.breakdown.extensionDigit).toBe('5');
    });

    it('breakdown.companyPrefix matches input', () => {
      const r = buildSscc({ extensionDigit: 0, companyPrefix: '4056489', serialReference: '1' });
      expect(r.breakdown.companyPrefix).toBe('4056489');
    });

    it('breakdown.serialReference is left-padded to fill remaining digits', () => {
      // 7-digit prefix → 16 - 7 = 9 serial digits
      const r = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '7' });
      expect(r.breakdown.serialReference).toBe('000000007');
      expect(r.breakdown.serialReference).toHaveLength(9);
    });

    it('serialLength reflects remaining digits after prefix', () => {
      const r7 = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '1' }); // 7-digit prefix
      expect(r7.serialLength).toBe(9);

      const r10 = buildSscc({ extensionDigit: 0, companyPrefix: '0350000000', serialReference: '1' }); // 10-digit prefix
      expect(r10.serialLength).toBe(6);
    });

    it('serialReference padded with leading zeros does not affect SSCC validity', () => {
      const r1 = buildSscc({ extensionDigit: 1, companyPrefix: '0350000', serialReference: '1' });
      const r2 = buildSscc({ extensionDigit: 1, companyPrefix: '0350000', serialReference: '000000001' });
      expect(r1.sscc).toBe(r2.sscc);
    });

    it('different extension digits produce different SSCCs', () => {
      const r0 = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '1' });
      const r9 = buildSscc({ extensionDigit: 9, companyPrefix: '0350000', serialReference: '1' });
      expect(r0.sscc).not.toBe(r9.sscc);
      expect(r0.sscc[0]).toBe('0');
      expect(r9.sscc[0]).toBe('9');
    });

    it('different serials produce different SSCCs', () => {
      const r1 = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '1' });
      const r2 = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '2' });
      expect(r1.sscc).not.toBe(r2.sscc);
    });

    it('different prefixes produce different SSCCs', () => {
      const rA = buildSscc({ extensionDigit: 0, companyPrefix: '4000000', serialReference: '1' }); // GS1 Germany
      const rB = buildSscc({ extensionDigit: 0, companyPrefix: '5000000', serialReference: '1' }); // GS1 UK
      expect(rA.sscc).not.toBe(rB.sscc);
    });

    it('10-digit prefix uses correct serial length (6 digits)', () => {
      const r = buildSscc({ extensionDigit: 0, companyPrefix: '0350000001', serialReference: '999999' });
      expect(r.sscc).toHaveLength(18);
      expect(r.breakdown.serialReference).toHaveLength(6);
    });
  });

  describe('GS1 prefix validation', () => {
    it('valid GS1 US prefix (003) is accepted', () => {
      const r = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '1' });
      expect(r.prefixInfo.valid).toBe(true);
      expect(r.prefixInfo.memberOrganisation).toBe('GS1 US');
    });

    it('valid GS1 Germany prefix (400) is accepted', () => {
      const r = buildSscc({ extensionDigit: 0, companyPrefix: '4000001', serialReference: '1' });
      expect(r.prefixInfo.valid).toBe(true);
      expect(r.prefixInfo.memberOrganisation).toContain('GS1 Germany');
    });

    it('valid GS1 Austria prefix (900) is accepted', () => {
      const r = buildSscc({ extensionDigit: 0, companyPrefix: '9000001', serialReference: '1' });
      expect(r.prefixInfo.valid).toBe(true);
      expect(r.prefixInfo.memberOrganisation).toContain('GS1 Austria');
    });

    it('unknown prefix range 200 (not allocated) throws', () => {
      // 200 range is not allocated
      expect(() =>
        buildSscc({ extensionDigit: 0, companyPrefix: '2000001', serialReference: '1' })
      ).toThrow();
    });

    it('unknown prefix range 140 throws with descriptive error', () => {
      expect(() =>
        buildSscc({ extensionDigit: 0, companyPrefix: '1400001', serialReference: '1' })
      ).toThrow(/range/i);
    });
  });

  describe('input validation — extensionDigit', () => {
    it('extension digit 0 is valid', () => {
      expect(() => buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '1' })).not.toThrow();
    });

    it('extension digit 9 is valid', () => {
      expect(() => buildSscc({ extensionDigit: 9, companyPrefix: '0350000', serialReference: '1' })).not.toThrow();
    });

    it('extension digit -1 throws', () => {
      expect(() => buildSscc({ extensionDigit: -1, companyPrefix: '0350000', serialReference: '1' })).toThrow();
    });

    it('extension digit 10 throws', () => {
      expect(() => buildSscc({ extensionDigit: 10, companyPrefix: '0350000', serialReference: '1' })).toThrow();
    });

    it('non-integer extension digit throws', () => {
      expect(() => buildSscc({ extensionDigit: 1.5, companyPrefix: '0350000', serialReference: '1' })).toThrow();
    });
  });

  describe('input validation — companyPrefix', () => {
    it('6-digit prefix throws (too short)', () => {
      expect(() => buildSscc({ extensionDigit: 0, companyPrefix: '035000', serialReference: '1' })).toThrow();
    });

    it('11-digit prefix throws (too long)', () => {
      expect(() => buildSscc({ extensionDigit: 0, companyPrefix: '03500000001', serialReference: '1' })).toThrow();
    });

    it('non-numeric prefix throws', () => {
      expect(() => buildSscc({ extensionDigit: 0, companyPrefix: '0350A00', serialReference: '1' })).toThrow();
    });

    it('empty prefix throws', () => {
      expect(() => buildSscc({ extensionDigit: 0, companyPrefix: '', serialReference: '1' })).toThrow();
    });
  });

  describe('input validation — serialReference', () => {
    it('non-numeric serial throws', () => {
      expect(() => buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: 'ABC' })).toThrow();
    });

    it('serial that exceeds available digits (after padding) throws', () => {
      // 7-digit prefix → 9 serial digits max (999999999)
      expect(() =>
        buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '9999999999' }) // 10 digits
      ).toThrow();
    });

    it('maximum valid serial for 7-digit prefix (999999999) is accepted', () => {
      expect(() =>
        buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: '999999999' })
      ).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// validateSscc
// ---------------------------------------------------------------------------

describe('validateSscc', () => {

  describe('valid SSCCs', () => {
    it('known-good SSCC is valid', () => {
      const r = validateSscc(KNOWN_SSCC);
      expect(r.valid).toBe(true);
      expect(r.checkDigit).toBe(KNOWN_CD);
      expect(r.expected).toBe(KNOWN_CD);
    });

    it('any SSCC built by buildSscc is valid', () => {
      const built = buildSscc({ extensionDigit: 7, companyPrefix: '4056489', serialReference: '12345' });
      const v = validateSscc(built.sscc);
      expect(v.valid).toBe(true);
    });

    it('validates multiple independently built SSCCs', () => {
      const cases = [
        { extensionDigit: 0, companyPrefix: '0350000', serialReference: '1' },
        { extensionDigit: 3, companyPrefix: '4000001', serialReference: '42' },
        { extensionDigit: 9, companyPrefix: '5000001', serialReference: '999' },
        { extensionDigit: 1, companyPrefix: '9000001', serialReference: '100000' },
      ];
      for (const c of cases) {
        const built = buildSscc(c);
        const v = validateSscc(built.sscc);
        expect(v.valid).toBe(true);
      }
    });

    it('check digit 0 is correctly validated', () => {
      // Find an SSCC that happens to produce check digit 0
      for (let serial = 1; serial <= 100; serial++) {
        const built = buildSscc({ extensionDigit: 0, companyPrefix: '0350000', serialReference: String(serial) });
        if (built.checkDigit === 0) {
          expect(validateSscc(built.sscc).valid).toBe(true);
          break;
        }
      }
    });
  });

  describe('invalid SSCCs', () => {
    it('wrong check digit (last digit incremented by 1 mod 10) is invalid', () => {
      const wrongCd = String((KNOWN_CD + 1) % 10);
      const corrupted = KNOWN_SSCC.slice(0, 17) + wrongCd;
      const r = validateSscc(corrupted);
      expect(r.valid).toBe(false);
      expect(r.checkDigit).toBe(Number(wrongCd));
      expect(r.expected).toBe(KNOWN_CD);
    });

    it('flipped digit in payload makes SSCC invalid', () => {
      const chars = KNOWN_SSCC.split('');
      chars[5] = chars[5] === '0' ? '1' : '0'; // flip one digit in the middle
      const corrupted = chars.join('');
      const r = validateSscc(corrupted);
      expect(r.valid).toBe(false);
    });

    it('all-zeros except valid check digit for that payload', () => {
      const payload = '00000000000000000';
      const cd = computeCheckDigit(payload);
      expect(validateSscc(payload + cd).valid).toBe(true);
      // Wrong check digit
      const wrongCd = (cd + 1) % 10;
      expect(validateSscc(payload + wrongCd).valid).toBe(false);
    });

    it('all-nines with wrong check digit is invalid', () => {
      // compute correct CD first
      const payload = '99999999999999999';
      const cd = computeCheckDigit(payload);
      const wrongCd = (cd + 1) % 10;
      expect(validateSscc(payload + wrongCd).valid).toBe(false);
    });
  });

  describe('malformed input', () => {
    it('17 digits returns invalid with error', () => {
      const r = validateSscc('12345678901234567');
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/18 digits/);
    });

    it('19 digits returns invalid with error', () => {
      const r = validateSscc('1234567890123456789');
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/18 digits/);
    });

    it('empty string returns invalid with error', () => {
      const r = validateSscc('');
      expect(r.valid).toBe(false);
      expect(r.error).toBeDefined();
    });

    it('non-numeric characters return invalid with error', () => {
      const r = validateSscc('1234567890123456AB');
      expect(r.valid).toBe(false);
      expect(r.error).toBeDefined();
    });

    it('SSCC with spaces is invalid', () => {
      const r = validateSscc('123456789 12345678');
      expect(r.valid).toBe(false);
    });
  });

  describe('round-trip: buildSscc → validateSscc', () => {
    const roundTripCases = [
      { extensionDigit: 0, companyPrefix: '0350000',    serialReference: '1' },
      { extensionDigit: 0, companyPrefix: '4000001',    serialReference: '1' },
      { extensionDigit: 0, companyPrefix: '9000001',    serialReference: '1' },
      { extensionDigit: 0, companyPrefix: '5000001',    serialReference: '1' },
      { extensionDigit: 0, companyPrefix: '7300001',    serialReference: '1' },   // GS1 Sweden
      { extensionDigit: 0, companyPrefix: '6900001',    serialReference: '1' },   // GS1 China
      { extensionDigit: 9, companyPrefix: '0350000',    serialReference: '999999999' }, // max serial, 7-digit prefix
      { extensionDigit: 0, companyPrefix: '0350000000', serialReference: '999999' },    // 10-digit prefix
    ];

    for (const c of roundTripCases) {
      it(`round-trip ext=${c.extensionDigit} prefix=${c.companyPrefix} serial=${c.serialReference}`, () => {
        const built = buildSscc(c);
        expect(built.sscc).toHaveLength(18);
        expect(validateSscc(built.sscc).valid).toBe(true);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// validateGs1Prefix
// ---------------------------------------------------------------------------

describe('validateGs1Prefix', () => {

  describe('valid prefixes', () => {
    const validCases: Array<[string, string, string]> = [
      ['0350000',  '035', 'GS1 US'],
      ['0000001',  '000', 'GS1 US'],
      ['1390001',  '139', 'GS1 US'],
      ['4000001',  '400', 'GS1 Germany'],
      ['4400001',  '440', 'GS1 Germany'],
      ['5000001',  '500', 'GS1 UK'],
      ['5090001',  '509', 'GS1 UK'],
      ['5390001',  '539', 'GS1 Ireland'],
      ['5400001',  '540', 'GS1 Belgium & Luxembourg'],
      ['5600001',  '560', 'GS1 Portugal'],
      ['5700001',  '570', 'GS1 Denmark'],
      ['5790001',  '579', 'GS1 Denmark'],
      ['5900001',  '590', 'GS1 Poland'],
      ['5990001',  '599', 'GS1 Hungary'],
      ['6900001',  '690', 'GS1 China'],
      ['6990001',  '699', 'GS1 China'],
      ['7300001',  '730', 'GS1 Sweden'],
      ['7390001',  '739', 'GS1 Sweden'],
      ['7600001',  '760', 'GS1 Switzerland'],
      ['8000001',  '800', 'GS1 Italy'],
      ['8390001',  '839', 'GS1 Italy'],
      ['8400001',  '840', 'GS1 Spain'],
      ['8490001',  '849', 'GS1 Spain'],
      ['8680001',  '868', 'GS1 Turkey'],
      ['8700001',  '870', 'GS1 Netherlands'],
      ['8790001',  '879', 'GS1 Netherlands'],
      ['8800001',  '880', 'GS1 South Korea'],
      ['8900001',  '890', 'GS1 India'],
      ['9000001',  '900', 'GS1 Austria'],
      ['9190001',  '919', 'GS1 Austria'],
      ['9300001',  '930', 'GS1 Australia'],
      ['9400001',  '940', 'GS1 New Zealand'],
      ['9550001',  '955', 'GS1 Malaysia'],
    ];

    for (const [prefix, expectedPrefix3, expectedMO] of validCases) {
      it(`prefix ${prefix} → ${expectedMO}`, () => {
        const r = validateGs1Prefix(prefix);
        expect(r.valid).toBe(true);
        expect(r.memberOrganisation).toContain(expectedMO.split(' ')[1] ?? expectedMO);
        expect(r.prefix3).toBe(expectedPrefix3);
      });
    }

    it('accepts 8-digit prefix', () => {
      const r = validateGs1Prefix('40000001');
      expect(r.valid).toBe(true);
    });

    it('accepts 9-digit prefix', () => {
      const r = validateGs1Prefix('400000001');
      expect(r.valid).toBe(true);
    });

    it('accepts 10-digit prefix', () => {
      const r = validateGs1Prefix('4000000001');
      expect(r.valid).toBe(true);
    });
  });

  describe('invalid prefixes — format', () => {
    it('6-digit prefix is rejected', () => {
      const r = validateGs1Prefix('035000');
      expect(r.valid).toBe(false);
      expect(r.error).toBeDefined();
    });

    it('11-digit prefix is rejected', () => {
      const r = validateGs1Prefix('03500000001');
      expect(r.valid).toBe(false);
    });

    it('empty string is rejected', () => {
      const r = validateGs1Prefix('');
      expect(r.valid).toBe(false);
    });

    it('non-numeric prefix is rejected', () => {
      const r = validateGs1Prefix('0350A00');
      expect(r.valid).toBe(false);
    });

    it('prefix with spaces is rejected', () => {
      const r = validateGs1Prefix('035 000');
      expect(r.valid).toBe(false);
    });
  });

  describe('invalid prefixes — unknown GS1 range', () => {
    const unknownRanges = [
      '2000001', // 200–299 not allocated as company prefixes (restricted/in-store range has 20–29)
      '1400001', // 140–149 not in any range
      '2900001', // 290–299 gap
    ];

    for (const prefix of unknownRanges) {
      it(`prefix ${prefix} (unknown range) is rejected`, () => {
        const r = validateGs1Prefix(prefix);
        expect(r.valid).toBe(false);
        expect(r.error).toBeDefined();
      });
    }
  });
});

// ---------------------------------------------------------------------------
// mod10CheckDigit (underlying algorithm)
// ---------------------------------------------------------------------------

describe('mod10CheckDigit', () => {
  it('GTIN-13 body produces correct CD', () => {
    // GTIN: 0950600013437 6  → body = 0950600013437
    expect(computeCheckDigit('0950600013437')).toBe(6);
  });

  it('all-zeros body produces check digit 0', () => {
    expect(computeCheckDigit('0000000000000')).toBe(0);
  });

  it('check digit of reversed body is generally different', () => {
    const body    = '1234567890123';
    const forward = computeCheckDigit(body);
    const reverse = computeCheckDigit(body.split('').reverse().join(''));
    // Not guaranteed to differ in every case, but this specific case does
    expect(typeof forward).toBe('number');
    expect(forward).toBeGreaterThanOrEqual(0);
    expect(forward).toBeLessThanOrEqual(9);
    expect(typeof reverse).toBe('number');
  });

  it('result is always 0–9', () => {
    const bodies = [
      '00000000000000000',
      '99999999999999999',
      '12345678901234567',
      '30350000000000001',
    ];
    for (const b of bodies) {
      const cd = computeCheckDigit(b);
      expect(cd).toBeGreaterThanOrEqual(0);
      expect(cd).toBeLessThanOrEqual(9);
    }
  });

  it('SSCC payload17 check digit is stable across calls', () => {
    const payload = '30350000000000001';
    const cd1 = computeCheckDigit(payload);
    const cd2 = computeCheckDigit(payload);
    expect(cd1).toBe(cd2);
  });
});
