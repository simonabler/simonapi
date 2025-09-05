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

  it('Dates (17/15/11): YYMMDD valid/invalid', () => {
    expect(validateYYMMDD('251231')).toBe(true);
    expect(validateYYMMDD('250229')).toBe(false);
    expect(validateYYMMDD('240229')).toBe(true);
    expect(validateYYMMDD('250000')).toBe(false);
    expect(validateYYMMDD('251332')).toBe(false);
  });

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
});
