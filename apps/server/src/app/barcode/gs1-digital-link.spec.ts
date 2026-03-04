import { toDigitalLink, fromDigitalLink } from './gs1-digital-link';

describe('GS1 Digital Link', () => {

  // --- toDigitalLink ---

  it('GTIN only → canonical URL', () => {
    const result = toDigitalLink([{ ai: '01', value: '09506000134376' }]);
    expect(result.url).toBe('https://id.gs1.org/01/09506000134376');
    expect(result.primaryAi).toBe('01');
    expect(result.qualifiers).toHaveLength(0);
  });

  it('GTIN + expiry + batch → qualifier segments appended', () => {
    const result = toDigitalLink([
      { ai: '01', value: '09506000134376' },
      { ai: '17', value: '261231' },
      { ai: '10', value: 'LOT-001' },
    ]);
    expect(result.url).toBe('https://id.gs1.org/01/09506000134376/17/261231/10/LOT-001');
    expect(result.primaryAi).toBe('01');
    expect(result.qualifiers).toHaveLength(2);
  });

  it('Custom base URL is respected', () => {
    const result = toDigitalLink(
      [{ ai: '01', value: '09506000134376' }],
      'https://resolve.example.com',
    );
    expect(result.url).toMatch(/^https:\/\/resolve\.example\.com\//);
  });

  it('SSCC is used as primary when no GTIN present', () => {
    const result = toDigitalLink([{ ai: '00', value: '123456789012345678' }]);
    expect(result.primaryAi).toBe('00');
    expect(result.url).toContain('/00/');
  });

  it('Items without any recognised primary AI → throws', () => {
    expect(() => toDigitalLink([{ ai: '10', value: 'BATCH' }])).toThrow(/primary identification AI/);
  });

  it('Empty items array → throws', () => {
    expect(() => toDigitalLink([])).toThrow();
  });

  // --- fromDigitalLink ---

  it('Full URL → AI items', () => {
    const items = fromDigitalLink('https://id.gs1.org/01/09506000134376/17/261231');
    expect(items).toEqual([
      { ai: '01', value: '09506000134376' },
      { ai: '17', value: '261231' },
    ]);
  });

  it('Bare path → AI items', () => {
    const items = fromDigitalLink('/01/09506000134376/10/LOT-001');
    expect(items).toEqual([
      { ai: '01', value: '09506000134376' },
      { ai: '10', value: 'LOT-001' },
    ]);
  });

  it('URL-encoded values are decoded', () => {
    const items = fromDigitalLink('/01/09506000134376/10/LOT%2D001');
    expect(items[1].value).toBe('LOT-001');
  });

  it('Odd number of path segments → throws', () => {
    expect(() => fromDigitalLink('/01/09506000134376/17')).toThrow(/even number of segments/);
  });

  it('Round-trip: encode then decode produces original items', () => {
    const original = [
      { ai: '01', value: '09506000134376' },
      { ai: '17', value: '261231' },
      { ai: '10', value: 'LOT-001' },
    ];
    const { url } = toDigitalLink(original);
    const decoded = fromDigitalLink(url);
    expect(decoded).toEqual(original);
  });
});
