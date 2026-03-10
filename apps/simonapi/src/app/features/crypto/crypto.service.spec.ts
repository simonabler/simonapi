import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CryptoApiService } from './crypto.service';

describe('CryptoApiService', () => {
  let service: CryptoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CryptoApiService],
    });
    service = TestBed.inject(CryptoApiService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── TOTP ───────────────────────────────────────────────────────────────────

  it('totpSetup$ POSTs to /api/crypto/totp/setup', () => {
    const req = { accountName: 'user@test.com' };
    const res = { secret: 'ABC', otpauthUri: 'otpauth://...', qrCode: '<svg/>', qrFormat: 'svg', algorithm: 'SHA1', digits: 6, period: 30 };
    service.totpSetup$(req).subscribe(r => expect(r).toEqual(res));
    const call = http.expectOne(r => r.url.endsWith('/crypto/totp/setup'));
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(req);
    call.flush(res);
  });

  it('totpVerify$ POSTs to /api/crypto/totp/verify', () => {
    const req = { secret: 'ABC', token: '123456', window: 1 };
    const res = { valid: true, delta: 0 };
    service.totpVerify$(req).subscribe(r => expect(r.valid).toBe(true));
    const call = http.expectOne(r => r.url.endsWith('/crypto/totp/verify'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  it('totpGenerate$ POSTs to /api/crypto/totp/generate', () => {
    const req = { secret: 'ABC' };
    const res = { token: '654321', validFor: 12 };
    service.totpGenerate$(req).subscribe(r => expect(r.token).toBe('654321'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/totp/generate'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  // ── Hash & HMAC ────────────────────────────────────────────────────────────

  it('hash$ POSTs to /api/crypto/hash', () => {
    const req = { data: 'hello', algo: 'sha256' as const };
    const res = { algo: 'sha256', format: 'hex', hash: 'abc123' };
    service.hash$(req).subscribe(r => expect(r.hash).toBe('abc123'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/hash'));
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(req);
    call.flush(res);
  });

  it('hmac$ POSTs to /api/crypto/hmac', () => {
    const req = { data: 'msg', key: 'key', algorithm: 'sha256', encoding: 'hex' };
    const res = { algorithm: 'sha256', encoding: 'hex', hmac: 'deadbeef' };
    service.hmac$(req).subscribe(r => expect(r.hmac).toBe('deadbeef'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/hmac'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  // ── Ed25519 ────────────────────────────────────────────────────────────────

  it('ed25519Keypair$ POSTs empty body to /api/crypto/ed25519/keypair', () => {
    const res = { publicKey: 'PUB', privateKey: 'PRIV', publicKeyHex: 'aa', privateKeyHex: 'bb' };
    service.ed25519Keypair$().subscribe(r => expect(r.publicKey).toBe('PUB'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/ed25519/keypair'));
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({});
    call.flush(res);
  });

  it('ed25519Sign$ POSTs to /api/crypto/ed25519/sign', () => {
    const req = { message: 'data', privateKey: 'PRIV' };
    const res = { signature: 'sigHex', encoding: 'hex' };
    service.ed25519Sign$(req).subscribe(r => expect(r.signature).toBe('sigHex'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/ed25519/sign'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  it('ed25519Verify$ POSTs to /api/crypto/ed25519/verify', () => {
    const req = { message: 'data', signature: 'sig', publicKey: 'PUB' };
    const res = { valid: true };
    service.ed25519Verify$(req).subscribe(r => expect(r.valid).toBe(true));
    const call = http.expectOne(r => r.url.endsWith('/crypto/ed25519/verify'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  // ── JWT ────────────────────────────────────────────────────────────────────

  it('jwtKeypair$ POSTs to /api/crypto/jwt/keypair', () => {
    const req = { algorithm: 'RS256' as const };
    const res = { algorithm: 'RS256', publicKey: 'PUB', privateKey: 'PRIV' };
    service.jwtKeypair$(req).subscribe(r => expect(r.algorithm).toBe('RS256'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/jwt/keypair'));
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(req);
    call.flush(res);
  });

  it('jwtEncode$ POSTs to /api/crypto/jwt/encode', () => {
    const req = { payload: { sub: '1' }, algorithm: 'HS256', secret: 's' };
    const res = { token: 'eyJ...', expiresAt: null };
    service.jwtEncode$(req).subscribe(r => expect(r.token).toBe('eyJ...'));
    const call = http.expectOne(r => r.url.endsWith('/crypto/jwt/encode'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  it('jwtDecode$ POSTs to /api/crypto/jwt/decode', () => {
    const req = { token: 'eyJ...' };
    const res = { header: { alg: 'HS256' }, payload: { sub: '1' }, signature: 'abc', expired: false, expiresAt: null };
    service.jwtDecode$(req).subscribe(r => expect(r.expired).toBe(false));
    const call = http.expectOne(r => r.url.endsWith('/crypto/jwt/decode'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });

  it('jwtVerify$ POSTs to /api/crypto/jwt/verify', () => {
    const req = { token: 'eyJ...', algorithm: 'HS256', secret: 's' };
    const res = { valid: true, payload: { sub: '1' }, expired: false };
    service.jwtVerify$(req).subscribe(r => expect(r.valid).toBe(true));
    const call = http.expectOne(r => r.url.endsWith('/crypto/jwt/verify'));
    expect(call.request.method).toBe('POST');
    call.flush(res);
  });
});
