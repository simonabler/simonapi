import { classifyGs1Error } from './gs1-error';

describe('classifyGs1Error', () => {
  it('AI_NOT_SUPPORTED', () => {
    const r = classifyGs1Error(new Error('AI 999 not supported'));
    expect(r.code).toBe('AI_NOT_SUPPORTED');
    expect(r.ai).toBe('999');
  });

  it('AI_CHECK_DIGIT_INVALID', () => {
    const r = classifyGs1Error(new Error('AI 01 check digit invalid'));
    expect(r.code).toBe('AI_CHECK_DIGIT_INVALID');
    expect(r.ai).toBe('01');
  });

  it('AI_INVALID_DATE', () => {
    const r = classifyGs1Error(new Error("AI 17: '250229' is not a valid YYMMDD date"));
    expect(r.code).toBe('AI_INVALID_DATE');
    expect(r.ai).toBe('17');
  });

  it('AI_REQUIRES_COMPANION', () => {
    const r = classifyGs1Error(new Error('AI 10 requires one of [01, 02, 03]'));
    expect(r.code).toBe('AI_REQUIRES_COMPANION');
    expect(r.ai).toBe('10');
  });

  it('AI_MUTUALLY_EXCLUSIVE', () => {
    const r = classifyGs1Error(new Error('AIs [01, 02] are mutually exclusive — only one may appear per label'));
    expect(r.code).toBe('AI_MUTUALLY_EXCLUSIVE');
  });

  it('AI_DUPLICATE', () => {
    const r = classifyGs1Error(new Error('AI 01 must appear at most once per label'));
    expect(r.code).toBe('AI_DUPLICATE');
    expect(r.ai).toBe('01');
  });

  it('AI_INVALID_VALUE for pattern mismatch', () => {
    const r = classifyGs1Error(new Error('AI 3922 value does not match required pattern'));
    expect(r.code).toBe('AI_INVALID_VALUE');
    expect(r.ai).toBe('3922');
  });

  it('RENDER_FAILED for bwip-js errors', () => {
    const r = classifyGs1Error(new Error('GS1 rendering failed'));
    expect(r.code).toBe('RENDER_FAILED');
  });

  it('falls back to AI_INVALID_VALUE for unknown messages', () => {
    const r = classifyGs1Error(new Error('something unexpected'));
    expect(r.code).toBe('AI_INVALID_VALUE');
  });

  it('handles non-Error objects gracefully', () => {
    const r = classifyGs1Error('raw string error');
    expect(r.code).toBe('AI_INVALID_VALUE');
    expect(r.message).toBe('raw string error');
  });
});
