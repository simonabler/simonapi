import { buildGs1Text, validateYYMMDD, validateAndNormalizeGs1Item } from './gs1-validate';

describe('GS1 Validation', () => {
  it('GTIN (01): 13-digit -> appends check digit', () => {
    const items = [
      { ai: '01', value: '0950600013437' },
      { ai: '10', value: 'BATCH42' },
      { ai: '17', value: '251231' },
    ];
    const txt = buildGs1Text(items);
    expect(txt).toContain('(01)09506000134376');
  });

  it('GTIN (01): 14-digit wrong check -> error', () => {
    expect(() => validateAndNormalizeGs1Item('01', '09506000134370')).toThrow();
  });

  it('GTIN (01): 14-digit correct check -> ok', () => {
    expect(validateAndNormalizeGs1Item('01', '09506000134376')).toBe('09506000134376');
  });

  it('SSCC (00): 17-digit -> appends check digit', () => {
    const norm = validateAndNormalizeGs1Item('00', '12345678901234567');
    expect(norm).toHaveLength(18);
    expect(norm.startsWith('12345678901234567')).toBe(true);
  });

  it('SSCC (00): 18-digit valid -> ok', () => {
    const valid = validateAndNormalizeGs1Item('00', '12345678901234567');
    expect(validateAndNormalizeGs1Item('00', valid)).toBe(valid);
  });

  // --- validateYYMMDD standalone helper ---

  it('validateYYMMDD: standalone helper', () => {
    expect(validateYYMMDD('251231')).toBe(true);
    expect(validateYYMMDD('250229')).toBe(false); // 2025 not a leap year
    expect(validateYYMMDD('240229')).toBe(true);  // 2024 is a leap year
    expect(validateYYMMDD('250000')).toBe(false); // month 00 invalid
    expect(validateYYMMDD('251332')).toBe(false); // month 13 invalid
  });

  // --- Semantic date validation wired into validateAndNormalizeGs1Item ---

  it('Date AIs (17/15/11/12/13/16): invalid calendar date rejected', () => {
    expect(() => validateAndNormalizeGs1Item('17', '250229')).toThrow(/not a valid YYMMDD/);
    expect(() => validateAndNormalizeGs1Item('15', '251340')).toThrow(/not a valid YYMMDD/);
    expect(() => validateAndNormalizeGs1Item('11', '250631')).toThrow(/not a valid YYMMDD/);
    expect(() => validateAndNormalizeGs1Item('12', '250000')).toThrow(/not a valid YYMMDD/);
    expect(() => validateAndNormalizeGs1Item('13', '251332')).toThrow(/not a valid YYMMDD/);
    expect(() => validateAndNormalizeGs1Item('16', '250229')).toThrow(/not a valid YYMMDD/);
  });

  it('Date AIs: valid calendar dates accepted', () => {
    expect(validateAndNormalizeGs1Item('17', '251231')).toBe('251231');
    expect(validateAndNormalizeGs1Item('15', '240229')).toBe('240229'); // 2024 leap year
    expect(validateAndNormalizeGs1Item('11', '250101')).toBe('250101');
    expect(validateAndNormalizeGs1Item('13', '260301')).toBe('260301');
  });

  it('Date AIs: DD=00 (GS1 last-day-of-month sentinel) is allowed', () => {
    // Per GS1 General Specifications §3.4, DD=00 means "last day of the month"
    expect(validateAndNormalizeGs1Item('17', '251200')).toBe('251200');
    expect(validateAndNormalizeGs1Item('15', '260600')).toBe('260600');
    expect(validateAndNormalizeGs1Item('11', '250100')).toBe('250100');
  });

  // --- Alphanumeric / numeric field limits ---

  it('Alphanum limits (10/21/240/241), and 3922 numeric', () => {
    expect(validateAndNormalizeGs1Item('10', 'A'.repeat(20))).toBe('A'.repeat(20));
    expect(() => validateAndNormalizeGs1Item('10', '')).toThrow();
    expect(validateAndNormalizeGs1Item('21', 'SN-001')).toBe('SN-001');
    expect(validateAndNormalizeGs1Item('240', 'X'.repeat(30))).toBe('X'.repeat(30));
    expect(() => validateAndNormalizeGs1Item('240', 'Y'.repeat(31))).toThrow();
    expect(validateAndNormalizeGs1Item('241', 'PART-123')).toBe('PART-123');
    expect(validateAndNormalizeGs1Item('3922', '123456789012345')).toBe('123456789012345');
    expect(() => validateAndNormalizeGs1Item('3922', '12a')).toThrow();
  });

  // --- Combination validation ---

  it('AI 10 (BATCH/LOT) without AI 01 (GTIN) -> error', () => {
    expect(() => buildGs1Text([{ ai: '10', value: 'BATCH-1' }])).toThrow();
  });

  it('AI 01 + AI 02 together -> error (mutually exclusive)', () => {
    expect(() =>
      buildGs1Text([
        { ai: '01', value: '09506000134376' },
        { ai: '02', value: '09506000134376' },
      ])
    ).toThrow();
  });

  it('AI 17 invalid date in full buildGs1Text call -> error', () => {
    expect(() =>
      buildGs1Text([
        { ai: '01', value: '09506000134376' },
        { ai: '17', value: '250229' },
      ])
    ).toThrow(/not a valid YYMMDD/);
  });

  it('AI 17 with DD=00 sentinel in full buildGs1Text call -> ok', () => {
    expect(() =>
      buildGs1Text([
        { ai: '01', value: '09506000134376' },
        { ai: '17', value: '251200' },
      ])
    ).not.toThrow();
  });
});
