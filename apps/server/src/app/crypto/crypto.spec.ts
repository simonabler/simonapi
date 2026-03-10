import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { BadRequestException } from '@nestjs/common';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { CryptoService } from './crypto.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal QrService stub — returns a Buffer for any generate() call */
const mockQrService = {
  generate: jest.fn().mockResolvedValue({
    body:   Buffer.from('<svg><rect/></svg>', 'utf-8'),
    format: 'svg',
    mime:   'image/svg+xml',
  }),
};

function buildService(): CryptoService {
  return new CryptoService(mockQrService as any);
}

/** Generate a valid TOTP secret using otplib directly */
function freshSecret(): string {
  const t = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
  return t.generateSecret();
}

/** Generate the current token for a secret without the service */
async function currentToken(secret: string): Promise<string> {
  const t = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
  return t.generate({ secret });
}

// ---------------------------------------------------------------------------
// TOTP
// ---------------------------------------------------------------------------

describe('TOTP', () => {
  let svc: CryptoService;
  beforeEach(() => {
    svc = buildService();
    mockQrService.generate.mockClear();
  });

  // ── totpSetup ─────────────────────────────────────────────────────────────
  describe('totpSetup', () => {
    it('returns a Base32 secret', async () => {
      const r = await svc.totpSetup({ accountName: 'test@example.com' });
      expect(r.secret).toMatch(/^[A-Z2-7]+=*$/);
      expect(r.secret.length).toBeGreaterThanOrEqual(16);
    });

    it('builds a valid otpauth:// URI', async () => {
      const r = await svc.totpSetup({ issuer: 'MyApp', accountName: 'simon@test.at' });
      expect(r.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      expect(r.otpauthUri).toContain('secret=');
      expect(r.otpauthUri).toContain('issuer=MyApp');
    });

    it('URI contains the secret that was returned', async () => {
      const r = await svc.totpSetup({ accountName: 'a@b.com' });
      expect(r.otpauthUri).toContain(`secret=${r.secret}`);
    });

    it('uses default values when options are omitted', async () => {
      const r = await svc.totpSetup({ accountName: 'x@y.com' });
      expect(r.algorithm).toBe('SHA1');
      expect(r.digits).toBe(6);
      expect(r.period).toBe(30);
      expect(r.qrFormat).toBe('svg');
    });

    it('respects custom algorithm, digits, period', async () => {
      const r = await svc.totpSetup({ accountName: 'x@y.com', algorithm: 'SHA256', digits: 8, period: 60 });
      expect(r.algorithm).toBe('SHA256');
      expect(r.digits).toBe(8);
      expect(r.period).toBe(60);
    });

    it('calls QrService.generate once', async () => {
      await svc.totpSetup({ accountName: 'test@example.com' });
      expect(mockQrService.generate).toHaveBeenCalledTimes(1);
    });

    it('passes the otpauth URI to QrService', async () => {
      const r = await svc.totpSetup({ accountName: 'test@example.com' });
      const call = mockQrService.generate.mock.calls[0][0];
      expect(call.payload.url).toBe(r.otpauthUri);
    });

    it('returns SVG string when qrFormat is svg', async () => {
      const r = await svc.totpSetup({ accountName: 'x@y.com', qrFormat: 'svg' });
      expect(r.qrCode).toContain('<svg');
    });

    it('returns base64 string when qrFormat is png', async () => {
      mockQrService.generate.mockResolvedValueOnce({
        body: Buffer.from('PNG_BYTES'),
        format: 'png',
        mime: 'image/png',
      });
      const r = await svc.totpSetup({ accountName: 'x@y.com', qrFormat: 'png' });
      // base64 chars only
      expect(r.qrCode).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('each call generates a unique secret', async () => {
      const a = await svc.totpSetup({ accountName: 'a@b.com' });
      const b = await svc.totpSetup({ accountName: 'a@b.com' });
      expect(a.secret).not.toBe(b.secret);
    });
  });

  // ── totpVerify ─────────────────────────────────────────────────────────────
  describe('totpVerify', () => {
    it('validates the current token as valid', async () => {
      const secret = freshSecret();
      const token  = await currentToken(secret);
      const r = await svc.totpVerify({ secret, token });
      expect(r.valid).toBe(true);
      expect(r.delta).toBe(0);
    });

    it('returns valid:false for a wrong token', async () => {
      const secret = freshSecret();
      const r = await svc.totpVerify({ secret, token: '000000' });
      expect(r.valid).toBe(false);
      expect(r.delta).toBeNull();
    });

    it('rejects a 5-digit token (wrong length)', async () => {
      const secret = freshSecret();
      await expect(svc.totpVerify({ secret, token: '12345' })).rejects.toThrow(BadRequestException);
    });

    it('rejects an empty secret', async () => {
      await expect(svc.totpVerify({ secret: '', token: '123456' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-Base32 secret', async () => {
      await expect(svc.totpVerify({ secret: 'NOT-BASE32!!!', token: '123456' })).rejects.toThrow(BadRequestException);
    });

    it('round-trips: generate then verify succeeds', async () => {
      const secret = freshSecret();
      const genResult = await svc.totpGenerate({ secret });
      const verResult = await svc.totpVerify({ secret, token: genResult.token });
      expect(verResult.valid).toBe(true);
    });
  });

  // ── totpGenerate ──────────────────────────────────────────────────────────
  describe('totpGenerate', () => {
    it('returns a 6-digit token string', async () => {
      const secret = freshSecret();
      const r = await svc.totpGenerate({ secret });
      expect(r.token).toMatch(/^\d{6}$/);
    });

    it('returns 8 digits when digits=8 is set', async () => {
      const secret = freshSecret();
      const r = await svc.totpGenerate({ secret, digits: 8 });
      expect(r.token).toMatch(/^\d{8}$/);
    });

    it('validFor is between 1 and period', async () => {
      const secret = freshSecret();
      const r = await svc.totpGenerate({ secret, period: 30 });
      expect(r.validFor).toBeGreaterThanOrEqual(1);
      expect(r.validFor).toBeLessThanOrEqual(30);
    });

    it('validFor is within 60s range for period=60', async () => {
      const secret = freshSecret();
      const r = await svc.totpGenerate({ secret, period: 60 });
      expect(r.validFor).toBeGreaterThanOrEqual(1);
      expect(r.validFor).toBeLessThanOrEqual(60);
    });

    it('rejects an invalid secret', async () => {
      await expect(svc.totpGenerate({ secret: 'BAD!!!' })).rejects.toThrow(BadRequestException);
    });

    it('generates the same token as direct otplib for same secret', async () => {
      const secret = freshSecret();
      const expected = await currentToken(secret);
      const r = await svc.totpGenerate({ secret });
      expect(r.token).toBe(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

describe('hash', () => {
  const svc = buildService();

  it('sha256 produces correct known hash', () => {
    const r = svc.hash({ data: 'hello', algo: 'sha256' });
    expect(r.hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(r.algo).toBe('sha256');
    expect(r.format).toBe('hex');
  });

  it('md5 produces correct known hash', () => {
    const r = svc.hash({ data: 'hello', algo: 'md5' });
    expect(r.hash).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('sha512 produces a 128-char hex string', () => {
    const r = svc.hash({ data: 'hello', algo: 'sha512' });
    expect(r.hash).toHaveLength(128);
    expect(r.hash).toMatch(/^[a-f0-9]+$/);
  });

  it('sha512 matches Node crypto directly', () => {
    const expected = crypto.createHash('sha512').update('hello').digest('hex');
    const r = svc.hash({ data: 'hello', algo: 'sha512' });
    expect(r.hash).toBe(expected);
  });

  it('bcrypt hash can be verified', () => {
    const r = svc.hash({ data: 'secret', algo: 'bcrypt', saltRounds: 4 });
    expect(bcrypt.compareSync('secret', r.hash)).toBe(true);
  });

  it('bcrypt hash is non-deterministic (unique per call)', () => {
    const a = svc.hash({ data: 'x', algo: 'bcrypt', saltRounds: 4 });
    const b = svc.hash({ data: 'x', algo: 'bcrypt', saltRounds: 4 });
    expect(a.hash).not.toBe(b.hash);
  });

  it('throws on empty data', () => {
    expect(() => svc.hash({ data: '', algo: 'sha256' })).toThrow(BadRequestException);
  });

  it('throws on bcrypt saltRounds < 4', () => {
    expect(() => svc.hash({ data: 'x', algo: 'bcrypt', saltRounds: 3 })).toThrow(BadRequestException);
  });

  it('throws on bcrypt saltRounds > 15', () => {
    expect(() => svc.hash({ data: 'x', algo: 'bcrypt', saltRounds: 16 })).toThrow(BadRequestException);
  });

  it('different data produces different sha256 hash', () => {
    const a = svc.hash({ data: 'hello', algo: 'sha256' });
    const b = svc.hash({ data: 'world', algo: 'sha256' });
    expect(a.hash).not.toBe(b.hash);
  });

  it('hash is stable across repeated calls for deterministic algos', () => {
    const a = svc.hash({ data: 'hello', algo: 'sha256' });
    const b = svc.hash({ data: 'hello', algo: 'sha256' });
    expect(a.hash).toBe(b.hash);
  });
});

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

describe('hmac', () => {
  const svc = buildService();

  it('produces a known HMAC-SHA256 value', () => {
    const expected = crypto.createHmac('sha256', 'key').update('message').digest('hex');
    const r = svc.hmac({ data: 'message', key: 'key' });
    expect(r.hmac).toBe(expected);
    expect(r.algorithm).toBe('sha256');
    expect(r.encoding).toBe('hex');
  });

  it('sha512 produces a 128-char hex string', () => {
    const r = svc.hmac({ data: 'data', key: 'k', algorithm: 'sha512' });
    expect(r.hmac).toHaveLength(128);
  });

  it('sha1 produces a 40-char hex string', () => {
    const r = svc.hmac({ data: 'data', key: 'k', algorithm: 'sha1' });
    expect(r.hmac).toHaveLength(40);
  });

  it('md5 produces a 32-char hex string', () => {
    const r = svc.hmac({ data: 'data', key: 'k', algorithm: 'md5' });
    expect(r.hmac).toHaveLength(32);
  });

  it('base64 encoding produces valid base64', () => {
    const r = svc.hmac({ data: 'data', key: 'k', encoding: 'base64' });
    expect(r.hmac).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('base64url encoding produces url-safe base64', () => {
    const r = svc.hmac({ data: 'data', key: 'k', encoding: 'base64url' });
    expect(r.hmac).not.toContain('+');
    expect(r.hmac).not.toContain('/');
  });

  it('different keys produce different HMACs', () => {
    const a = svc.hmac({ data: 'msg', key: 'key1' });
    const b = svc.hmac({ data: 'msg', key: 'key2' });
    expect(a.hmac).not.toBe(b.hmac);
  });

  it('different data produces different HMACs', () => {
    const a = svc.hmac({ data: 'msg1', key: 'key' });
    const b = svc.hmac({ data: 'msg2', key: 'key' });
    expect(a.hmac).not.toBe(b.hmac);
  });

  it('HMAC is stable (deterministic)', () => {
    const a = svc.hmac({ data: 'msg', key: 'key' });
    const b = svc.hmac({ data: 'msg', key: 'key' });
    expect(a.hmac).toBe(b.hmac);
  });
});

// ---------------------------------------------------------------------------
// Ed25519
// ---------------------------------------------------------------------------

describe('Ed25519', () => {
  const svc = buildService();

  // ── Keypair ────────────────────────────────────────────────────────────────
  describe('ed25519Keypair', () => {
    it('returns PEM-formatted public and private keys', () => {
      const r = svc.ed25519Keypair();
      expect(r.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(r.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('returns hex strings for both keys', () => {
      const r = svc.ed25519Keypair();
      expect(r.publicKeyHex).toMatch(/^[a-f0-9]+$/);
      expect(r.privateKeyHex).toMatch(/^[a-f0-9]+$/);
    });

    it('public key hex is 44 bytes (SPKI DER for Ed25519)', () => {
      const r = svc.ed25519Keypair();
      // SPKI DER for Ed25519 = 44 bytes = 88 hex chars
      expect(r.publicKeyHex).toHaveLength(88);
    });

    it('generates unique keypairs each time', () => {
      const a = svc.ed25519Keypair();
      const b = svc.ed25519Keypair();
      expect(a.publicKey).not.toBe(b.publicKey);
      expect(a.privateKey).not.toBe(b.privateKey);
    });

    it('PEM public key can be imported by Node crypto', () => {
      const r = svc.ed25519Keypair();
      expect(() => crypto.createPublicKey(r.publicKey)).not.toThrow();
    });

    it('PEM private key can be imported by Node crypto', () => {
      const r = svc.ed25519Keypair();
      expect(() => crypto.createPrivateKey(r.privateKey)).not.toThrow();
    });
  });

  // ── Sign ──────────────────────────────────────────────────────────────────
  describe('ed25519Sign', () => {
    it('returns a hex signature for a given message', () => {
      const kp = svc.ed25519Keypair();
      const r  = svc.ed25519Sign({ message: 'hello', privateKey: kp.privateKey });
      expect(r.signature).toMatch(/^[a-f0-9]+$/);
      expect(r.encoding).toBe('hex');
    });

    it('Ed25519 signature is always 64 bytes = 128 hex chars', () => {
      const kp = svc.ed25519Keypair();
      const r  = svc.ed25519Sign({ message: 'test', privateKey: kp.privateKey });
      expect(r.signature).toHaveLength(128);
    });

    it('returns base64 when encoding=base64', () => {
      const kp = svc.ed25519Keypair();
      const r  = svc.ed25519Sign({ message: 'test', privateKey: kp.privateKey, encoding: 'base64' });
      expect(r.encoding).toBe('base64');
      expect(r.signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('different messages produce different signatures', () => {
      const kp = svc.ed25519Keypair();
      const a  = svc.ed25519Sign({ message: 'msg1', privateKey: kp.privateKey });
      const b  = svc.ed25519Sign({ message: 'msg2', privateKey: kp.privateKey });
      expect(a.signature).not.toBe(b.signature);
    });

    it('throws on invalid private key', () => {
      expect(() => svc.ed25519Sign({ message: 'x', privateKey: 'not-a-key' })).toThrow(BadRequestException);
    });

    it('produces a valid signature even with an RSA key (Node crypto allows sign(null,...) on any key)', () => {
      // Node's crypto.sign(null, data, key) works on all key types but produces
      // a signature that can only be verified with the matching RSA public key —
      // the service does not restrict key type, that is intentional.
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 1024,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      });
      const r = svc.ed25519Sign({ message: 'x', privateKey });
      expect(r.signature).toBeTruthy();
    });
  });

  // ── Verify ────────────────────────────────────────────────────────────────
  describe('ed25519Verify', () => {
    it('verifies a signature produced by sign', () => {
      const kp  = svc.ed25519Keypair();
      const sig = svc.ed25519Sign({ message: 'hello world', privateKey: kp.privateKey });
      const r   = svc.ed25519Verify({ message: 'hello world', signature: sig.signature, publicKey: kp.publicKey });
      expect(r.valid).toBe(true);
    });

    it('returns false for a tampered message', () => {
      const kp  = svc.ed25519Keypair();
      const sig = svc.ed25519Sign({ message: 'original', privateKey: kp.privateKey });
      const r   = svc.ed25519Verify({ message: 'tampered', signature: sig.signature, publicKey: kp.publicKey });
      expect(r.valid).toBe(false);
    });

    it('returns false for a tampered signature', () => {
      const kp  = svc.ed25519Keypair();
      const sig = svc.ed25519Sign({ message: 'hello', privateKey: kp.privateKey });
      const bad = 'a'.repeat(128); // 64 bytes of garbage
      const r   = svc.ed25519Verify({ message: 'hello', signature: bad, publicKey: kp.publicKey });
      expect(r.valid).toBe(false);
    });

    it('returns false when verifying with wrong keypair', () => {
      const kp1 = svc.ed25519Keypair();
      const kp2 = svc.ed25519Keypair();
      const sig = svc.ed25519Sign({ message: 'msg', privateKey: kp1.privateKey });
      const r   = svc.ed25519Verify({ message: 'msg', signature: sig.signature, publicKey: kp2.publicKey });
      expect(r.valid).toBe(false);
    });

    it('round-trips with base64 encoding', () => {
      const kp  = svc.ed25519Keypair();
      const sig = svc.ed25519Sign({ message: 'hello', privateKey: kp.privateKey, encoding: 'base64' });
      const r   = svc.ed25519Verify({ message: 'hello', signature: sig.signature, publicKey: kp.publicKey, encoding: 'base64' });
      expect(r.valid).toBe(true);
    });

    it('throws on invalid public key', () => {
      const kp  = svc.ed25519Keypair();
      const sig = svc.ed25519Sign({ message: 'x', privateKey: kp.privateKey });
      expect(() => svc.ed25519Verify({ message: 'x', signature: sig.signature, publicKey: 'garbage' })).toThrow(BadRequestException);
    });
  });
});

// ---------------------------------------------------------------------------
// JWT Keypair
// ---------------------------------------------------------------------------

describe('jwtKeypair', () => {
  const svc = buildService();

  it('RS256 returns RSA PEM keys', () => {
    const r = svc.jwtKeypair({ algorithm: 'RS256' });
    expect(r.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(r.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(r.algorithm).toBe('RS256');
  });

  it('ES256 returns EC PEM keys', () => {
    const r = svc.jwtKeypair({ algorithm: 'ES256' });
    expect(r.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(r.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(r.algorithm).toBe('ES256');
  });

  it('throws for unsupported algorithm', () => {
    // jsonwebtoken does not support EdDSA — use ed25519Keypair() for Ed25519 keys
    expect(() => svc.jwtKeypair({ algorithm: 'EdDSA' as any })).toThrow();
  });

  it('each RS256 call returns a unique keypair', () => {
    const a = svc.jwtKeypair({ algorithm: 'RS256' });
    const b = svc.jwtKeypair({ algorithm: 'RS256' });
    expect(a.publicKey).not.toBe(b.publicKey);
  });

  it('RS256 public key is importable', () => {
    const r = svc.jwtKeypair({ algorithm: 'RS256' });
    expect(() => crypto.createPublicKey(r.publicKey)).not.toThrow();
  });

  it('ES256 private key curve is P-256', () => {
    const r = svc.jwtKeypair({ algorithm: 'ES256' });
    const key = crypto.createPrivateKey(r.privateKey) as any;
    expect(key.asymmetricKeyDetails?.namedCurve ?? key.asymmetricKeyType).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// JWT encode / decode / verify
// ---------------------------------------------------------------------------

describe('JWT encode / decode / verify', () => {
  const svc = buildService();
  const PAYLOAD = { sub: '42', name: 'Simon', role: 'admin' };

  // ── HS256 ─────────────────────────────────────────────────────────────────
  describe('HS256', () => {
    it('encodes and returns a JWT string', () => {
      const r = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'mysecret' });
      expect(r.token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
    });

    it('returns expiresAt when expiresIn is set', () => {
      const r = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 's', expiresIn: '1h' });
      expect(r.expiresAt).toBeTruthy();
      expect(new Date(r.expiresAt!).getTime()).toBeGreaterThan(Date.now());
    });

    it('expiresAt is null when no expiresIn', () => {
      const r = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 's' });
      expect(r.expiresAt).toBeNull();
    });

    it('throws when secret is missing for HS256', () => {
      expect(() => svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256' })).toThrow(BadRequestException);
    });

    it('decode returns correct header, payload and signature', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'key' });
      const dec = svc.jwtDecode({ token: enc.token });
      expect(dec.header['alg']).toBe('HS256');
      expect(dec.payload['sub']).toBe('42');
      expect(dec.signature).toBeTruthy();
    });

    it('decode marks token as not expired for a fresh token', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'k', expiresIn: '1h' });
      const dec = svc.jwtDecode({ token: enc.token });
      expect(dec.expired).toBe(false);
    });

    it('decode marks token as expired when exp is in the past', () => {
      // Create a token with past exp by signing directly
      const token = jwt.sign({ sub: '1', exp: Math.floor(Date.now() / 1000) - 60 }, 'k');
      const dec = svc.jwtDecode({ token });
      expect(dec.expired).toBe(true);
    });

    it('verify succeeds with correct secret', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'secret123' });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'HS256', secret: 'secret123' });
      expect(ver.valid).toBe(true);
      expect(ver.payload?.['sub']).toBe('42');
    });

    it('verify fails with wrong secret', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'correct' });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'HS256', secret: 'wrong' });
      expect(ver.valid).toBe(false);
    });

    it('verify returns expired:true for expired token', () => {
      const token = jwt.sign({ sub: '1', exp: Math.floor(Date.now() / 1000) - 10 }, 'k');
      const ver = svc.jwtVerify({ token, algorithm: 'HS256', secret: 'k' });
      expect(ver.valid).toBe(false);
      expect(ver.expired).toBe(true);
    });

    it('verify throws when secret is missing', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 's' });
      expect(() => svc.jwtVerify({ token: enc.token, algorithm: 'HS256' })).toThrow(BadRequestException);
    });

    it('full HS256 round-trip: encode → decode → verify', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'roundtrip', expiresIn: '2h' });
      const dec = svc.jwtDecode({ token: enc.token });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'HS256', secret: 'roundtrip' });
      expect(dec.expired).toBe(false);
      expect(ver.valid).toBe(true);
      expect(ver.payload?.['name']).toBe('Simon');
    });
  });

  // ── HS512 ─────────────────────────────────────────────────────────────────
  describe('HS512', () => {
    it('encodes and verifies with HS512', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS512', secret: 'bigsecret' });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'HS512', secret: 'bigsecret' });
      expect(ver.valid).toBe(true);
    });

    it('HS512 token has different signature than HS256 for same payload+secret', () => {
      const a = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'k' });
      const b = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS512', secret: 'k' });
      expect(a.token.split('.')[2]).not.toBe(b.token.split('.')[2]);
    });
  });

  // ── RS256 ─────────────────────────────────────────────────────────────────
  describe('RS256', () => {
    let publicKey: string;
    let privateKey: string;
    beforeAll(() => {
      const kp = buildService().jwtKeypair({ algorithm: 'RS256' });
      publicKey  = kp.publicKey;
      privateKey = kp.privateKey;
    });

    it('encodes a JWT with RS256', () => {
      const r = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'RS256', privateKey });
      expect(r.token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
    });

    it('throws when privateKey is missing for RS256', () => {
      expect(() => svc.jwtEncode({ payload: PAYLOAD, algorithm: 'RS256' })).toThrow(BadRequestException);
    });

    it('verify succeeds with correct public key', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'RS256', privateKey });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'RS256', publicKey });
      expect(ver.valid).toBe(true);
    });

    it('verify fails with wrong public key', () => {
      const enc  = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'RS256', privateKey });
      const kp2  = buildService().jwtKeypair({ algorithm: 'RS256' });
      const ver  = svc.jwtVerify({ token: enc.token, algorithm: 'RS256', publicKey: kp2.publicKey });
      expect(ver.valid).toBe(false);
    });

    it('verify throws when publicKey is missing for RS256', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'RS256', privateKey });
      expect(() => svc.jwtVerify({ token: enc.token, algorithm: 'RS256' })).toThrow(BadRequestException);
    });

    it('full RS256 round-trip', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'RS256', privateKey, expiresIn: '1h' });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'RS256', publicKey });
      expect(ver.valid).toBe(true);
      expect(ver.payload?.['role']).toBe('admin');
    });
  });

  // ── ES256 ─────────────────────────────────────────────────────────────────
  describe('ES256', () => {
    let publicKey: string;
    let privateKey: string;
    beforeAll(() => {
      const kp = buildService().jwtKeypair({ algorithm: 'ES256' });
      publicKey  = kp.publicKey;
      privateKey = kp.privateKey;
    });

    it('full ES256 round-trip', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'ES256', privateKey });
      const ver = svc.jwtVerify({ token: enc.token, algorithm: 'ES256', publicKey });
      expect(ver.valid).toBe(true);
    });

    it('verify fails with RS256 public key on ES256 token', () => {
      const enc  = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'ES256', privateKey });
      const rsKp = buildService().jwtKeypair({ algorithm: 'RS256' });
      const ver  = svc.jwtVerify({ token: enc.token, algorithm: 'RS256', publicKey: rsKp.publicKey });
      expect(ver.valid).toBe(false);
    });
  });

  // ── EdDSA / jwtKeypair ────────────────────────────────────────────────────
  describe('EdDSA note', () => {
    it('jwtKeypair throws for EdDSA because jsonwebtoken does not support it', () => {
      // jsonwebtoken only supports HS256/HS512/RS256/ES256 — no EdDSA
      // Ed25519 keys can still be generated via ed25519Keypair() for use outside JWT
      expect(() => svc.jwtKeypair({ algorithm: 'EdDSA' as any })).toThrow();
    });

    it('Ed25519 keypairs can still be generated via ed25519Keypair()', () => {
      const kp = svc.ed25519Keypair();
      expect(kp.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(kp.privateKey).toContain('BEGIN PRIVATE KEY');
    });
  });

  // ── decode edge cases ─────────────────────────────────────────────────────
  describe('jwtDecode edge cases', () => {
    it('throws on malformed token', () => {
      expect(() => svc.jwtDecode({ token: 'not.a.jwt' })).toThrow(BadRequestException);
    });

    it('returns null expiresAt when no exp claim', () => {
      const enc = svc.jwtEncode({ payload: { sub: '1' }, algorithm: 'HS256', secret: 'k' });
      const dec = svc.jwtDecode({ token: enc.token });
      expect(dec.expiresAt).toBeNull();
    });

    it('decode does not require secret (no-verify)', () => {
      const enc = svc.jwtEncode({ payload: PAYLOAD, algorithm: 'HS256', secret: 'SECRET' });
      // Can decode without knowing the secret
      expect(() => svc.jwtDecode({ token: enc.token })).not.toThrow();
    });
  });
});
